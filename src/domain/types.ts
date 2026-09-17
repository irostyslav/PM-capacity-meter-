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
 */
export type BlockKind = 'delivery' | 'spike' | 'protected';

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
  /** Must be non-empty to graduate. */
  oneLineDefinition: string;
  addedAt: string;
  triageId: Uuid | null;
  estimatedHours: number | null;
  /** Set once a spike has been scheduled for this item. */
  spikeBlockId: Uuid | null;
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

export interface WeeklyReset {
  id: Uuid;
  weekStart: WeekStart;
  completedAt: string;
  shipped: Uuid[];
  slipped: Uuid[];
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
