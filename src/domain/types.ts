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

export type Role = 'engineer' | 'pm';

/**
 * What a PM's hours actually go into. Named specifically, because "PM work" as
 * one undifferentiated lump is how it ends up invisible: nobody argues with
 * "discovery for the billing migration, 8 hours", but everybody argues with
 * "PM stuff".
 */
export type PmWorkType =
  | 'discovery'
  | 'definition'
  | 'triage'
  | 'stakeholder'
  | 'review';

/**
 * `protected` is declared no-touch time (thinking, writing, discovery). It
 * consumes capacity and is never moved by an automatic rebalance.
 *
 * `unavailable` is PTO, a holiday, or an on-call rotation. It does not consume
 * capacity — it *reduces* it, because those hours were never available to plan
 * against. See spec §6.2.
 *
 * `pm-work` is the PM's own hours: discovery, definition, triage, stakeholder
 * time, review. It consumes the PM's capacity exactly as delivery consumes an
 * engineer's. See spec §6.3.
 */
export type BlockKind =
  | 'delivery'
  | 'spike'
  | 'protected'
  | 'unavailable'
  | 'pm-work';

export type InitiativeStatus = 'parked' | 'active' | 'done' | 'declined';

export type CommitmentAction =
  | 'committed'
  | 'declined'
  | 'deferred'
  | 'cut'
  | 'rebalanced';

/**
 * Anyone with a row on the board — including the PM.
 *
 * The PM being absent from this type was the product's original blind spot: a
 * planner with no capacity is a planner whose discovery is implicitly free,
 * which is how the work ends up happening at night. See spec §6.3.
 */
export interface Person {
  id: Uuid;
  name: string;
  /** Row accent. Deliberately distinct from the initiative palette. */
  color: string;
  role: Role;
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
  personId: Uuid;
  initiativeId: Uuid | null;
  weekStart: WeekStart;
  hours: number;
  confidence: Confidence;
  kind: BlockKind;
  actualHours: number;
  /** Only meaningful for `protected` and `unavailable` blocks. */
  label?: string;
  /** Required for `pm-work` blocks: what kind of thinking this is. */
  pmWork?: PmWorkType;
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
  bufferBeforeByPerson: Record<Uuid, number>;
  bufferAfterByPerson: Record<Uuid, number>;
  /** True when the PM knowingly went below the buffer threshold. */
  acceptedBelowThreshold: boolean;
  notes: string;
}

export interface PlanState {
  people: Person[];
  initiatives: Initiative[];
  blocks: Block[];
  parkingLot: ParkingLotItem[];
  triages: TriageRecord[];
  log: CommitmentLogEntry[];
  resets: WeeklyReset[];
}
