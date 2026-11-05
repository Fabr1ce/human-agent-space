import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { validateDocument, formatValidationErrors } from './validation.js';

export type Scope = 'global' | 'project';

export interface WorkspaceRoots {
  globalRoot: string;
  projectRoot: string | null;
  localRoot: string;
  repositoryRoot: string | null;
}

export interface EffectiveConfig {
  value: { schema_version: 1; workspace?: { name?: string } };
  sources: Record<string, Scope | 'default'>;
}

export interface Workspace extends WorkspaceRoots {
  config: EffectiveConfig;
}

const defaultConfig: EffectiveConfig['value'] = {
  schema_version: 1,
  workspace: {},
};

export function resolveWorkspace(
  cwd = process.cwd(),
  home = homedir(),
  explicitWorkspace?: string,
): WorkspaceRoots {
  const globalRoot = path.resolve(home, '.has');
  let projectRoot: string | null = null;
  let repositoryRoot: string | null = null;

  if (explicitWorkspace) {
    const target = path.resolve(explicitWorkspace);
    if (path.basename(target) === '.has') {
      projectRoot = target;
      repositoryRoot = path.dirname(target);
    } else {
      repositoryRoot = target;
      projectRoot = path.join(target, '.has');
    }
  } else {
    let current = path.resolve(cwd);
    while (true) {
      const candidate = path.basename(current) === '.has' ? current : path.join(current, '.has');
      if (candidate !== globalRoot && existsSync(candidate) && statSync(candidate).isDirectory()) {
        projectRoot = candidate;
        repositoryRoot = path.dirname(candidate);
        break;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return {
    globalRoot,
    projectRoot,
    localRoot: path.join(projectRoot ?? globalRoot, '.local'),
    repositoryRoot,
  };
}

export async function loadWorkspace(roots: WorkspaceRoots): Promise<Workspace> {
  const globalConfig = await loadConfigAt(roots.globalRoot, 'global');
  const projectConfig = roots.projectRoot
    ? await loadConfigAt(roots.projectRoot, 'project')
    : null;
  const value: EffectiveConfig['value'] = {
    schema_version: 1,
    workspace: {
      ...globalConfig.value.workspace,
      ...projectConfig?.value.workspace,
    },
  };
  const sources: Record<string, Scope | 'default'> = {};

  if (globalConfig.sources['workspace.name']) {
    sources['workspace.name'] = 'global';
  }
  if (projectConfig?.sources['workspace.name']) {
    sources['workspace.name'] = 'project';
  }
  sources.schema_version =
    projectConfig?.sources.schema_version ??
    globalConfig.sources.schema_version ??
    'default';

  return { ...roots, config: { value, sources } };
}

export async function loadConfigAt(
  root: string,
  scope: Scope,
): Promise<{ value: EffectiveConfig['value']; sources: Record<string, Scope | 'default'> }> {
  const configPath = path.join(root, 'config.yaml');
  let source: string;
  try {
    source = await readFile(configPath, 'utf8');
  } catch (error) {
    if (isNotFound(error)) {
      return { value: defaultConfig, sources: {} };
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${configPath}: invalid YAML: ${message}`);
  }

  const validation = validateDocument('config', parsed);
  if (!validation.valid) {
    throw new Error(`${configPath}: ${formatValidationErrors(validation.errors)}`);
  }

  const value = parsed as EffectiveConfig['value'];
  return {
    value,
    sources: {
      schema_version: scope,
      ...(value.workspace?.name ? { 'workspace.name': scope } : {}),
    },
  };
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
