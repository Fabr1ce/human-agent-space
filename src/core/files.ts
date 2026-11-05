import { randomUUID } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';
import { link, mkdir, open, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { minimatch } from 'minimatch';

export interface FrontmatterDocument {
  data: Record<string, unknown>;
  content: string;
}

export async function readFrontmatter(filePath: string): Promise<FrontmatterDocument> {
  const source = await readFile(filePath, 'utf8');
  const parsed = matter(source);
  if (Object.keys(parsed.data).length === 0) {
    throw new Error(`${filePath}: YAML frontmatter is required`);
  }

  return { data: parsed.data as Record<string, unknown>, content: parsed.content };
}

export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let ownsTemporary = false;

  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    ownsTemporary = true;
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, filePath);
    ownsTemporary = false;
  } catch (error) {
    await handle?.close();
    if (ownsTemporary) {
      await rm(temporaryPath, { force: true });
    }
    throw error;
  }
}

export async function createFileIfAbsent(filePath: string, content: string): Promise<boolean> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  let handle: FileHandle | undefined;
  let ownsTemporary = false;
  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    ownsTemporary = true;
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;

    await link(temporaryPath, filePath);
    return true;
  } catch (error) {
    if (isAlreadyExists(error)) {
      return false;
    }
    throw error;
  } finally {
    await handle?.close();
    if (ownsTemporary) {
      await rm(temporaryPath, { force: true });
    }
  }
}

export async function writeFrontmatter(
  filePath: string,
  data: Record<string, unknown>,
  content: string,
): Promise<void> {
  await atomicWriteFile(filePath, matter.stringify(content, data));
}

export async function listFiles(directory: string, glob?: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  }

  const paths: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await listFiles(entryPath, glob)));
    } else if (
      entry.isFile() &&
      (glob === undefined ||
        minimatch(path.relative(directory, entryPath).split(path.sep).join('/'), glob, {
          matchBase: true,
        }))
    ) {
      paths.push(entryPath);
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

export async function isDirectory(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function isAlreadyExists(error: unknown): boolean {
  return isNodeError(error) && error.code === 'EEXIST';
}

function isNotFound(error: unknown): boolean {
  return isNodeError(error) && error.code === 'ENOENT';
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
