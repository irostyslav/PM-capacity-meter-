/**
 * Golden-path seed data for the Cascade V2MOM.
 *
 * Story: A PM working on a billing migration discovers that a "quick POC"
 * is heading toward production without conditions being met. The cascade
 * makes this visible through health edges and flags before it becomes a
 * commitment the team can't walk back.
 */

import type { CascadeState } from './types';

export const SEED: CascadeState = {
  v2moms: [
    {
      id: 'v2mom-co',
      layer: 'company',
      title: 'Company FY26 V2MOM',
      reviewedAt: '2026-07-01',
      context: 'Drive profitable growth through platform reliability and enterprise expansion.',
    },
    {
      id: 'v2mom-mgr',
      layer: 'manager',
      title: 'Platform PM V2MOM Q3–Q4',
      reviewedAt: '2026-08-15',
      context: 'Own billing reliability and self-serve upgrade path for SMB segment.',
    },
    {
      id: 'v2mom-self',
      layer: 'self',
      title: 'My V2MOM — Sept 2026',
      reviewedAt: '2026-09-01',
      context: 'Ship billing migration on time, keep eng team unblocked, run discovery on pricing page.',
    },
  ],

  visions: [
    {
      id: 'vis-co',
      v2momId: 'v2mom-co',
      layer: 'company',
      text: 'Be the most trusted platform for SMB financial operations by Q4 2027.',
      parentVisionId: null,
      health: 'green',
    },
    {
      id: 'vis-mgr',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      text: 'Eliminate billing errors and ship self-serve upgrade to unblock enterprise sales.',
      parentVisionId: 'vis-co',
      health: 'green',
    },
    {
      id: 'vis-self',
      v2momId: 'v2mom-self',
      layer: 'self',
      text: 'Migrate billing to Stripe, ship upgrade flow, and keep team throughput above 85%.',
      parentVisionId: 'vis-mgr',
      health: 'amber',
    },
  ],

  values: [
    // Company values
    {
      id: 'val-co-reliability',
      v2momId: 'v2mom-co',
      layer: 'company',
      title: 'Platform Reliability',
      description: 'Every feature ships production-grade or not at all.',
      rank: 1,
      parentValueId: null,
      health: 'green',
    },
    {
      id: 'val-co-growth',
      v2momId: 'v2mom-co',
      layer: 'company',
      title: 'Profitable Growth',
      description: 'Ship revenue-generating features faster than cost grows.',
      rank: 2,
      parentValueId: null,
      health: 'green',
    },

    // Manager values
    {
      id: 'val-mgr-billing',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      title: 'Billing Accuracy',
      description: 'Zero double-charges, zero missed renewals, full audit trail.',
      rank: 1,
      parentValueId: 'val-co-reliability',
      health: 'green',
    },
    {
      id: 'val-mgr-selfserve',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      title: 'Self-Serve Upgrade',
      description: 'SMB customers can upgrade without touching sales.',
      rank: 2,
      parentValueId: 'val-co-growth',
      health: 'green',
    },

    // Self values
    {
      id: 'val-self-migration',
      v2momId: 'v2mom-self',
      layer: 'self',
      title: 'Clean Migration',
      description: 'Stripe migration with zero data loss and full rollback tested.',
      rank: 1,
      parentValueId: 'val-mgr-billing',
      health: 'amber',
    },
    {
      id: 'val-self-eng',
      v2momId: 'v2mom-self',
      layer: 'self',
      title: 'Eng Team Unblocked',
      description: 'No engineer waits >1 day for a PM decision.',
      rank: 2,
      parentValueId: 'val-mgr-selfserve',
      health: 'green',
    },
  ],

  methods: [
    // Company methods
    {
      id: 'meth-co-infra',
      v2momId: 'v2mom-co',
      layer: 'company',
      valueId: 'val-co-reliability',
      title: 'Modernize payment infrastructure',
      description: 'Migrate all payment processing to enterprise-grade providers.',
      rank: 1,
      ownerId: null,
      parentMethodId: null,
      health: 'green',
    },
    {
      id: 'meth-co-pricing',
      v2momId: 'v2mom-co',
      layer: 'company',
      valueId: 'val-co-growth',
      title: 'Launch self-serve pricing page',
      description: 'Let customers compare and upgrade plans without a sales call.',
      rank: 1,
      ownerId: null,
      parentMethodId: null,
      health: 'green',
    },

    // Manager methods
    {
      id: 'meth-mgr-stripe',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      valueId: 'val-mgr-billing',
      title: 'Stripe billing migration',
      description: 'Replace legacy billing with Stripe, with full audit trail and rollback.',
      rank: 1,
      ownerId: 'person-pm',
      parentMethodId: 'meth-co-infra',
      health: 'green',
    },
    {
      id: 'meth-mgr-upgrade',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      valueId: 'val-mgr-selfserve',
      title: 'Self-serve upgrade flow',
      description: 'Pricing page → plan selection → Stripe checkout → access granted.',
      rank: 2,
      ownerId: 'person-pm',
      parentMethodId: 'meth-co-pricing',
      health: 'amber',
    },

    // Self methods
    {
      id: 'meth-self-stripe-poc',
      v2momId: 'v2mom-self',
      layer: 'self',
      valueId: 'val-self-migration',
      title: 'Run Stripe POC to production decision',
      description: 'Time-boxed POC: 2 weeks, 2 engineers. Decision gate before production build.',
      rank: 1,
      ownerId: 'person-pm',
      parentMethodId: 'meth-mgr-stripe',
      health: 'red',
    },
    {
      id: 'meth-self-unblock',
      v2momId: 'v2mom-self',
      layer: 'self',
      valueId: 'val-self-eng',
      title: 'Daily async unblocking ritual',
      description: 'Morning Slack sweep: answer all eng questions before standup.',
      rank: 1,
      ownerId: 'person-pm',
      parentMethodId: null,
      health: 'green',
    },
    {
      id: 'meth-self-pricing',
      v2momId: 'v2mom-self',
      layer: 'self',
      valueId: 'val-self-migration',
      title: 'Pricing page discovery',
      description: 'User interviews + competitive audit before any wireframe.',
      rank: 2,
      ownerId: 'person-pm',
      parentMethodId: 'meth-mgr-upgrade',
      health: 'amber',
    },
  ],

  measures: [
    // Company measures
    {
      id: 'meas-co-billing-errors',
      v2momId: 'v2mom-co',
      layer: 'company',
      methodId: 'meth-co-infra',
      title: 'Billing error rate',
      target: '< 0.1% of transactions by Q4 2026',
      dueDate: '2026-12-31',
      currentValue: 1.4,
      targetValue: 0.1,
      unit: '% of transactions',
      parentMeasureId: null,
      initiativeIds: [],
      health: 'red',
    },
    {
      id: 'meas-co-selfserve',
      v2momId: 'v2mom-co',
      layer: 'company',
      methodId: 'meth-co-pricing',
      title: 'Self-serve upgrades',
      target: '40% of SMB upgrades without sales by Q4',
      dueDate: '2026-12-31',
      currentValue: 12,
      targetValue: 40,
      unit: '% of SMB upgrades',
      parentMeasureId: null,
      initiativeIds: [],
      health: 'amber',
    },

    // Manager measures
    {
      id: 'meas-mgr-migration',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      methodId: 'meth-mgr-stripe',
      title: 'Stripe migration complete',
      target: '100% of new charges processed via Stripe by Oct 31',
      dueDate: '2026-10-31',
      currentValue: 0,
      targetValue: 100,
      unit: '% of new charges',
      parentMeasureId: 'meas-co-billing-errors',
      initiativeIds: ['init-stripe'],
      health: 'amber',
    },
    {
      id: 'meas-mgr-upgrade-flow',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      methodId: 'meth-mgr-upgrade',
      title: 'Upgrade flow shipped',
      target: 'Self-serve upgrade live for all SMB tiers by Nov 30',
      dueDate: '2026-11-30',
      currentValue: 0,
      targetValue: 1,
      unit: 'milestone (0=not started, 1=live)',
      parentMeasureId: 'meas-co-selfserve',
      initiativeIds: ['init-upgrade'],
      health: 'grey',
    },

    // Self measures
    {
      id: 'meas-self-poc-decision',
      v2momId: 'v2mom-self',
      layer: 'self',
      methodId: 'meth-self-stripe-poc',
      title: 'POC decision gate passed',
      target: 'Written go/no-go by Oct 10, reviewed by EM and manager',
      dueDate: '2026-10-10',
      currentValue: 0,
      targetValue: 1,
      unit: 'decision doc (0=pending, 1=approved)',
      parentMeasureId: 'meas-mgr-migration',
      initiativeIds: ['init-stripe-poc'],
      health: 'red',
    },
    {
      id: 'meas-self-unblock',
      v2momId: 'v2mom-self',
      layer: 'self',
      methodId: 'meth-self-unblock',
      title: 'Eng unblock response time',
      target: '≤ 4 hours to first response on blocking questions',
      dueDate: null,
      currentValue: 3.2,
      targetValue: 4,
      unit: 'hours avg response',
      parentMeasureId: null,
      initiativeIds: [],
      health: 'green',
    },
    {
      id: 'meas-self-pricing-interviews',
      v2momId: 'v2mom-self',
      layer: 'self',
      methodId: 'meth-self-pricing',
      title: 'Pricing discovery interviews',
      target: '8 user interviews completed, synthesis doc shared by Oct 31',
      dueDate: '2026-10-31',
      currentValue: 2,
      targetValue: 8,
      unit: 'interviews completed',
      parentMeasureId: 'meas-mgr-upgrade-flow',
      initiativeIds: ['init-pricing-discovery'],
      health: 'amber',
    },
  ],

  obstacles: [
    {
      id: 'obs-poc-scope',
      v2momId: 'v2mom-self',
      layer: 'self',
      title: 'POC scope creep — heading toward production without decision gate',
      description:
        'Engineering team started adding production-level error handling and retry logic to the POC branch. ' +
        'The original timebox was 2 weeks / 2 engineers for a feasibility proof. ' +
        'Without an explicit go/no-go, the POC will become the production system by default.',
      severity: 'high',
      threatenedMethodIds: ['meth-self-stripe-poc'],
      threatenedMeasureIds: ['meas-self-poc-decision', 'meas-mgr-migration'],
      mitigatedAt: null,
    },
    {
      id: 'obs-pm-capacity',
      v2momId: 'v2mom-self',
      layer: 'self',
      title: 'PM discovery time crowded out by synchronous meetings',
      description:
        'Current week: 14 hours of meetings on calendar. Discovery work for pricing page and POC decision ' +
        'requires focused async blocks. At current meeting load, PM capacity for deep work is below minimum.',
      severity: 'medium',
      threatenedMethodIds: ['meth-self-pricing', 'meth-self-stripe-poc'],
      threatenedMeasureIds: ['meas-self-pricing-interviews', 'meas-self-poc-decision'],
      mitigatedAt: null,
    },
    {
      id: 'obs-eng-availability',
      v2momId: 'v2mom-mgr',
      layer: 'manager',
      title: 'Two engineers out in Oct — migration timeline at risk',
      description:
        'Eng-2 and Eng-4 have approved PTO overlapping the final 2 weeks of the Stripe migration window. ' +
        'Current plan has no buffer for this. If the POC decision slips, there is no recovery time.',
      severity: 'high',
      threatenedMethodIds: ['meth-mgr-stripe'],
      threatenedMeasureIds: ['meas-mgr-migration', 'meas-self-poc-decision'],
      mitigatedAt: null,
    },
  ],

  people: [
    {
      id: 'person-pm',
      name: 'You (PM)',
      role: 'pm',
      weeklyCapacityHours: 30,
      color: '#6366f1',
    },
    {
      id: 'person-eng1',
      name: 'Eng-1',
      role: 'engineer',
      weeklyCapacityHours: 30,
      color: '#10b981',
    },
    {
      id: 'person-eng2',
      name: 'Eng-2',
      role: 'engineer',
      weeklyCapacityHours: 30,
      color: '#f59e0b',
    },
    {
      id: 'person-eng3',
      name: 'Eng-3',
      role: 'engineer',
      weeklyCapacityHours: 30,
      color: '#ef4444',
    },
    {
      id: 'person-eng4',
      name: 'Eng-4',
      role: 'engineer',
      weeklyCapacityHours: 30,
      color: '#8b5cf6',
    },
  ],

  inboundRequests: [
    {
      id: 'req-1',
      source: 'engineering',
      title: 'Add retry logic to Stripe webhook handler',
      description:
        'Engineering team asking to add exponential backoff retry to the webhook consumer. ' +
        'This is production-grade work — should be part of the migration initiative, not the POC.',
      receivedAt: '2026-09-18',
      candidateMeasureIds: ['meas-self-poc-decision', 'meas-mgr-migration'],
      resolvedToInitiativeId: null,
      disposition: 'pending',
    },
    {
      id: 'req-2',
      source: 'stakeholder',
      title: 'Can we show pricing comparison table this quarter?',
      description:
        'Sales is asking for a pricing comparison table for enterprise prospects. ' +
        'Aligns with the upgrade flow measure but competes for the same PM and design capacity.',
      receivedAt: '2026-09-20',
      candidateMeasureIds: ['meas-mgr-upgrade-flow', 'meas-self-pricing-interviews'],
      resolvedToInitiativeId: null,
      disposition: 'pending',
    },
    {
      id: 'req-3',
      source: 'engineering',
      title: 'Migrate test suite to Stripe test mode',
      description:
        'Eng-3 flagged that the integration tests still hit a mocked billing API, not Stripe test mode. ' +
        'Blocking proper QA of the migration. Small task (~8h) but needs PM sign-off on scope.',
      receivedAt: '2026-09-22',
      candidateMeasureIds: ['meas-self-poc-decision'],
      resolvedToInitiativeId: 'init-stripe-poc',
      disposition: 'aligned',
    },
  ],

  flagResolutions: [],
};

/** Capacity data that mirrors what the capacity board engine would compute. */
export const SEED_CAPACITY = {
  initiatives: [
    {
      id: 'init-stripe',
      title: 'Stripe Migration — Production',
      measureIds: ['meas-mgr-migration', 'meas-self-poc-decision'],
      totalPlannedHours: 240,
      pmHours: 40,
      engHours: 200,
      status: 'active' as const,
    },
    {
      id: 'init-stripe-poc',
      title: 'Stripe POC (time-boxed)',
      measureIds: ['meas-self-poc-decision'],
      totalPlannedHours: 80,
      pmHours: 16,
      engHours: 64,
      status: 'active' as const,
    },
    {
      id: 'init-upgrade',
      title: 'Self-Serve Upgrade Flow',
      measureIds: ['meas-mgr-upgrade-flow'],
      totalPlannedHours: 160,
      pmHours: 32,
      engHours: 128,
      status: 'parked' as const,
    },
    {
      id: 'init-pricing-discovery',
      title: 'Pricing Page Discovery',
      measureIds: ['meas-self-pricing-interviews'],
      totalPlannedHours: 40,
      pmHours: 36,
      engHours: 4,
      status: 'active' as const,
    },
  ],
};
