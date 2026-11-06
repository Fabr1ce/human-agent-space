import path from 'node:path';
import type { WorkspaceRoots } from '../core/workspace.js';
import { projectKnowledge } from './project-knowledge.js';
import { isDirectory } from '../core/files.js';
import type { AdapterProjector } from './types.js';

export const copilotProjector: AdapterProjector = {
  id: 'copilot',
  label: 'GitHub Copilot',
  async detect(roots: WorkspaceRoots) {
    const root = roots.repositoryRoot;
    const configured = root ? await isDirectory(path.join(root, '.github')) : false;
    return { configured, paths: configured ? ['.github'] : [] };
  },
  capabilities() {
    return {
      instructionRoot: '.github/instructions',
      skillRoot: '.github/skills',
      pathScopedRules: true,
      nativeSkills: true,
      verified: 'partial',
    };
  },
  project: (roots: WorkspaceRoots) =>
    projectKnowledge(
      roots,
      'copilot',
      (rule) => `.github/instructions/${rule.id}.instructions.md`,
    ),
};
