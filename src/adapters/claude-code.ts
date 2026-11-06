import path from 'node:path';
import type { WorkspaceRoots } from '../core/workspace.js';
import { projectKnowledge } from './project-knowledge.js';
import { isDirectory } from '../core/files.js';
import type { AdapterProjector } from './types.js';

export const claudeCodeProjector: AdapterProjector = {
  id: 'claude-code',
  label: 'Claude Code',
  async detect(roots: WorkspaceRoots) {
    const root = roots.repositoryRoot;
    const configured = root ? await isDirectory(path.join(root, '.claude')) : false;
    return { configured, paths: configured ? ['.claude'] : [] };
  },
  capabilities() {
    return {
      instructionRoot: '.claude/rules',
      skillRoot: '.claude/skills',
      pathScopedRules: true,
      nativeSkills: true,
      verified: 'verified',
    };
  },
  project: (roots: WorkspaceRoots) =>
    projectKnowledge(
      roots,
      'claude-code',
      (rule) => `.claude/rules/${rule.id}.md`,
    ),
};
