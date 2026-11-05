import { access } from 'node:fs/promises';
import path from 'node:path';
import { listFiles, readFrontmatter } from './files.js';
import type { Scope, WorkspaceRoots } from './workspace.js';
import { validateDocument, formatValidationErrors } from './validation.js';

export interface RuleEntry {
  id: string;
  description: string;
  scope: Scope;
  priority: number;
  globs: string[];
  author: string;
  path: string;
}

export interface SkillEntry {
  name: string;
  description: string;
  version: string;
  compatibility: string[];
  tags: string[];
  author: string;
  path: string;
}

export interface ValidationReport {
  kind: 'rule' | 'skill';
  path: string;
  valid: boolean;
  error?: string;
}

export async function listRules(roots: WorkspaceRoots): Promise<RuleEntry[]> {
  const entries = [
    ...(await readRules(roots.globalRoot, 'global')),
    ...(roots.projectRoot ? await readRules(roots.projectRoot, 'project') : []),
  ];
  const byId = new Map<string, RuleEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export async function listSkills(roots: WorkspaceRoots): Promise<SkillEntry[]> {
  const entries = [
    ...(await readSkills(roots.globalRoot)),
    ...(roots.projectRoot ? await readSkills(roots.projectRoot) : []),
  ];
  const byName = new Map<string, SkillEntry>();
  for (const entry of entries) {
    byName.set(entry.name, entry);
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function validateKnowledge(
  roots: WorkspaceRoots,
  kind?: 'rule' | 'skill',
): Promise<ValidationReport[]> {
  const reports = await validateAt(roots.globalRoot, 'global', kind);
  if (roots.projectRoot) {
    reports.push(...(await validateAt(roots.projectRoot, 'project', kind)));
  }
  return reports.sort((left, right) => left.path.localeCompare(right.path));
}

export async function readRules(root: string, scope: Scope): Promise<RuleEntry[]> {
  const files = await listFiles(path.join(root, 'rules'));
  const entries: RuleEntry[] = [];

  for (const filePath of files.filter((file) => file.endsWith('.md'))) {
    const { data } = await readFrontmatter(filePath);
    const validation = validateDocument('rule', data);
    if (!validation.valid) {
      throw new Error(`${filePath}: ${formatValidationErrors(validation.errors)}`);
    }
    if (data.scope !== scope) {
      throw new Error(`${filePath}: scope must be "${scope}" for this workspace`);
    }
    entries.push({
      id: data.id as string,
      description: data.description as string,
      scope,
      priority: data.priority as number,
      globs: data.globs as string[],
      author: data.author as string,
      path: filePath,
    });
  }
  return entries;
}

export async function readSkills(root: string): Promise<SkillEntry[]> {
  const files = await listFiles(path.join(root, 'skills'), 'SKILL.md');
  const entries: SkillEntry[] = [];

  for (const filePath of files) {
    const { data } = await readFrontmatter(filePath);
    const validation = validateDocument('skill', data);
    if (!validation.valid) {
      throw new Error(`${filePath}: ${formatValidationErrors(validation.errors)}`);
    }
    entries.push({
      name: data.name as string,
      description: data.description as string,
      version: data.version as string,
      compatibility: data.compatibility as string[],
      tags: data.tags as string[],
      author: data.author as string,
      path: filePath,
    });
  }
  return entries;
}

async function validateAt(root: string, scope: Scope, kind?: 'rule' | 'skill'): Promise<ValidationReport[]> {
  const reports: ValidationReport[] = [];
  const ruleFiles =
    kind === 'skill'
      ? []
      : (await listFiles(path.join(root, 'rules'))).filter((file) => file.endsWith('.md'));
  const skillFiles = kind === 'rule' ? [] : await listFiles(path.join(root, 'skills'), 'SKILL.md');

  for (const filePath of ruleFiles) {
    reports.push(await validateFile(filePath, 'rule', scope));
  }
  for (const filePath of skillFiles) {
    reports.push(await validateFile(filePath, 'skill', scope));
  }
  return reports;
}

async function validateFile(
  filePath: string,
  kind: 'rule' | 'skill',
  scope: Scope,
): Promise<ValidationReport> {
  try {
    const { data } = await readFrontmatter(filePath);
    const validation = validateDocument(kind, data);
    if (!validation.valid) {
      return {
        kind,
        path: filePath,
        valid: false,
        error: formatValidationErrors(validation.errors),
      };
    }
    if (kind === 'rule' && data.scope !== scope) {
      return {
        kind,
        path: filePath,
        valid: false,
        error: `scope must be "${scope}" for this workspace`,
      };
    }
    return { kind, path: filePath, valid: true };
  } catch (error) {
    return {
      kind,
      path: filePath,
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
