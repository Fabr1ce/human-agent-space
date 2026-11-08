import { claudeCodeProjector } from './claude-code.js';
import { copilotProjector } from './copilot.js';
import { kiroProjector } from './kiro.js';
import {
  adoptWorkspaceFile,
  applyWorkspaceSyncPlan,
  planWorkspaceSync,
  syncWorkspace,
} from '../sync/engine.js';
import type { WorkspaceRoots } from '../core/workspace.js';
import type { AdapterId, AdapterProjector, AgentAdapter } from './types.js';

const projectors: Record<AdapterId, AdapterProjector> = {
  copilot: copilotProjector,
  'claude-code': claudeCodeProjector,
  kiro: kiroProjector,
};

function register(projector: AdapterProjector): AgentAdapter {
  const adapter: AgentAdapter = {
    ...projector,
    plan: (roots: WorkspaceRoots) => planWorkspaceSync(roots, [adapter]),
    apply: (plan, options) => applyWorkspaceSyncPlan(plan, options),
    check: (roots) => syncWorkspace(roots, [adapter], { check: true }),
    adopt: (roots, file, dryRun) => adoptWorkspaceFile(roots, file, [adapter], dryRun),
  };
  return adapter;
}

const adapters: Record<AdapterId, AgentAdapter> = {
  copilot: register(projectors.copilot),
  'claude-code': register(projectors['claude-code']),
  kiro: register(projectors.kiro),
};

export function getAdapter(id: AdapterId): AgentAdapter {
  return adapters[id];
}

export function listAdapters(): AgentAdapter[] {
  return Object.values(adapters);
}
