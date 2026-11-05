import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { atomicWriteFile, createFileIfAbsent, listFiles, readFrontmatter, writeFrontmatter } from '../src/core/files.js';
import { listRules, listSkills, validateKnowledge } from '../src/core/knowledge.js';
import { validateDocument } from '../src/core/validation.js';
import { loadWorkspace, resolveWorkspace } from '../src/core/workspace.js';

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'has-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('schema validation', () => {
  it('accepts valid configuration, rule, and skill documents and rejects invalid ones', () => {
    expect(validateDocument('config', { schema_version: 1 })).toEqual({ valid: true });
    expect(
      validateDocument('rule', {
        schema_version: 1,
        id: 'rule-test',
        description: 'Use typed APIs',
        scope: 'project',
        priority: 10,
        globs: ['src/**/*.ts'],
        author: 'human',
      }),
    ).toEqual({ valid: true });
    expect(
      validateDocument('skill', {
        schema_version: 1,
        name: 'test-skill',
        description: 'Testing',
        version: '1.0.0',
        compatibility: ['copilot'],
        tags: ['test'],
        author: 'human',
      }),
    ).toEqual({ valid: true });
    expect(validateDocument('config', { schema_version: 1, permissions: ['execute'] }).valid).toBe(false);
    expect(validateDocument('rule', { schema_version: 1 }).valid).toBe(false);
    expect(validateDocument('skill', { schema_version: 1, name: '../unsafe' }).valid).toBe(false);
  });
});

describe('workspace resolution and configuration', () => {
  it('finds a project workspace in a parent and leaves global scope separate', async () => {
    const root = await makeTemporaryDirectory();
    const project = path.join(root, 'repo');
    const nested = path.join(project, 'src', 'deep');
    await mkdir(path.join(project, '.has'), { recursive: true });
    await mkdir(nested, { recursive: true });

    expect(resolveWorkspace(nested, path.join(root, 'home'))).toMatchObject({
      projectRoot: path.join(project, '.has'),
      repositoryRoot: project,
      globalRoot: path.join(root, 'home', '.has'),
    });
    expect(resolveWorkspace(root, path.join(root, 'home'))).toMatchObject({
      projectRoot: null,
      localRoot: path.join(root, 'home', '.has', '.local'),
    });
  });

  it('honors explicit workspace roots and gives project configuration precedence', async () => {
    const root = await makeTemporaryDirectory();
    const home = path.join(root, 'home');
    const project = path.join(root, 'repo');
    await mkdir(path.join(home, '.has'), { recursive: true });
    await mkdir(path.join(project, '.has'), { recursive: true });
    await writeFile(path.join(home, '.has', 'config.yaml'), 'schema_version: 1\nworkspace:\n  name: global\n');
    await writeFile(path.join(project, '.has', 'config.yaml'), 'schema_version: 1\nworkspace:\n  name: project\n');

    const roots = resolveWorkspace(root, home, project);
    const workspace = await loadWorkspace(roots);
    expect(workspace.config.value.workspace.name).toBe('project');
    expect(workspace.config.sources['workspace.name']).toBe('project');
    expect(roots.projectRoot).toBe(path.join(project, '.has'));
  });

  it('rejects invalid YAML configuration with the file path', async () => {
    const root = await makeTemporaryDirectory();
    const globalRoot = path.join(root, '.has');
    await mkdir(globalRoot, { recursive: true });
    await writeFile(path.join(globalRoot, 'config.yaml'), 'schema_version: wrong\n');

    await expect(loadWorkspace(resolveWorkspace(root, root))).rejects.toThrow('config.yaml');
  });
});

describe('frontmatter and writes', () => {
  it('round-trips frontmatter and preserves existing files during create-if-absent', async () => {
    const root = await makeTemporaryDirectory();
    const filePath = path.join(root, 'entry.md');
    await writeFrontmatter(filePath, { id: 'one', tags: ['test'] }, 'Body text\n');
    await expect(readFrontmatter(filePath)).resolves.toEqual({
      data: { id: 'one', tags: ['test'] },
      content: 'Body text\n',
    });
    await expect(createFileIfAbsent(filePath, 'replace')).resolves.toBe(false);
    await expect(readFile(filePath, 'utf8')).resolves.toContain('Body text');
  });

  it('atomically replaces a file with new content', async () => {
    const root = await makeTemporaryDirectory();
    const filePath = path.join(root, 'state.txt');
    await writeFile(filePath, 'old');
    await atomicWriteFile(filePath, 'new');
    await expect(readFile(filePath, 'utf8')).resolves.toBe('new');
  });

  it('cleans up a failed atomic write without changing the existing destination', async () => {
    const root = await makeTemporaryDirectory();
    const destination = path.join(root, 'state');
    await mkdir(destination);
    await writeFile(path.join(destination, 'sentinel.txt'), 'original');

    await expect(atomicWriteFile(destination, 'replacement')).rejects.toBeDefined();

    await expect(readFile(path.join(destination, 'sentinel.txt'), 'utf8')).resolves.toBe('original');
    await expect(listFiles(root, '*.tmp')).resolves.toEqual([]);
  });

  it('lists files by glob recursively', async () => {
    const root = await makeTemporaryDirectory();
    await mkdir(path.join(root, 'nested'), { recursive: true });
    await writeFile(path.join(root, 'top.md'), 'top');
    await writeFile(path.join(root, 'nested', 'SKILL.md'), 'skill');
    await writeFile(path.join(root, 'nested', 'ignore.txt'), 'ignore');

    await expect(listFiles(root, '**/*.md')).resolves.toHaveLength(2);
    await expect(listFiles(root, 'SKILL.md')).resolves.toHaveLength(1);
  });
});

describe('rules and skills', () => {
  it('uses project entries to override global entries and validates every canonical file', async () => {
    const root = await makeTemporaryDirectory();
    const globalRoot = path.join(root, 'home', '.has');
    const projectRoot = path.join(root, 'repo', '.has');
    await mkdir(path.join(globalRoot, 'rules'), { recursive: true });
    await mkdir(path.join(globalRoot, 'skills', 'formatter'), { recursive: true });
    await mkdir(path.join(projectRoot, 'rules'), { recursive: true });
    await mkdir(path.join(projectRoot, 'skills', 'formatter'), { recursive: true });

    const globalRule = `---\nschema_version: 1\nid: rule-style\ndescription: Global rule\nscope: global\npriority: 1\nglobs: [\"**/*.ts\"]\nauthor: human\n---\nGlobal`;
    const projectRule = globalRule.replace('Global rule', 'Project rule').replace('scope: global', 'scope: project');
    const skill = (description: string) => `---\nschema_version: 1\nname: formatter\ndescription: ${description}\nversion: 1.0.0\ncompatibility: [copilot]\ntags: [format]\nauthor: human\n---\nInstructions`;
    await writeFile(path.join(globalRoot, 'rules', 'style.md'), globalRule);
    await writeFile(path.join(projectRoot, 'rules', 'style.md'), projectRule);
    await writeFile(path.join(globalRoot, 'skills', 'formatter', 'SKILL.md'), skill('Global formatting'));
    await writeFile(path.join(projectRoot, 'skills', 'formatter', 'SKILL.md'), skill('Project formatting'));

    const roots = { globalRoot, projectRoot, localRoot: path.join(projectRoot, '.local'), repositoryRoot: path.dirname(projectRoot) };
    await expect(listRules(roots)).resolves.toMatchObject([{ id: 'rule-style', description: 'Project rule', scope: 'project' }]);
    await expect(listSkills(roots)).resolves.toMatchObject([{ name: 'formatter', description: 'Project formatting' }]);
    await expect(validateKnowledge(roots)).resolves.toHaveLength(4);
  });

  it('reports malformed canonical files instead of hiding them', async () => {
    const root = await makeTemporaryDirectory();
    const projectRoot = path.join(root, '.has');
    await mkdir(path.join(projectRoot, 'rules'), { recursive: true });
    await writeFile(path.join(projectRoot, 'rules', 'broken.md'), 'No frontmatter');

    const reports = await validateKnowledge({
      globalRoot: path.join(root, 'global', '.has'),
      projectRoot,
      localRoot: path.join(projectRoot, '.local'),
      repositoryRoot: root,
    }, 'rule');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ valid: false, kind: 'rule' });
  });
});
