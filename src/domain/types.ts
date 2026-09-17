/**
 * Domain types for Capacity Timeline.
 *
 * These mirror docs/product-spec.md §6 field for field. The names are
 * contractual: they are used in code, UI copy, and analytics alike.
 */

export type Uuid = string;

/** ISO date string for a Monday, e.g. "2026-09-14". */
export type WeekStart = string;

export type Confidence = 'high' | 'medium' | 'low';

/**
 * `protected` is PM-declared no-touch time (thinking, writing, discovery). It
 * consumes capacity and is never moved by an automatic rebalance.
 *
 * `unavailable` is PTO, a holiday, or an on-call rotation. It does not consume
 * capacity — it *reduces* it, because those hours were never available to plan
 * against. See spec §6.2.
 */
export type BlockKind = 'delivery' | 'spike' | 'protected' | 'unavailable';

export type InitiativeStatus = 'parked' | 'active' | 'done' | 'declined';

export type CommitmentAction =
  | 'committed'
  | 'declined'
  | 'deferred'
  | 'cut'
  | 'rebalanced';

export interface Engineer {
  id: Uuid;
  name: string;
  /** Row accent. Deliberately distinct from the initiative palette. */
  color: string;
  /**
   * Defaults to 30, not 40. The default encodes the thesis that a week was
   * never 40 hours of project work — see spec §6.1.
   */
  weeklyCapacityHours: number;
  active: boolean;
}

export interface Initiative {
  id: Uuid;
  title: string;
  color: string;
  status: InitiativeStatus;
  estimatedHours: number | null;
  /** Required for anything not `parked`. Enforced by `canSchedule`. */
  triageId: Uuid | null;
  /** Required to graduate out of the parking lot. */
  definitionOfDone: string;
}

/**
 * A contiguous allocation of one engineer's time, on one initiative, in one
 * week. Blocks do not span weeks; multi-week work is several linked blocks.
 */
export interface Block {
  id: Uuid;
  engineerId: Uuid;
  initiativeId: Uuid | null;
  weekStart: WeekStart;
  hours: number;
  confidence: Confidence;
  kind: BlockKind;
  actualHours: number;
  /** Only meaningful for `protected` blocks. */
  label?: string;
  /** Only meaningful for `spike` blocks. */
  spike?: Spike;
}

/** The five triage answers. Immutable once submitted. */
export interface TriageRecord {
  id: Uuid;
  submittedAt: string;
  requester: string;
  title: string;
  /** 1. What problem does this solve, for whom? */
  problem: string;
  /** 2. What breaks if we don't do this in the next 90 days? */
  costOfDelay: string;
  /** 3. How will we know it worked? */
  successSignal: string;
  /** 4. Is this understood well enough to size? `false` routes to the lot. */
  sizable: boolean;
  /** 5. What are we cutting to make room? */
  whatWeCut: string;
}

export interface ParkingLotItem {
  id: Uuid;
  title: string;
  /** Must be non-empty to graduate. A RICE score never substitutes for this. */
  oneLineDefinition: string;
  addedAt: string;
  triageId: Uuid | null;
  estimatedHours: number | null;
  /** Set once a spike has been scheduled for this item. */
  spikeBlockId: Uuid | null;
  /** Manual stack rank. Lower sorts first. */
  order: number;
  rice: RiceScore | null;
}

/**
 * Reach × Impact × Confidence ÷ Effort.
 *
 * Scoring orders the lot; it does not open the gate. `canGraduate` still
 * demands a one-line definition, and staleness still fires on an undefined
 * item however well it scores — otherwise the lot becomes a backlog with a
 * comfortable place to hoard.
 */
export interface RiceScore {
  /** People or events affected per quarter. */
  reach: number;
  /** Massive 3, high 2, medium 1, low 0.5, minimal 0.25. */
  impact: 0.25 | 0.5 | 1 | 2 | 3;
  /** High 1, medium 0.8, low 0.5. */
  confidence: 0.5 | 0.8 | 1;
  /** Person-hours. Must be > 0. */
  effortHours: number;
}

export interface Spike {
  /** Constrained to 2–5 days. Enforced by `isValidTimebox`. */
  timeboxDays: number;
  /** The acceptance criterion: prose, not code. */
  brief: string;
  briefSubmittedAt: string | null;
  /** Engineer-initiated spikes are the second success metric — count them. */
  initiatedBy: 'pm' | 'engineer';
}

export interface CommitmentLogEntry {
  id: Uuid;
  timestamp: string;
  requester: string;
  initiativeId: Uuid | null;
  action: CommitmentAction;
  /** The trade. Free text. */
  whatWasCut: string;
  note: string;
  /** Corrections append and reference; entries are never edited. */
  correctsEntryId?: Uuid;
}

/**
 * Why work did not finish. Captured at the weekly reset, because a carry-over
 * without a cause teaches the squad nothing about its own estimating.
 */
export type CarryOverReason =
  | 'scope-grew'
  | 'unplanned-work'
  | 'blocked-externally'
  | 'estimate-was-low'
  | 'incident'
  | 'person-unavailable'
  | 'other';

export interface CarryOver {
  blockId: Uuid;
  reason: CarryOverReason;
  hoursCarried: number;
  note: string;
}

export interface WeeklyReset {
  id: Uuid;
  weekStart: WeekStart;
  completedAt: string;
  shipped: Uuid[];
  slipped: Uuid[];
  carryOvers: CarryOver[];
  bufferBeforeByEngineer: Record<Uuid, number>;
  bufferAfterByEngineer: Record<Uuid, number>;
  /** True when the PM knowingly went below the buffer threshold. */
  acceptedBelowThreshold: boolean;
  notes: string;
}

export interface PlanState {
  engineers: Engineer[];
  initiatives: Initiative[];
  blocks: Block[];
  parkingLot: ParkingLotItem[];
  triages: TriageRecord[];
  log: CommitmentLogEntry[];
  resets: WeeklyReset[];
}
