/**
 * Capacity rollup through the V2MOM cascade.
 * Maps initiative hours → measures → methods → values.
 */

import type { MeasureCapacity, CascadeState } from './types';

interface InitiativeCapacity {
  id: string;
  title: string;
  measureIds: string[];
  totalPlannedHours: number;
  pmHours: number;
  engHours: number;
  status: 'active' | 'parked' | 'done' | 'declined';
}

export function computeMeasureCapacity(
  state: CascadeState,
  initiatives: InitiativeCapacity[],
): Map<string, MeasureCapacity> {
  const result = new Map<string, MeasureCapacity>();

  // Initialize all measures
  for (const m of state.measures) {
    result.set(m.id, {
      measureId: m.id,
      plannedHours: 0,
      pmHours: 0,
      engHours: 0,
      pmLoad: 0,
      initiativeIds: [],
    });
  }

  // Roll up initiative hours to their linked measures
  for (const init of initiatives) {
    if (init.status === 'parked' || init.status === 'declined') continue;
    for (const measureId of init.measureIds) {
      const cap = result.get(measureId);
      if (!cap) continue;
      cap.plannedHours += init.totalPlannedHours;
      cap.pmHours += init.pmHours;
      cap.engHours += init.engHours;
      cap.initiativeIds.push(init.id);
    }
  }

  // Compute PM load as fraction of total PM capacity
  const totalPmCapacity =
    state.people
      .filter((p) => p.role === 'pm')
      .reduce((sum, p) => sum + p.weeklyCapacityHours * 12, 0); // ~12 weeks per quarter

  for (const [, cap] of result) {
    cap.pmLoad = totalPmCapacity > 0 ? cap.pmHours / totalPmCapacity : 0;
  }

  return result;
}

/**
 * Roll measure capacity up to parent measures.
 * A parent measure's capacity = its own + sum of children.
 */
export function rollUpCapacity(
  capacities: Map<string, MeasureCapacity>,
  measures: CascadeState['measures'],
): Map<string, MeasureCapacity> {
  const rolled = new Map(Array.from(capacities.entries()).map(([k, v]) => [k, { ...v }]));

  // Build parent→children map
  const children = new Map<string, string[]>();
  for (const m of measures) {
    if (m.parentMeasureId) {
      if (!children.has(m.parentMeasureId)) children.set(m.parentMeasureId, []);
      children.get(m.parentMeasureId)!.push(m.id);
    }
  }

  // Topological roll-up (leaves first)
  const visited = new Set<string>();
  function rollUp(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const kids = children.get(id) ?? [];
    for (const kid of kids) rollUp(kid);
    const parentCap = rolled.get(id);
    if (!parentCap) return;
    for (const kid of kids) {
      const kidCap = rolled.get(kid);
      if (!kidCap) continue;
      parentCap.plannedHours += kidCap.plannedHours;
      parentCap.pmHours += kidCap.pmHours;
      parentCap.engHours += kidCap.engHours;
    }
  }

  for (const m of measures) {
    if (!m.parentMeasureId) rollUp(m.id);
  }

  return rolled;
}
