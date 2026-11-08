import path from 'node:path';
import type { WorkspaceRoots } from '../core/workspace.js';
import { isDirectory } from '../core/files.js';
import { projectKnowledge } from './project-knowledge.js';
import type { AdapterProjector } from './types.js';

export const kiroProjector: AdapterProjector = {
  id: 'kiro',
  label: 'Kiro',
  async detect(roots: WorkspaceRoots) {
    const root = roots.repositoryRoot;
    const configured = root ? await isDirectory(path.join(root, '.kiro')) : false;
    return { configured, paths: configured ? ['.kiro'] : [] };
  },
  capabilities() {
    return {
      instructionRoot: '.kiro/steering',
      skillRoot: '.kiro/skills',
      pathScopedRules: true,
      nativeSkills: true,
      verified: 'verified',
    };
  },
  project: (roots: WorkspaceRoots) =>
    projectKnowledge(
      roots,
      'kiro',
      (rule) => `.kiro/steering/${rule.id}.md`,
    ),
};
