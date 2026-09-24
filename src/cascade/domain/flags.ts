/**
 * Flag computation — pure functions, no side effects.
 * Flags are derived from state; only resolutions are stored.
 */

import type {
  CascadeState,
  AlignmentFlag,
  FlagCode,
  Method,
  Measure,
} from './types';

function flag(
  code: FlagCode,
  nodeId: string,
  nodeType: AlignmentFlag['nodeType'],
  severity: AlignmentFlag['severity'],
  message: string,
  resolutions: CascadeState['flagResolutions'],
): AlignmentFlag {
  const res = resolutions.find((r) => r.flagCode === code && r.nodeId === nodeId);
  return {
    code,
    nodeId,
    nodeType,
    severity,
    message,
    resolvedAt: res?.resolvedAt ?? null,
    resolvedBy: res?.resolvedBy ?? null,
    resolutionNote: res?.note ?? null,
  };
}

export function computeFlags(state: CascadeState): AlignmentFlag[] {
  const flags: AlignmentFlag[] = [];
  const { methods, measures, v2moms, visions, flagResolutions } = state;

  // missing_owner: method has no assigned owner
  for (const m of methods) {
    if (!m.ownerId) {
      flags.push(flag('missing_owner', m.id, 'method', 'warn',
        `Method "${m.title}" has no owner.`, flagResolutions));
    }
  }

  // v2mom_drift: not reviewed in >90 days
  const now = Date.now();
  for (const v of v2moms) {
    if (!v.reviewedAt) continue;
    const age = (now - new Date(v.reviewedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (age > 90) {
      const vision = visions.find((vis) => vis.v2momId === v.id);
      if (vision) {
        flags.push(flag('v2mom_drift', vision.id, 'method', 'warn',
          `V2MOM "${v.title}" last reviewed ${Math.floor(age)} days ago.`, flagResolutions));
      }
    }
  }

  // company_guidance_gap: self-layer vision has no parent link to company
  const selfVisions = visions.filter((v) => v.layer === 'self');
  for (const v of selfVisions) {
    const companyVision = visions.find(
      (cv) => cv.layer === 'company' && (v.parentVisionId === cv.id || isAncestorVision(v, cv.id, visions)),
    );
    if (!companyVision) {
      flags.push(flag('company_guidance_gap', v.id, 'method', 'critical',
        `Self vision "${v.text.slice(0, 40)}…" has no link to company layer.`, flagResolutions));
    }
  }

  // unfunded_measure: measure with no initiative hours
  for (const m of measures) {
    if (m.layer === 'self' && m.initiativeIds.length === 0 && m.methodId) {
      flags.push(flag('unfunded_measure', m.id, 'measure', 'warn',
        `Measure "${m.title}" has no linked initiatives.`, flagResolutions));
    }
  }

  // rank_capacity_mismatch: higher-rank measure has less capacity than lower-rank
  const methodGroups = groupBy(measures.filter((m) => m.layer === 'self'), (m) => m.methodId);
  for (const [, group] of Object.entries(methodGroups)) {
    const sorted = [...group].sort((a, b) => {
      const ma = methods.find((m) => m.id === a.methodId);
      const mb = methods.find((m) => m.id === b.methodId);
      return (ma?.rank ?? 0) - (mb?.rank ?? 0);
    });
    // Simple check: first measure should have >= hours than others
    if (sorted.length >= 2) {
      const first = sorted[0];
      if (first) {
        const rest = sorted.slice(1);
        const firstHours = first.initiativeIds.length;
        for (const other of rest) {
          if (other.initiativeIds.length > firstHours) {
            flags.push(flag('rank_capacity_mismatch', first.id, 'measure', 'warn',
              `Lower-priority measure "${other.title}" has more initiatives than "${first.title}".`,
              flagResolutions));
          }
        }
      }
    }
  }

  // poc_vs_prod_ambiguity: method has both POC and production initiatives
  const pocMethodIds = new Set<string>();
  const prodMethodIds = new Set<string>();
  for (const m of measures) {
    for (const iid of m.initiativeIds) {
      const title = iid.toLowerCase();
      if (title.includes('poc')) pocMethodIds.add(m.methodId);
      else prodMethodIds.add(m.methodId);
    }
  }
  for (const methodId of pocMethodIds) {
    if (prodMethodIds.has(methodId)) {
      const method = methods.find((m) => m.id === methodId);
      if (method) {
        flags.push(flag('poc_vs_prod_ambiguity', methodId, 'method', 'critical',
          `Method "${method.title}" has both POC and production initiatives — needs an explicit decision gate.`,
          flagResolutions));
      }
    }
  }

  return flags;
}

function isAncestorVision(
  vision: { parentVisionId: string | null },
  targetId: string,
  all: Array<{ id: string; parentVisionId: string | null }>,
  depth = 0,
): boolean {
  if (depth > 10) return false;
  if (!vision.parentVisionId) return false;
  if (vision.parentVisionId === targetId) return true;
  const parent = all.find((v) => v.id === vision.parentVisionId);
  if (!parent) return false;
  return isAncestorVision(parent, targetId, all, depth + 1);
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!result[k]) result[k] = [];
    result[k].push(item);
  }
  return result;
}

/** Get all active (unresolved) flags for a given node id. */
export function flagsForNode(
  flags: AlignmentFlag[],
  nodeId: string,
): AlignmentFlag[] {
  return flags.filter((f) => f.nodeId === nodeId && !f.resolvedAt);
}

export type { Method, Measure };
