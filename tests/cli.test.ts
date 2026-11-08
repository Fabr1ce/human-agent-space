import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProgram } from '../src/cli.js';

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'has-cli-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  process.exitCode = 0;
  vi.restoreAllMocks();
});

async function run(args: string[]): Promise<void> {
  const program = createProgram();
  program.exitOverride();
  await program.parseAsync(['node', 'has', ...args]);
}

async function writeRule(root: string, id = 'rule-cli'): Promise<void> {
  const directory = path.join(root, '.has', 'rules');
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${id}.md`),
    `---\nschema_version: 1\nid: ${id}\ndescription: CLI test rule\nscope: project\npriority: 1\nglobs: [\"src/**/*.ts\"]\nauthor: human\n---\nKeep the CLI safe.\n`,
  );
}

async function writeSkill(root: string, name = 'cli-skill'): Promise<void> {
  const directory = path.join(root, '.has', 'skills', name);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, 'SKILL.md'),
    `---\nschema_version: 1\nname: ${name}\ndescription: CLI test skill\nversion: 1.0.0\ncompatibility: [copilot, claude-code]\ntags: [testing]\nauthor: human\n---\nUse this test skill.\n`,
  );
}

describe('CLI', () => {
  it('initializes a project idempotently and adds a local-data ignore rule', async () => {
    const root = await makeTemporaryDirectory();
    await run(['init', '--workspace', root]);
    const configPath = path.join(root, '.has', 'config.yaml');
    const firstConfig = await readFile(configPath, 'utf8');
    await run(['init', '--workspace', root]);

    expect(await readFile(configPath, 'utf8')).toBe(firstConfig);
    expect(await readFile(path.join(root, '.gitignore'), 'utf8')).toBe('.has/.local/\n');
    expect(await readFile(path.join(root, '.has', 'AGENTS.md'), 'utf8')).toContain('human-authored');
  });

  it('does not write during init dry-run and emits valid JSON', async () => {
    const root = await makeTemporaryDirectory();
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await run(['init', '--workspace', root, '--dry-run', '--json']);

    expect(output).toHaveBeenCalledOnce();
    expect(() => JSON.parse(output.mock.calls[0]?.[0] as string)).not.toThrow();
    await expect(readFile(path.join(root, '.has', 'config.yaml'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(readFile(path.join(root, '.gitignore'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('preserves existing starter files and appends to an existing gitignore', async () => {
    const root = await makeTemporaryDirectory();
    const hasRoot = path.join(root, '.has');
    await mkdir(hasRoot, { recursive: true });
    await writeFile(path.join(hasRoot, 'config.yaml'), 'schema_version: 1\nworkspace:\n  name: keep-me\n');
    await writeFile(path.join(hasRoot, 'AGENTS.md'), 'Human-authored instructions\n');
    await writeFile(path.join(root, '.gitignore'), 'node_modules/\n');

    await run(['init', '--workspace', root]);

    expect(await readFile(path.join(hasRoot, 'config.yaml'), 'utf8')).toContain('keep-me');
    await expect(readFile(path.join(hasRoot, 'AGENTS.md'), 'utf8')).resolves.toBe('Human-authored instructions\n');
    await expect(readFile(path.join(root, '.gitignore'), 'utf8')).resolves.toBe('node_modules/\n.has/.local/\n');
  });

  it('prints valid JSON status in global-only mode', async () => {
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const root = await makeTemporaryDirectory();
    await run(['status', '--workspace', root, '--json']);
    const result = JSON.parse(output.mock.calls[0]?.[0] as string) as { projectRoot: string | null };
    expect(result.projectRoot).toBe(path.join(root, '.has'));
  });

  it('reports agent trust as unknown and keeps doctor JSON valid', async () => {
    const root = await makeTemporaryDirectory();
    await run(['init', '--workspace', root]);
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await run(['doctor', '--workspace', root, '--json']);
    const report = JSON.parse(output.mock.calls[0]?.[0] as string) as {
      status: string;
      checks: Array<{ name: string; status: string }>;
    };

    expect(report.status).toBe('WARN');
    expect(report.checks.find((check) => check.name === 'agent trust')?.status).toBe('WARN');
  });

  it('lists, shows, and validates rules and skills as JSON', async () => {
    const root = await makeTemporaryDirectory();
    await writeRule(root);
    await writeSkill(root);
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await run(['rules', 'list', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string)).toEqual([
      expect.objectContaining({ id: 'rule-cli', description: 'CLI test rule' }),
    ]);
    await run(['rules', 'show', 'rule-cli', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).document).toContain('Keep the CLI safe.');
    await run(['rules', 'validate', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string)[0].valid).toBe(true);

    await run(['skills', 'list', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string)).toEqual([
      expect.objectContaining({ name: 'cli-skill', description: 'CLI test skill' }),
    ]);
    await run(['skills', 'show', 'cli-skill', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).document).toContain('Use this test skill.');
    await run(['skills', 'validate', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string)[0].valid).toBe(true);
  });

  it('handles empty knowledge listings, missing items, and invalid knowledge', async () => {
    const root = await makeTemporaryDirectory();
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await run(['rules', 'list', '--workspace', root]);
    expect(output.mock.calls.at(-1)?.[0]).toBe('No rules found.');
    await run(['skills', 'list', '--workspace', root]);
    expect(output.mock.calls.at(-1)?.[0]).toBe('No skills found.');
    await expect(run(['rules', 'show', 'missing', '--workspace', root])).rejects.toThrow('Rule "missing" was not found');
    await expect(run(['skills', 'show', 'missing', '--workspace', root])).rejects.toThrow('Skill "missing" was not found');

    await writeRule(root);
    await writeFile(path.join(root, '.has', 'rules', 'rule-invalid.md'), 'not valid frontmatter');
    await run(['rules', 'validate', '--workspace', root, '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).some((entry: { valid: boolean }) => !entry.valid)).toBe(true);
    expect(process.exitCode).toBe(1);
  });

  it('reports invalid project configuration and missing ignore setup in doctor output', async () => {
    const root = await makeTemporaryDirectory();
    await mkdir(path.join(root, '.has'), { recursive: true });
    await writeFile(path.join(root, '.has', 'config.yaml'), 'schema_version: invalid\n');
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await run(['doctor', '--workspace', root, '--json']);

    const report = JSON.parse(output.mock.calls.at(-1)?.[0] as string) as {
      status: string;
      checks: Array<{ name: string; status: string }>;
    };
    expect(report.status).toBe('FAIL');
    expect(report.checks.find((check) => check.name === 'project config')?.status).toBe('FAIL');
    expect(report.checks.find((check) => check.name === '.local gitignore')?.status).toBe('FAIL');
    expect(process.exitCode).toBe(1);
  });

  it('prints human-readable status and empty sync plans', async () => {
    const root = await makeTemporaryDirectory();
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await run(['init', '--workspace', root]);
    await run(['status', '--workspace', root]);
    expect(output.mock.calls.at(-1)?.[0]).toContain(`Project: ${path.join(root, '.has')}`);
    await run(['sync', '--workspace', root]);
    expect(output.mock.calls.join('\n')).toContain('no files to sync');
  });

  it('rejects invalid sync options and unsupported agents', async () => {
    const root = await makeTemporaryDirectory();
    await expect(run(['sync', '--workspace', root, '--dry-run', '--check']))
      .rejects.toThrow('Use either --check or --dry-run, not both');
    await expect(run(['sync', '--workspace', root, '--agent', 'unknown']))
      .rejects.toThrow('Unknown agent "unknown"');
  });

  it('supports sync preview, apply, drift checks, and explicit adoption in JSON mode', async () => {
    const root = await makeTemporaryDirectory();
    const ruleDirectory = path.join(root, '.has', 'rules');
    await mkdir(ruleDirectory, { recursive: true });
    await writeFile(
      path.join(ruleDirectory, 'cli.md'),
      `---\nschema_version: 1\nid: rule-cli\ndescription: CLI test rule\nscope: project\npriority: 1\nglobs: [\"src/**/*.ts\"]\nauthor: human\n---\nKeep the CLI safe.\n`,
    );
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const target = path.join(root, '.github/instructions/rule-cli.instructions.md');

    await run(['sync', '--workspace', root, '--agent', 'copilot', '--dry-run', '--json']);
    const preview = JSON.parse(output.mock.calls.at(-1)?.[0] as string) as {
      operations: Array<{ action: string; path: string }>;
      drift: boolean;
    };
    expect(preview.drift).toBe(true);
    expect(preview.operations).toContainEqual(expect.objectContaining({ action: 'create', path: '.github/instructions/rule-cli.instructions.md' }));
    await expect(readFile(target, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });

    await run(['sync', '--workspace', root, '--agent', 'copilot', '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).applied).toContain('.github/instructions/rule-cli.instructions.md');
    await run(['sync', '--workspace', root, '--agent', 'copilot', '--check', '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).drift).toBe(false);

    await writeFile(target, 'Unmanaged changes\n');
    await run(['sync', '--workspace', root, '--agent', 'copilot', '--check', '--json']);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).blocked).toBe(true);

    await run(['adopt', '.github/instructions/rule-cli.instructions.md', '--workspace', root, '--json']);
    const adopted = JSON.parse(output.mock.calls.at(-1)?.[0] as string) as { backup?: string };
    expect(adopted.backup).toBeDefined();
    await expect(readFile(path.join(root, adopted.backup!), 'utf8')).resolves.toBe('Unmanaged changes\n');
    await expect(readFile(target, 'utf8')).resolves.toContain('Keep the CLI safe.');
  });

  it('supports syncing to Kiro steering and skills', async () => {
    const root = await makeTemporaryDirectory();
    await writeRule(root);
    await writeSkill(root);
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await run(['sync', '--workspace', root, '--agent', 'kiro', '--dry-run', '--json']);
    const preview = JSON.parse(output.mock.calls.at(-1)?.[0] as string) as {
      operations: Array<{ action: string; path: string }>;
    };
    expect(preview.operations).toContainEqual(
      expect.objectContaining({ action: 'create', path: '.kiro/steering/rule-cli.md' }),
    );
    expect(preview.operations).toContainEqual(
      expect.objectContaining({ action: 'create', path: '.kiro/skills/cli-skill/SKILL.md' }),
    );

    await run(['sync', '--workspace', root, '--agent', 'kiro', '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).applied)
      .toContain('.kiro/steering/rule-cli.md');
    await expect(readFile(path.join(root, '.kiro/steering/rule-cli.md'), 'utf8'))
      .resolves.toContain('inclusion: fileMatch');
    await run(['sync', '--workspace', root, '--agent', 'kiro', '--check', '--json']);
    expect(JSON.parse(output.mock.calls.at(-1)?.[0] as string).drift).toBe(false);
  });
});
