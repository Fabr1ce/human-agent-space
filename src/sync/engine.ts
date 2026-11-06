import { randomUUID, createHash } from 'node:crypto';
import { lstat, mkdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { atomicWriteFile, isDirectory } from '../core/files.js';
import { formatValidationErrors, validateDocument } from '../core/validation.js';
import type { WorkspaceRoots } from '../core/workspace.js';
import type { AdapterId, AgentAdapter, GeneratedFile } from '../adapters/types.js';

const manifestName = 'sync-manifest.json';

interface ManifestEntry {
  agent: AdapterId;
  source: string;
  output_hash: string;
}

interface SyncManifest {
  schema_version: 1;
  files: Record<string, ManifestEntry>;
}

export type SyncAction = 'create' | 'update' | 'unchanged' | 'delete' | 'conflict';

export interface SyncOperation {
  action: SyncAction;
  agent: AdapterId;
  path: string;
  source?: string;
  reason?: string;
}

export interface SyncReport {
  operations: SyncOperation[];
  drift: boolean;
  blocked: boolean;
  applied: string[];
}

export interface AdoptReport extends SyncReport {
  backup?: string;
}

interface PlannedOperation {
  report: SyncOperation;
  file?: GeneratedFile;
  expectedHash: string | null;
}

interface InternalPlan {
  roots: WorkspaceRoots;
  repositoryRoot: string;
  operations: PlannedOperation[];
  manifestHash: string | null;
  originalManifest: SyncManifest;
  nextManifest: SyncManifest;
}

const planInternals = new WeakMap<SyncPlan, InternalPlan>();

export interface SyncOptions {
  agent?: AdapterId;
  dryRun?: boolean;
  check?: boolean;
  onPlan?: (operations: SyncOperation[]) => void;
}

export interface ApplyOptions {
  dryRun?: boolean;
  onPlan?: (operations: SyncOperation[]) => void;
}

export class SyncPlan {
  readonly operations: readonly SyncOperation[];

  constructor(internal: InternalPlan) {
    this.operations = Object.freeze(internal.operations.map(({ report }) => Object.freeze({ ...report })));
    planInternals.set(this, internal);
  }
}

export async function syncWorkspace(
  roots: WorkspaceRoots,
  adapters: AgentAdapter[],
  options: SyncOptions = {},
): Promise<SyncReport> {
  const plan = new SyncPlan(await createPlan(roots, adapters, options.agent));
  if (!options.check && !options.dryRun) {
    options.onPlan?.([...plan.operations]);
  }
  if (options.check) {
    return createReport(plan);
  }
  return applyWorkspaceSyncPlan(plan, { dryRun: options.dryRun });
}

export async function adoptWorkspaceFile(
  roots: WorkspaceRoots,
  requestedPath: string,
  adapters: AgentAdapter[],
  dryRun = false,
  onlyAgent?: AdapterId,
  onPlan?: (operations: SyncOperation[]) => void,
): Promise<AdoptReport> {
  const plan = await createPlan(roots, adapters, onlyAgent);
  const repositoryRoot = requireRepositoryRoot(roots);
  const absolutePath = path.resolve(repositoryRoot, requestedPath);
  const relativePath = toRelativePath(repositoryRoot, absolutePath);
  const target = plan.operations.find((operation) => operation.report.path === relativePath);

  if (!target || target.report.action !== 'conflict' || !target.file) {
    throw new Error(
      `${requestedPath} is not a conflicting generated target. Run \`has sync --dry-run\` to inspect adoptable files.`,
    );
  }
  if (target.expectedHash === null) {
    throw new Error(`Cannot adopt ${requestedPath}: the target file does not exist.`);
  }

  const report: SyncReport = {
    operations: [target.report],
    drift: true,
    blocked: false,
    applied: [],
  };
  if (dryRun) {
    report.operations = [{ ...target.report, action: 'update', reason: 'would adopt after backup' }];
    return report;
  }

  onPlan?.(report.operations);
  const current = await readSafeTarget(repositoryRoot, relativePath);
  if (!current || hash(current) !== target.expectedHash) {
    throw new Error(`${requestedPath} changed after planning; rerun \`has adopt\`.`);
  }

  const backupPath = path.posix.join(
    '.has',
    '.local',
    'sync-backups',
    `${new Date().toISOString().replaceAll(/[^0-9T]/g, '-')}-${randomUUID()}`,
    relativePath,
  );
  await assertManifestUnchanged(plan);
  await writeSafeTarget(repositoryRoot, backupPath, current);
  const beforeReplace = await readSafeTarget(repositoryRoot, relativePath);
  if (!beforeReplace || hash(beforeReplace) !== target.expectedHash) {
    throw new Error(`${requestedPath} changed during adoption; the original snapshot was backed up, but the target was left untouched.`);
  }
  await writeSafeTarget(repositoryRoot, relativePath, target.file.content);

  const desiredHash = hash(target.file.content);
  const adoptedManifest: SyncManifest = {
    schema_version: 1,
    files: {
      ...plan.originalManifest.files,
      [relativePath]: {
        agent: target.file.agent,
        source: target.file.source,
        output_hash: desiredHash,
      },
    },
  };
  const manifestPath = manifestAbsolutePath(roots);
  await assertManifestUnchanged(plan);
  await writeManifest(repositoryRoot, manifestPath, adoptedManifest);
  report.operations = [{
    ...target.report,
    action: 'update',
    reason: 'adopted; original saved in .has/.local/sync-backups',
  }];
  report.applied = [relativePath];
  return { ...report, backup: backupPath };
}

export async function planWorkspaceSync(
  roots: WorkspaceRoots,
  adapters: AgentAdapter[],
  onlyAgent?: AdapterId,
): Promise<SyncPlan> {
  return new SyncPlan(await createPlan(roots, adapters, onlyAgent));
}

export async function applyWorkspaceSyncPlan(
  syncPlan: SyncPlan,
  options: ApplyOptions = {},
): Promise<SyncReport> {
  const plan = planInternals.get(syncPlan);
  if (!plan) {
    throw new Error('Cannot apply a sync plan that was not created by HAS.');
  }
  if (!options.dryRun) {
    options.onPlan?.([...syncPlan.operations]);
  }
  const report = createReport(syncPlan);
  if (options.dryRun || report.blocked) {
    return report;
  }
  await applyPlan(plan);
  report.applied = plan.operations
    .filter(({ report: operation }) => operation.action !== 'unchanged')
    .map(({ report: operation }) => operation.path);
  return report;
}

function createReport(plan: SyncPlan): SyncReport {
  return {
    operations: [...plan.operations],
    drift: plan.operations.some((operation) => operation.action !== 'unchanged'),
    blocked: plan.operations.some((operation) => operation.action === 'conflict'),
    applied: [],
  };
}

async function createPlan(
  roots: WorkspaceRoots,
  adapters: AgentAdapter[],
  onlyAgent?: AdapterId,
): Promise<InternalPlan> {
  const repositoryRoot = requireRepositoryRoot(roots);
  if (!roots.projectRoot || !(await isDirectory(roots.projectRoot))) {
    throw new Error('Project workspace not found. Run `has init` in the project first.');
  }
  const manifestPath = manifestAbsolutePath(roots);
  const manifestRelative = toRelativePath(repositoryRoot, manifestPath);
  await assertSafePath(repositoryRoot, manifestRelative);
  const loadedManifest = await readManifest(manifestPath);
  const manifest = loadedManifest.manifest;
  const selectedAdapters = adapters.filter((adapter) => !onlyAgent || adapter.id === onlyAgent);
  const generated = (await Promise.all(selectedAdapters.map((adapter) => adapter.project(roots)))).flat();
  const desired = new Map<string, GeneratedFile>();

  for (const file of generated) {
    const relativePath = normalizeRelativePath(file.path);
    if (desired.has(relativePath)) {
      throw new Error(`Multiple adapters plan to write ${relativePath}`);
    }
    desired.set(relativePath, file);
  }

  const files: PlannedOperation[] = [];
  const nextFiles: Record<string, ManifestEntry> = {};
  for (const [relativePath, entry] of Object.entries(manifest.files)) {
    if (onlyAgent && entry.agent !== onlyAgent) {
      nextFiles[relativePath] = entry;
    }
  }

  for (const [relativePath, file] of desired) {
    await assertSafePath(repositoryRoot, relativePath);
    const current = await readSafeTarget(repositoryRoot, relativePath);
    const currentHash = current ? hash(current) : null;
    const previous = manifest.files[relativePath];
    const desiredHash = hash(file.content);
    let action: SyncAction;
    let reason: string | undefined;

    if (currentHash === null) {
      action = 'create';
    } else if (previous?.agent === file.agent && currentHash === desiredHash) {
      action = 'unchanged';
    } else if (previous && previous.agent === file.agent && currentHash === previous.output_hash) {
      action = 'update';
    } else {
      action = 'conflict';
      reason = previous
        ? 'target was edited after HAS generated it; adopt explicitly to replace it'
        : 'target already exists and is not owned by HAS; adopt explicitly to replace it';
    }

    files.push({
      report: { action, agent: file.agent, path: relativePath, source: file.source, ...(reason ? { reason } : {}) },
      file,
      expectedHash: currentHash,
    });
    if (action !== 'conflict') {
      nextFiles[relativePath] = {
        agent: file.agent,
        source: file.source,
        output_hash: desiredHash,
      };
    } else if (previous) {
      nextFiles[relativePath] = previous;
    }
  }

  for (const [relativePath, previous] of Object.entries(manifest.files)) {
    if ((onlyAgent && previous.agent !== onlyAgent) || desired.has(relativePath)) {
      continue;
    }
    await assertSafePath(repositoryRoot, relativePath);
    const current = await readSafeTarget(repositoryRoot, relativePath);
    if (!current) {
      continue;
    }
    const currentHash = hash(current);
    const action = currentHash === previous.output_hash ? 'delete' : 'conflict';
    files.push({
      report: {
        action,
        agent: previous.agent,
        path: relativePath,
        source: previous.source,
        ...(action === 'conflict' ? { reason: 'stale generated target was edited; preserving it' } : {}),
      },
      expectedHash: currentHash,
    });
    if (action === 'conflict') {
      nextFiles[relativePath] = previous;
    }
  }

  files.sort((left, right) => left.report.path.localeCompare(right.report.path));
  return {
    roots,
    repositoryRoot,
    operations: files,
    manifestHash: loadedManifest.hash,
    originalManifest: manifest,
    nextManifest: { schema_version: 1, files: nextFiles },
  };
}

async function applyPlan(plan: InternalPlan): Promise<void> {
  if (plan.operations.some(({ report }) => report.action === 'conflict')) {
    throw new Error('Cannot apply a sync plan with conflicts.');
  }
  await assertManifestUnchanged(plan);

  for (const operation of plan.operations) {
    const { report } = operation;
    if (report.action === 'unchanged') {
      continue;
    }
    const current = await readSafeTarget(plan.repositoryRoot, report.path);
    if ((current ? hash(current) : null) !== operation.expectedHash) {
      throw new Error(`${report.path} changed after planning; rerun \`has sync\`.`);
    }
  }

  for (const operation of plan.operations) {
    const { report } = operation;
    if (report.action === 'create' || report.action === 'update' || report.action === 'delete') {
      const current = await readSafeTarget(plan.repositoryRoot, report.path);
      if ((current ? hash(current) : null) !== operation.expectedHash) {
        throw new Error(`${report.path} changed during sync; rerun \`has sync\`.`);
      }
    }
    if (report.action === 'create' || report.action === 'update') {
      if (!operation.file) {
        throw new Error(`Missing generated content for ${report.path}`);
      }
      await writeSafeTarget(plan.repositoryRoot, report.path, operation.file.content);
    } else if (report.action === 'delete') {
      await unlink(path.join(plan.repositoryRoot, ...report.path.split('/')));
    }
  }

  const manifestPath = manifestAbsolutePath(plan.roots);
  if (Object.keys(plan.nextManifest.files).length || (await pathExists(manifestPath))) {
    await assertManifestUnchanged(plan);
    await writeManifest(plan.repositoryRoot, manifestPath, plan.nextManifest);
  }
}

async function readManifest(
  filePath: string,
): Promise<{ manifest: SyncManifest; hash: string | null }> {
  let contents: string;
  try {
    contents = await readFile(filePath, 'utf8');
  } catch (error) {
    if (isNotFound(error)) {
      return { manifest: { schema_version: 1, files: {} }, hash: null };
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`${filePath}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const result = validateDocument('syncManifest', parsed);
  if (!result.valid) {
    throw new Error(`${filePath}: invalid sync manifest: ${formatValidationErrors(result.errors)}`);
  }
  return { manifest: parsed as SyncManifest, hash: hash(Buffer.from(contents, 'utf8')) };
}

async function assertManifestUnchanged(plan: InternalPlan): Promise<void> {
  const relativePath = toRelativePath(plan.repositoryRoot, manifestAbsolutePath(plan.roots));
  const current = await readSafeTarget(plan.repositoryRoot, relativePath);
  if ((current ? hash(current) : null) !== plan.manifestHash) {
    throw new Error('The HAS sync manifest changed during this operation; rerun `has sync`.');
  }
}

async function writeManifest(
  repositoryRoot: string,
  filePath: string,
  manifest: SyncManifest,
): Promise<void> {
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const validation = validateDocument('syncManifest', manifest);
  if (!validation.valid) {
    throw new Error(`Refusing to write invalid sync manifest: ${formatValidationErrors(validation.errors)}`);
  }
  await writeSafeTarget(repositoryRoot, toRelativePath(repositoryRoot, filePath), serialized);
}

async function writeSafeTarget(
  repositoryRoot: string,
  relativePath: string,
  content: string | Uint8Array,
): Promise<void> {
  const segments = normalizeRelativePath(relativePath).split('/');
  let directory = repositoryRoot;
  for (const segment of segments.slice(0, -1)) {
    directory = path.join(directory, segment);
    try {
      const current = await lstat(directory);
      if (current.isSymbolicLink() || !current.isDirectory()) {
        throw new Error(`Refusing to write through a non-directory or symbolic link: ${directory}`);
      }
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      try {
        await mkdir(directory);
      } catch (mkdirError) {
        if (!isAlreadyExists(mkdirError)) {
          throw mkdirError;
        }
      }
      const created = await lstat(directory);
      if (created.isSymbolicLink() || !created.isDirectory()) {
        throw new Error(`Refusing to write through a non-directory or symbolic link: ${directory}`);
      }
    }
  }

  await assertSafePath(repositoryRoot, relativePath);
  await atomicWriteFile(path.join(repositoryRoot, ...segments), content);
}

async function readSafeTarget(repositoryRoot: string, relativePath: string): Promise<Buffer | null> {
  await assertSafePath(repositoryRoot, relativePath);
  try {
    return await readFile(path.join(repositoryRoot, ...normalizeRelativePath(relativePath).split('/')));
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }
    throw error;
  }
}

async function assertSafePath(repositoryRoot: string, relativePath: string): Promise<void> {
  const normalized = normalizeRelativePath(relativePath);
  const absolute = path.resolve(repositoryRoot, ...normalized.split('/'));
  const relative = path.relative(repositoryRoot, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Refusing to access a path outside the project: ${relativePath}`);
  }

  let current = repositoryRoot;
  for (const [index, segment] of normalized.split('/').entries()) {
    current = path.join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        throw new Error(`Refusing to access a symbolic link during sync: ${current}`);
      }
      const isLast = index === normalized.split('/').length - 1;
      if (!isLast && !info.isDirectory()) {
        throw new Error(`Refusing to access a path through a non-directory: ${current}`);
      }
      if (isLast && !info.isFile()) {
        throw new Error(`Refusing to access a non-file sync target: ${current}`);
      }
      if (isLast && info.nlink > 1) {
        throw new Error(`Refusing to modify a hard-linked sync target: ${current}`);
      }
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
      return;
    }
  }
}

function manifestAbsolutePath(roots: WorkspaceRoots): string {
  const projectRoot = roots.projectRoot;
  if (!projectRoot || !roots.repositoryRoot) {
    throw new Error('Sync requires a project workspace. Run `has init` in the project first.');
  }
  return path.join(projectRoot, '.local', manifestName);
}

function requireRepositoryRoot(roots: WorkspaceRoots): string {
  if (!roots.projectRoot || !roots.repositoryRoot) {
    throw new Error('Sync requires a project workspace. Run `has init` in the project first.');
  }
  return roots.repositoryRoot;
}

function normalizeRelativePath(value: string): string {
  const normalized = value.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`Invalid project-relative path: ${value}`);
  }
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Invalid project-relative path: ${value}`);
  }
  return segments.join('/');
}

function toRelativePath(repositoryRoot: string, absolutePath: string): string {
  const relative = path.relative(repositoryRoot, absolutePath);
  return normalizeRelativePath(relative.split(path.sep).join('/'));
}

function hash(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}
