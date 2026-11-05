#!/usr/bin/env node
import { createProgram } from '../src/cli.js';

try {
  await createProgram().parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
