import type { WorkspaceRoots } from '../core/workspace.js';
import type { ApplyOptions, SyncReport, SyncPlan } from '../sync/engine.js';
import type { AdoptReport } from '../sync/engine.js';

export type AdapterId = 'copilot' | 'claude-code' | 'kiro';

export interface GeneratedFile {
  agent: AdapterId;
  path: string;
  source: string;
  content: Buffer;
}

export interface AdapterCapabilities {
  instructionRoot: string;
  skillRoot: string;
  pathScopedRules: boolean;
  nativeSkills: boolean;
  verified: 'verified' | 'partial' | 'unverified';
}

export interface AdapterProjector {
  id: AdapterId;
  label: string;
  detect(roots: WorkspaceRoots): Promise<{ configured: boolean; paths: string[] }>;
  capabilities(): AdapterCapabilities;
  project(roots: WorkspaceRoots): Promise<GeneratedFile[]>;
}

export interface AgentAdapter extends AdapterProjector {
  plan(roots: WorkspaceRoots): Promise<SyncPlan>;
  apply(plan: SyncPlan, options?: ApplyOptions): Promise<SyncReport>;
  check(roots: WorkspaceRoots): Promise<SyncReport>;
  adopt(roots: WorkspaceRoots, file: string, dryRun?: boolean): Promise<AdoptReport>;
}
