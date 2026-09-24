/**
 * Cascade V2MOM domain types.
 *
 * Three-layer cascade: Company → Manager → Self.
 * Each layer holds a full V2MOM (Vision, Values, Methods, Measures, Obstacles).
 * Measures link upward via parentMeasureId and outward to Initiatives via
 * the capacity engine, so hours always trace back to the V2MOM.
 */

export type Uuid = string;

/** Which layer of the cascade this node lives in. */
export type CascadeLayer = 'company' | 'manager' | 'self';

/** The five V2MOM components. */
export type V2MOMComponent = 'vision' | 'value' | 'method' | 'measure' | 'obstacle';

/** Alignment health of a cascade edge. */
export type EdgeHealth = 'green' | 'amber' | 'red' | 'grey';

/**
 * Top-level alignment doc per layer.
 * A layer has exactly one V2MOM; all nodes in that layer belong to it.
 */
export interface V2MOM {
  id: Uuid;
  layer: CascadeLayer;
  title: string;
  /** ISO date of last review. Used for drift flag. */
  reviewedAt: string | null;
  /** Free-text context for the layer. */
  context: string;
}

/**
 * A single Vision statement per V2MOM.
 * The root of the cascade tree for its layer.
 */
export interface Vision {
  id: Uuid;
  v2momId: Uuid;
  layer: CascadeLayer;
  text: string;
  /** Links upward: which parent-layer Vision this aligns to. */
  parentVisionId: Uuid | null;
  health: EdgeHealth;
}

/**
 * A Value within a V2MOM. Ranked: lower = higher priority.
 * Values direct which Methods and Measures actually matter.
 */
export interface Value {
  id: Uuid;
  v2momId: Uuid;
  layer: CascadeLayer;
  title: string;
  description: string;
  rank: number;
  /** Links upward to a parent-layer Value it supports. */
  parentValueId: Uuid | null;
  health: EdgeHealth;
}

/**
 * A Method is how a Value is pursued. Owns concrete work.
 * Ranked within a Value: lower = do first.
 */
export interface Method {
  id: Uuid;
  v2momId: Uuid;
  layer: CascadeLayer;
  valueId: Uuid;
  title: string;
  description: string;
  rank: number;
  ownerId: Uuid | null;
  /** Links to parent-layer Method it implements, or null if top-level. */
  parentMethodId: Uuid | null;
  health: EdgeHealth;
}

/**
 * A Measure is a SMART target for a Method.
 * Key bridge between V2MOM and capacity: initiativeIds links hours here.
 */
export interface Measure {
  id: Uuid;
  v2momId: Uuid;
  layer: CascadeLayer;
  methodId: Uuid;
  title: string;
  /** SMART target description. */
  target: string;
  /** ISO due date. */
  dueDate: string | null;
  /** Current tracked value. */
  currentValue: number | null;
  /** Target numeric value. */
  targetValue: number | null;
  /** Unit for the values (e.g. "% of users", "NPS points", "incidents"). */
  unit: string;
  /** Links upward to parent-layer Measure this rolls into. */
  parentMeasureId: Uuid | null;
  /**
   * Which initiatives (from the capacity engine) fund this measure.
   * This is the core V2MOM↔capacity bridge.
   */
  initiativeIds: Uuid[];
  health: EdgeHealth;
}

/**
 * An Obstacle is a known blocker or risk to the V2MOM.
 * Linked to specific Methods or Measures it threatens.
 */
export interface Obstacle {
  id: Uuid;
  v2momId: Uuid;
  layer: CascadeLayer;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  /** What this obstacle threatens. */
  threatenedMethodIds: Uuid[];
  threatenedMeasureIds: Uuid[];
  /** ISO date when mitigated, null if still open. */
  mitigatedAt: string | null;
}

/** A person in the cascade context (subset of capacity Person). */
export interface CascadePerson {
  id: Uuid;
  name: string;
  role: 'pm' | 'engineer' | 'design' | 'content';
  weeklyCapacityHours: number;
  color: string;
}

/**
 * Capacity rollup for a single cascade node (Measure or Method).
 * Derived — never stored — by summing initiative hours.
 */
export interface MeasureCapacity {
  measureId: Uuid;
  /** Total planned hours across all linked initiatives, all people. */
  plannedHours: number;
  /** PM-only hours (discovery, definition, etc.). */
  pmHours: number;
  /** Engineering hours. */
  engHours: number;
  /** Fraction 0–1 of PM's total capacity allocated to this measure. */
  pmLoad: number;
  /** Linked initiative ids for drill-down. */
  initiativeIds: Uuid[];
}

/**
 * Alignment flags are derived from pure functions and never stored.
 * Only flag resolutions are stored as events.
 */
export type FlagCode =
  | 'missing_owner'         // Method has no owner
  | 'v2mom_drift'           // V2MOM not reviewed in >90 days
  | 'company_guidance_gap'  // Self layer has no parent link to company layer
  | 'orphan_work'           // Initiative hours not linked to any measure
  | 'unfunded_measure'      // Measure with no initiative hours
  | 'rank_capacity_mismatch'// High-rank measure has less capacity than lower-rank
  | 'unaligned_time'        // >20% of a person's hours on unfunded work
  | 'pm_overtime_run'       // PM overtime streak ≥3 weeks
  | 'poc_vs_prod_ambiguity' // Method has both POC and production initiatives
  | 'soft_hardening';       // Commitment strength changed without conditions being met

export interface AlignmentFlag {
  code: FlagCode;
  nodeId: Uuid;
  nodeType: 'method' | 'measure' | 'obstacle' | 'person';
  severity: 'info' | 'warn' | 'critical';
  message: string;
  /** If resolved, when and by whom. */
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}

/** A request that came from the engineering team or elsewhere, needing triage. */
export interface InboundRequest {
  id: Uuid;
  source: 'engineering' | 'stakeholder' | 'customer' | 'other';
  title: string;
  description: string;
  receivedAt: string;
  /** Which measure(s) this could contribute to, if aligned. */
  candidateMeasureIds: Uuid[];
  /** Set once triaged to an existing initiative. */
  resolvedToInitiativeId: Uuid | null;
  /** Triage outcome. */
  disposition: 'pending' | 'aligned' | 'parked' | 'declined';
}

/** Full cascade state. */
export interface CascadeState {
  v2moms: V2MOM[];
  visions: Vision[];
  values: Value[];
  methods: Method[];
  measures: Measure[];
  obstacles: Obstacle[];
  people: CascadePerson[];
  inboundRequests: InboundRequest[];
  /** Stored flag resolutions only; flags themselves are derived. */
  flagResolutions: Array<{
    flagCode: FlagCode;
    nodeId: Uuid;
    resolvedAt: string;
    resolvedBy: string;
    note: string;
  }>;
}
