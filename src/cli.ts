import { Command } from 'commander';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { createFileIfAbsent, isDirectory } from './core/files.js';
import { fileExists, listRules, listSkills, validateKnowledge } from './core/knowledge.js';
import { loadConfigAt, loadWorkspace, resolveWorkspace, type Scope } from './core/workspace.js';
import { adoptWorkspaceFile, syncWorkspace } from './sync/engine.js';
import type { AdapterId } from './adapters/types.js';
import { listAdapters } from './adapters/registry.js';

const workspaceDirectories = [
  'rules',
  'skills',
  '.local/cache',
  '.local/logs',
  '.local/sessions',
  '.local/usage',
];

const configTemplate = yaml.dump({ schema_version: 1 });
const agentsTemplate = `# Project instructions

Add concise, human-authored project guidance that agents cannot infer from the
repository itself. Include non-standard tooling, boundaries, and gotchas.
`;

export function createProgram(): Command {
  const program = new Command();
  program
    .name('has')
    .description('A local-first workspace for humans and coding agents')
    .version('0.1.1');

  program
    .command('init')
    .description('Initialize a global or project workspace without overwriting files')
    .option('--global', 'initialize ~/.has instead of a project workspace')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--dry-run', 'show planned changes without writing')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: InitOptions) => initWorkspace(options));

  program
    .command('status')
    .description('Show resolved workspace roots and state')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: WorkspaceOptions) => showStatus(options));

  program
    .command('doctor')
    .description('Diagnose workspace health and configuration')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: WorkspaceOptions) => runDoctor(options));

  const rules = program.command('rules').description('Inspect canonical rules');
  rules
    .command('list')
    .description('List effective global and project rules')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: WorkspaceOptions) => {
      const workspace = await getWorkspace(options.workspace);
      const entries = await listRules(workspace);
      printResult(
        entries.map(({ id, description, scope, priority, globs }) => ({
          id,
          description,
          scope,
          priority,
          globs,
        })),
        options.json,
        (value) => value.map((entry) => `${entry.id} [${entry.scope}] ${entry.description}`).join('\n') || 'No rules found.',
      );
    });
  rules
    .command('show <id>')
    .description('Show one effective rule')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (id: string, options: WorkspaceOptions) => {
      const workspace = await getWorkspace(options.workspace);
      const entry = (await listRules(workspace)).find((candidate) => candidate.id === id);
      if (!entry) {
        throw new Error(`Rule "${id}" was not found`);
      }
      const document = await readFile(entry.path, 'utf8');
      printResult({ ...entry, document }, options.json, () => document);
    });
  rules
    .command('validate')
    .description('Validate all global and project rules')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: WorkspaceOptions) => {
      const workspace = resolveWorkspace(process.cwd(), undefined, options.workspace);
      const reports = await validateKnowledge(workspace, 'rule');
      const invalid = reports.filter((report) => !report.valid);
      printResult(reports, options.json, () =>
        reports.length
          ? reports.map((report) => `${report.valid ? 'PASS' : 'FAIL'} ${report.path}${report.error ? `: ${report.error}` : ''}`).join('\n')
          : 'No rules found.',
      );
      if (invalid.length) {
        process.exitCode = 1;
      }
    });

  const skills = program.command('skills').description('Inspect canonical skills');
  skills
    .command('list')
    .description('List effective global and project skills')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: WorkspaceOptions) => {
      const workspace = await getWorkspace(options.workspace);
      const entries = await listSkills(workspace);
      printResult(
        entries.map(({ name, description, version, compatibility, tags }) => ({
          name,
          description,
          version,
          compatibility,
          tags,
        })),
        options.json,
        (value) => value.map((entry) => `${entry.name} ${entry.version}: ${entry.description}`).join('\n') || 'No skills found.',
      );
    });
  skills
    .command('show <name>')
    .description('Show one effective skill')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (name: string, options: WorkspaceOptions) => {
      const workspace = await getWorkspace(options.workspace);
      const entry = (await listSkills(workspace)).find((candidate) => candidate.name === name);
      if (!entry) {
        throw new Error(`Skill "${name}" was not found`);
      }
      const document = await readFile(entry.path, 'utf8');
      printResult({ ...entry, document }, options.json, () => document);
    });
  skills
    .command('validate')
    .description('Validate all global and project skills')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: WorkspaceOptions) => {
      const workspace = resolveWorkspace(process.cwd(), undefined, options.workspace);
      const skillReports = await validateKnowledge(workspace, 'skill');
      const invalid = skillReports.filter((report) => !report.valid);
      printResult(skillReports, options.json, () =>
        skillReports.length
          ? skillReports.map((report) => `${report.valid ? 'PASS' : 'FAIL'} ${report.path}${report.error ? `: ${report.error}` : ''}`).join('\n')
          : 'No skills found.',
      );
      if (invalid.some((report) => report.kind === 'skill')) {
        process.exitCode = 1;
      }
    });

  program
    .command('sync')
    .description('Project canonical rules and skills to supported coding agents')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--agent <id>', 'target one agent: copilot, claude-code, or kiro')
    .option('--dry-run', 'show planned changes without writing')
    .option('--check', 'check for drift without writing; exits non-zero when changes are needed')
    .option('--json', 'output machine-readable JSON')
    .action(async (options: SyncOptions) => {
      if (options.check && options.dryRun) {
        throw new Error('Use either --check or --dry-run, not both');
      }
      const agent = parseAdapterId(options.agent);
      const roots = resolveWorkspace(process.cwd(), undefined, options.workspace);
      const report = await syncWorkspace(roots, listAdapters(), {
        agent,
        dryRun: options.dryRun,
        check: options.check,
        onPlan: options.json ? undefined : (operations) => printSyncPlan(operations),
      });
      printResult(report, options.json, formatSyncReport);
      if ((options.check && report.drift) || report.blocked) {
        process.exitCode = 1;
      }
    });

  program
    .command('adopt <generated-file>')
    .description('Explicitly replace a conflicting agent file after backing it up locally')
    .option('--workspace <path>', 'project root or explicit .has workspace path')
    .option('--dry-run', 'show the adoption plan without writing')
    .option('--json', 'output machine-readable JSON')
    .action(async (generatedFile: string, options: AdoptOptions) => {
      const roots = resolveWorkspace(process.cwd(), undefined, options.workspace);
      const report = await adoptWorkspaceFile(
        roots,
        generatedFile,
        listAdapters(),
        options.dryRun,
        undefined,
        options.json ? undefined : (operations) => printSyncPlan(operations),
      );
      printResult(report, options.json, formatSyncReport);
      if (report.blocked) {
        process.exitCode = 1;
      }
    });

  return program;
}

interface InitOptions {
  global?: boolean;
  workspace?: string;
  dryRun?: boolean;
  json?: boolean;
}

interface WorkspaceOptions {
  workspace?: string;
  json?: boolean;
}

interface SyncOptions extends WorkspaceOptions {
  agent?: string;
  dryRun?: boolean;
  check?: boolean;
}

interface AdoptOptions extends WorkspaceOptions {
  dryRun?: boolean;
}

interface DoctorCheck {
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
}

async function initWorkspace(options: InitOptions): Promise<void> {
  if (options.global && options.workspace) {
    throw new Error('--workspace cannot be combined with --global');
  }
  let workspaceRoot: string;
  let repositoryRoot: string | undefined;
  if (options.global) {
    workspaceRoot = resolveWorkspace().globalRoot;
  } else {
    const targetRoot = path.resolve(options.workspace ?? process.cwd());
    if (path.basename(targetRoot) === '.has') {
      workspaceRoot = targetRoot;
      repositoryRoot = path.dirname(targetRoot);
    } else {
      repositoryRoot = targetRoot;
      workspaceRoot = path.join(targetRoot, '.has');
    }
  }
  const directories = workspaceDirectories.map((directory) => path.join(workspaceRoot, directory));
  const files = [
    { path: path.join(workspaceRoot, 'config.yaml'), content: configTemplate },
    ...(!options.global
      ? [{ path: path.join(workspaceRoot, 'AGENTS.md'), content: agentsTemplate }]
      : []),
  ];
  const actions: string[] = [];

  for (const directory of directories) {
    const exists = await isDirectory(directory);
    actions.push(`${exists ? 'keep' : 'create'} directory ${directory}`);
    if (!options.dryRun && !exists) {
      await mkdir(directory, { recursive: true });
    }
  }
  for (const file of files) {
    const exists = await fileExists(file.path);
    actions.push(`${exists ? 'keep' : 'create'} file ${file.path}`);
    if (!options.dryRun && !exists) {
      await createFileIfAbsent(file.path, file.content);
    }
  }

  if (repositoryRoot) {
    const gitignorePath = path.join(repositoryRoot, '.gitignore');
    const ignoreRule = '.has/.local/';
    let existing = '';
    try {
      existing = await readFile(gitignorePath, 'utf8');
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
    const hasRule = existing.split(/\r?\n/).some((line) => line.trim() === ignoreRule);
    actions.push(`${hasRule ? 'keep' : 'append'} ${ignoreRule} in ${gitignorePath}`);
    if (!options.dryRun && !hasRule) {
      const prefix = existing.length && !existing.endsWith('\n') ? '\n' : '';
      await appendFile(gitignorePath, `${prefix}${ignoreRule}\n`, { flag: 'a' });
    }
  }

  printResult(
    { scope: options.global ? 'global' : 'project', workspaceRoot, dryRun: Boolean(options.dryRun), actions },
    options.json,
    () => `${options.dryRun ? 'Dry run' : 'Initialized'} ${options.global ? 'global' : 'project'} workspace at ${workspaceRoot}\n${actions.join('\n')}`,
  );
}

async function showStatus(options: WorkspaceOptions): Promise<void> {
  const roots = resolveWorkspace(process.cwd(), undefined, options.workspace);
  const workspace = await loadWorkspace(roots);
  const directories: Record<Scope, Record<string, boolean> | null> = {
    global: await collectDirectories(roots.globalRoot),
    project: roots.projectRoot ? await collectDirectories(roots.projectRoot) : null,
  };
  const result = {
    globalRoot: roots.globalRoot,
    globalExists: await isDirectory(roots.globalRoot),
    projectRoot: roots.projectRoot,
    projectExists: roots.projectRoot ? await isDirectory(roots.projectRoot) : false,
    localRoot: roots.localRoot,
    config: workspace.config.value,
    configSources: workspace.config.sources,
    schemaVersions: { config: workspace.config.value.schema_version, rule: 1, skill: 1 },
    directories,
  };
  printResult(result, options.json, () =>
    [
      `Global: ${result.globalRoot} (${result.globalExists ? 'present' : 'not initialized'})`,
      `Project: ${result.projectRoot ?? 'not detected'}`,
      `Local data: ${result.localRoot}`,
      `Config: ${JSON.stringify(result.config)} (sources: ${JSON.stringify(result.configSources)})`,
      ...Object.entries(directories).flatMap(([scope, entries]) =>
        entries
          ? [`${scope} directories: ${Object.entries(entries).map(([name, present]) => `${name}=${present ? 'present' : 'missing'}`).join(', ')}`]
          : [],
      ),
    ].join('\n'),
  );
}

async function runDoctor(options: WorkspaceOptions): Promise<void> {
  const roots = resolveWorkspace(process.cwd(), undefined, options.workspace);
  const checks: DoctorCheck[] = [];
  checks.push({
    name: 'project workspace',
    status: roots.projectRoot ? ((await isDirectory(roots.projectRoot)) ? 'PASS' : 'FAIL') : 'WARN',
    detail: roots.projectRoot ?? 'No project .has/ found; global-only mode',
  });
  checks.push({
    name: 'global workspace',
    status: (await isDirectory(roots.globalRoot)) ? 'PASS' : 'WARN',
    detail: roots.globalRoot,
  });

  const scopedRoots: Array<[Scope, string]> = [['global', roots.globalRoot]];
  if (roots.projectRoot) {
    scopedRoots.push(['project', roots.projectRoot]);
  }
  for (const [scope, root] of scopedRoots) {
    try {
      await loadConfigAt(root, scope);
      checks.push({ name: `${scope} config`, status: 'PASS', detail: 'Valid or not configured (safe defaults apply)' });
    } catch (error) {
      checks.push({
        name: `${scope} config`,
        status: 'FAIL',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const [scope, root] of scopedRoots) {
    for (const directory of workspaceDirectories) {
      const exists = await isDirectory(path.join(root, directory));
      checks.push({
        name: `${scope} ${directory} directory`,
        status: exists ? 'PASS' : 'WARN',
        detail: exists ? 'present' : `missing; run \`has init${scope === 'global' ? ' --global' : ''}\``,
      });
    }
  }

  if (roots.repositoryRoot) {
    const gitignore = path.join(roots.repositoryRoot, '.gitignore');
    let contents = '';
    try {
      contents = await readFile(gitignore, 'utf8');
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
    const ignored = contents.split(/\r?\n/).some((line) => line.trim() === '.has/.local/');
    checks.push({
      name: '.local gitignore',
      status: ignored ? 'PASS' : 'FAIL',
      detail: ignored ? '.has/.local/ is ignored' : 'Add .has/.local/ to .gitignore with `has init`',
    });
  }
  checks.push({
    name: 'agent trust',
    status: 'WARN',
    detail: 'Trust state is runtime-specific and cannot be inspected by HAS; verify it in each agent.',
  });

  const failed = checks.some((check) => check.status === 'FAIL');
  const warned = checks.some((check) => check.status === 'WARN');
  printResult(
    { status: failed ? 'FAIL' : warned ? 'WARN' : 'PASS', checks },
    options.json,
    () => checks.map((check) => `${check.status} ${check.name}: ${check.detail}`).join('\n'),
  );
  if (failed) {
    process.exitCode = 1;
  }
}

async function getWorkspace(explicitWorkspace?: string) {
  return loadWorkspace(resolveWorkspace(process.cwd(), undefined, explicitWorkspace));
}

async function collectDirectories(root: string): Promise<Record<string, boolean>> {
  const directories: Record<string, boolean> = {};
  for (const directory of workspaceDirectories) {
    directories[directory] = await isDirectory(path.join(root, directory));
  }
  return directories;
}

function printResult<T>(value: T, json: boolean | undefined, text: (value: T) => string): void {
  console.log(json ? JSON.stringify(value, null, 2) : text(value));
}

function parseAdapterId(value: string | undefined): AdapterId | undefined {
  if (value === undefined) {
    return undefined;
  }
  const adapter = listAdapters().find((candidate) => candidate.id === value);
  if (adapter) {
    return adapter.id;
  }
  throw new Error(`Unknown agent "${value}". Supported agents: ${listAdapters().map(({ id }) => id).join(', ')}`);
}

function printSyncPlan(operations: Array<{ action: string; path: string; source?: string; reason?: string }>): void {
  console.log('Sync plan:');
  if (!operations.length) {
    console.log('  no files to sync');
    return;
  }
  for (const operation of operations) {
    const source = operation.source ? ` <- ${operation.source}` : '';
    const reason = operation.reason ? ` (${operation.reason})` : '';
    console.log(`  ${operation.action.toUpperCase()} ${operation.path}${source}${reason}`);
  }
}

function formatSyncReport(report: {
  operations: Array<{ action: string; path: string; reason?: string }>;
  drift: boolean;
  blocked: boolean;
  applied: string[];
  backup?: string;
}): string {
  const summary = report.blocked
    ? 'Sync blocked by conflicts; no files were changed.'
    : report.applied.length
      ? `Applied ${report.applied.length} file operation(s).`
      : report.drift
        ? 'Changes are required.'
        : 'Workspace is up to date.';
  return [
    summary,
    ...report.operations.map((operation) =>
      `${operation.action.toUpperCase()} ${operation.path}${operation.reason ? `: ${operation.reason}` : ''}`,
    ),
    ...(report.backup ? [`Backup: ${report.backup}`] : []),
  ].join('\n');
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
