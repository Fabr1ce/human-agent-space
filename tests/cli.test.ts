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
});
