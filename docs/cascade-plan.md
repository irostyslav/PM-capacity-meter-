# Cascade — Implementation Plan

**Status:** Plan for build · 2026-09-24 (rev. 2)
**Input:** *V2MOM Alignment App — Full Build Plan* (the "source plan")

**Cascade is the product, and the V2MOM is its spine.** Every screen starts
from the company → manager → self cascade and returns to it. **Capacity
visibility — for the PM and for the delivery team the PM works with — is one
of its core capabilities**, and it is shown *through* the V2MOM: hours
attach to the methods and measures they serve, not to a separate plan.

The Capacity Timeline board already in this repo becomes that capability.
Nothing about it is thrown away. It gains a reason to exist beyond "is this
week full": *is this week full of the right things?*

This document does not restate the source plan. It records what changes when
the source plan meets this codebase, makes its rules testable, and orders the
work so every milestone ends with a demo of the golden path getting further.

---

## 1. What we are building, in one paragraph

A private, local-first workspace built around three V2MOM layers (company →
manager → self), with a roadmap, a **commitment ledger**, and a **capacity
view of the delivery team and the PM** attached to that cascade. Every
commitment records its wording, strength, conditions and delivery bar. Every
hour on the board traces to the measure it serves, or is drawn as time outside
the V2MOM. Every change is an event with a mandatory reason. Health, flags,
diffs and the timeline scrubber are all *computed* from the event log, not
stored alongside it.

The outcome that matters most: when "LLM publishing capability — POC in
pre-prod" starts being described as "a missed production release", the app
has already turned that edge red and can show the exact event where the
wording changed. It can show that the team's P3 hours were fully allocated
before the request arrived. And it hands the PM a calm, professional 1:1 brief
covering both.

---

## 2. The V2MOM at the centre

The information architecture puts the V2MOM first:

```
Left rail
  Cascade            ← home: company → manager → me → roadmap
  My V2MOM
  Manager V2MOM
  Company guidance
  Capacity           ← Team · Me   (the existing board, seen through the V2MOM)
  Roadmap
  Commitments
  Meetings
  Flags
  Audit log
  Scenarios
```

- **Cascade is the home screen.** The capacity board is one click away, never
  the landing page.
- **Every cascade node carries a capacity strip:** hours allocated to it this
  period, who they come from, and whether that is enough. Capacity is visible
  where the alignment question is asked, not only on its own screen.
- **The capacity board can be coloured by V2MOM method.** One toggle turns
  "who is busy" into "what the team's time is buying".
- **The 1:1 brief is organised by V2MOM measure**, with a capacity line under
  each one.

---

## 3. Capacity as a V2MOM capability

Capacity answers five questions. Each maps to a view and, where it can be made
exact, a flag.

| # | Question | For | Where it shows | Flag |
|---|---|---|---|---|
| 1 | Where do our hours go, by method and measure? | Team | Capacity strip on each node; board coloured by method; rolled up the cascade | — |
| 2 | Does the time follow the ranking? | Team | Method list: rank beside share of hours | `rank_capacity_mismatch` |
| 3 | Which measures we own have no hours behind them? | Team + Me | Red dot on the measure; Flags inbox | `unfunded_measure` |
| 4 | Is there room for more this period? | Team + Me | Period headroom per person; the tradeoff gate | `capacity_over_alloc`, `scope_creep_no_tradeoff` |
| 5 | What is this costing the PM? | Me | PM row, overtime ledger, PM time by measure | `pm_overtime_run` |

**Two lenses, one engine.**

- **Team** covers the people the PM delivers with: engineers, design, content.
  It is the existing squad board, widened by role, with period grouping on top
  of weeks.
- **Me** covers the PM's own row: discovery, definition, stakeholder time and
  1:1 prep as `pm-work` blocks, plus the overtime ledger (spec §6.3–6.5). It
  also shows PM time *by measure*, which answers "which parts of the manager's
  V2MOM are running on my evenings?"

The team total never includes the PM (existing rule, kept). A team at 20%
buffer while the PM is nine weeks over is a real state, and both have to be
visible at once.

**How hours reach the V2MOM.** No new capacity model is needed. It is a link:

```
Block ──initiativeId──▶ Initiative ──measureIds──▶ Measure ──▶ Method ──▶ V2MOM
Commitment.capacityDraw ──materialises as──▶ Blocks (tagged commitmentId)
```

Hours on an initiative with no measure link are drawn as **outside the
V2MOM**: a neutral, labelled segment, like buffer. It is never hidden and never
coloured as an alarm. Some unaligned time is normal (support, incidents). A
lot of it is a conversation, and question 1 makes that visible.

**Colour stays consistent across both halves.** Red means overcommitment on the
board and conflict in the cascade. Both mean "this cannot all be true at
once", so the single alarm colour keeps one meaning.

---

## 4. Decisions that change the source plan

Each is a deliberate deviation. The reason is stated so it can be argued with.

| # | Source plan says | This plan does | Why |
|---|---|---|---|
| D1 | New Next.js + Tailwind app | **Cascade is built in this repo with Vite, React, Zustand, Immer and the existing CSS tokens. The Capacity Timeline board becomes its capacity capability** | Cascade is private and local-first, so there is no server for Next.js to render on. The repo already has the architecture the source plan asks for (pure domain rules, a store that applies them, UI that renders them), the capacity engine that §3 needs, and an append-only log with the same philosophy. |
| D2 | JSON files per entity, `activity.jsonl` as a side log | **Event log is the source of truth; state is `fold(events)`** | The diff since the last 1:1, the timeline scrubber, scenarios and an audit trail that can't be rewritten all come free from this. Bolted on later, they are painful. |
| D3 | Flags stored in `flags/*.json` and on each commitment | **Flags are derived** by pure rule functions. Only *resolutions* are stored (as events with a reason) | A stored flag goes stale when the data changes. A derived flag can't. A resolved flag re-opens if the evidence behind it changes. |
| D4 | Health "conflict if same theme + incompatible bar or date" | **Health runs only over explicit links** | "Same theme" is undefined and would need an LLM, which makes the core signal unpredictable. With explicit links, every red edge can be explained. Theme matching can come later as *proposed* links. |
| D5 | `Status` includes `soft_committed` beside `strength` | **Drop `soft_committed`** | Two fields that record the same fact will eventually disagree, and that disagreement is exactly the ambiguity the product exists to prevent. |
| D6 | `conditions: string[]` | **`Condition[]`** with `met`, `metAt`, `evidence` | Soft hardening can only be detected if the app knows whether the conditions were ever met. |
| D7 | Periods are free strings | **`Period` entity** with start and end week | Capacity maths can't run on a label like "P3". Periods map onto the existing `WeekStart` model. |
| D8 | Capacity draws computed separately | **Draws materialise as board blocks** tagged `commitmentId`. The tradeoff gate reuses `cellCapacity` | One capacity engine, one board. "Name what moves out" is the same move as triage question 5 ("what are we cutting"). |
| D9 | Private evidence + screenshots | **Add a post-1:1 recap** the PM sends themselves | A recap the manager received and didn't correct is the strongest record against reframing (§9). |
| D10 | Activity log requires a reason | **…and is hash-chained** (WebCrypto SHA-256) | Makes "edited later" detectable. It is tamper-*evidence* for the PM's own confidence, not proof to anyone else, and the UI says so. |
| D11 | Roadmap links to measures; capacity is per person | **Initiatives link to measures (`measureIds`)**, so hours roll up the cascade | This link is what makes capacity a V2MOM capability rather than a separate tool (§3). |

Unchanged and endorsed: private by default, stay thin, regex before LLM, visual
first, tree-list over mind map, colour only for health, no multiplayer, no
OAuth in v1, and the golden-path seed.

---

## 5. Code layout

```
src/cascade/domain/    pure, no React — the product's rules
  types.ts             V2MOM, Measure, Commitment, Period, Meeting, Scenario…
  events.ts            Event union, append(), fold(), snapshotAt(), hash chain
  health.ts            edge + node health from explicit links
  capacity.ts          hours by measure/method, rank share, unfunded, headroom
  flags.ts             one pure function per flag type → Flag[]
  lexicon.ts           delivery-bar words, phrase patterns, vague verbs
  extract.ts           Tier 1 regex extraction from transcript text
  diff.ts              diffBetween(events, from, to)
  tradeoff.ts          canAddCommitment() → RuleResult with remedies
  brief.ts             1:1 brief + post-1:1 recap markdown
  seed.ts              the golden-path story, as events
src/cascade/state/     store + IndexedDB repository + import/export
src/cascade/ui/        shell, rail, cascade tree, capacity strip, drawer, O3O…
src/domain/            existing capacity engine: cellCapacity, overtimeLedger, rules
src/ui/                existing board, mounted under Capacity → Team / Me
```

`src/cascade/domain/capacity.ts` does no arithmetic of its own on weeks. It
groups the existing engine's output by measure. There is exactly one place
where hours are added up.

**The architectural rule carries over:** every flag, health rule and gate is a
pure function with tests next to it. A rule that exists only in a component is
a bug.

**Shared types.** `Person.role` widens from `'engineer' | 'pm'` to add
`'design' | 'content' | 'other'`. The team lens includes every non-PM role; the
existing engineer-only rollup becomes a filter. `Initiative` gains
`measureIds: string[]`. `RuleResult` and `Remedy` are reused as they are, with
new remedy ids.

**Routing.** `react-router` with `HashRouter`, so every entity has a deep link
(`#/node/m-12`) that the inbox and ask panel can jump to.

**Persistence.** IndexedDB via `idb` behind a repository interface (spec §10).
There are two stores: `events` (exported by default) and `private`
(transcripts and notes). The 1:1 presentation route never reads `private`, and
export leaves it out unless the PM opts in.

---

## 6. Schema deltas from the source plan

Only the differences are listed. Everything else in source §3 stands.

```ts
interface Period { id: string; label: string; startWeek: WeekStart; endWeek: WeekStart }

type DeliveryBar = 'decision' | 'doc' | 'poc' | 'preprod' | 'prod' | 'unknown'; // ordered

interface Condition {
  id: string; text: string; met: boolean; metAt?: string; evidence?: EvidenceRef;
}

interface Commitment {
  // …source fields, with:
  conditions: Condition[];         // D6
  aliases: string[];               // for matching meeting text
  periodId: string;                // D7
  capacityDraw: CapacityDraw[];    // materialised as blocks (D8)
  acknowledgement?: { by: string; at: string; evidence: EvidenceRef };
}

interface Measure {
  // …source fields, with:
  parentMeasureIds: string[];      // cross-layer edges (D4)
  impliedBar: DeliveryBar;         // derived from text via lexicon; overridable
  reviewedAgainstParentAt?: string;
}

interface Initiative { /* existing */ measureIds: string[] } // D11

interface MeasureCapacity {        // derived, never stored
  measureId: string; periodId: string;
  teamHours: number; pmHours: number;
  byPerson: Record<PersonId, number>;
  shareOfTeam: number;             // 0–1 of allocated team hours in the period
}

interface FlagResolution {         // flags themselves are derived (D3)
  flagKey: string; fingerprint: string;
  outcome: 'acknowledged' | 'fixed' | 'not_an_issue';
}

interface Scenario { id: string; name: string; baseEventId: string; events: CascadeEvent[] }
```

Every event carries `{ id, at, actor, reason, prevHash, hash }` and a typed
payload. `append()` rejects an empty reason. That is the single place the rule
is enforced, and it is tested.

---

## 7. Rules, made testable

Each rule is a pure function of `(state, period, today)` returning `Flag[]`,
with at least one fixture where it fires and one where it doesn't.

### Alignment

| Flag | Fires when | Severity |
|---|---|---|
| `missing_owner` | Measure or method has no owner, or only `unassigned` | warning |
| `missing_conditions` | Commitment is `soft` with no conditions, or `hard` with a due date but no delivery bar | warning |
| `poc_vs_prod_ambiguity` | A commitment with bar ≤ `preprod` links to a measure whose `impliedBar` is `prod`, **or** meeting text in the period matches both an alias and a prod term | critical |
| `soft_hardening` | Commitment is `soft` or has an unmet condition, and a later event or meeting treats it as hard (due date added, strength flipped without every condition met, or prod/deadline language near an alias) | critical |
| `v2mom_drift` | Parent measure text or target changed after the child's `reviewedAgainstParentAt` | warning |
| `company_guidance_gap` | Manager or self measure links to no company item, or to one with an incompatible bar or period | warning |
| `deadline_shift` | Due date or period changed ≥ 2 times, or once without evidence | warning |
| `vague_verb` | Statement uses explore / look into / see if / try to / align on, with no owner or no date | info |
| `orphan_work` | Roadmap item links to no measure | info |
| `missing_log` | A meeting names a roadmap item or alias that has no commitment | info |
| `denied_seen_artifact` | Denial phrase near an alias whose commitment was already shared or reported in status | warning |

### Capacity

| Flag | Fires when | Severity |
|---|---|---|
| `capacity_over_alloc` | A person's allocated hours in the period exceed plannable capacity (absence subtracted, spec §6.2) | critical |
| `scope_creep_no_tradeoff` | Work was added to a period already ≥ 100% allocated, and no `tradeoff.accepted` event references it | critical |
| `unfunded_measure` | A measure owned by the PM or the team, active in the period, has 0 team hours and 0 PM hours linked | warning |
| `rank_capacity_mismatch` | A method gets fewer team hours than a method ranked ≥ 2 places below it, and the gap is ≥ 10% of the period's team hours | warning |
| `unaligned_time` | Team hours outside the V2MOM exceed 25% of allocated team hours in the period | info (warning above 40%) |
| `pm_overtime_run` | The PM's `overtimeLedger.currentStreak` ≥ 3 weeks | warning |

Thresholds live as named constants beside the rules, like
`LOW_CONFIDENCE_HORIZON_DAYS` does today.

**Edge health** is the worse of two things: whether the link itself is
compatible (bar and period), and the most severe unresolved flag on the child.
Edges are grey by default, amber for a warning and red for a critical flag.
Clicking an edge opens the flags behind its colour, each with its implication,
evidence and a suggested move.

**Flag language is professional by design.** Titles are fixed templates that
never make a person the subject of a failure: "The Q3 measure describes a
production release; the linked commitment is a pre-prod POC", not "Manager
moved the goalposts".

---

## 8. The golden path, as a script

The seed is a sequence of dated events, so the scrubber can replay it. The
demo doubles as the end-to-end test: a Playwright script walks it at the end
of each milestone, and each milestone adds steps.

| Seed event (relative) | What the app shows |
|---|---|
| −30w: Company guidance "AI-assisted content at scale" | Root of the cascade |
| −28w: Manager V2MOM, 12 methods/measures, 3 unassigned. M-7 "Deliver LLM publishing capability" | Unassigned owners amber |
| −27w: Roadmap Q1 "LLM publishing capability", bar `unknown`; the team's Q1 capacity already allocated before the PM started | Capacity strip on M-7 shows hours committed before the PM's first day |
| −26w: Kickoff. Commitment C-1: *soft*, bar `poc`, pre-prod, condition "pending eng estimates" (never met) | Ledger entry with original wording and source |
| −25w…−14w: Twelve weekly statuses, "POC in pre-prod" | Evidence trail on C-1 |
| −12w: Manager edits M-7 → "Launch LLM publishing to production" | **Edge M-7 → C-1 red**; self measure amber (drift) |
| −8w…now: PM row over sustainable hours for nine straight weeks, mostly discovery on M-7 | `pm_overtime_run`; the Me lens shows which measure the evenings went to |
| P3: Manager's #2-ranked method receives 6% of team hours; the #5 method receives 31% | `rank_capacity_mismatch` |
| P3: Self measure "Publish content quality rubric" has no hours | `unfunded_measure` |
| −2w: 1:1 transcript "this should be in prod by now" | `soft_hardening` critical, with the edit, 12 status excerpts and the unmet condition |
| −1w: "Can we just add Project X to P3?" (designer + 2 engineers at 100%) | `scope_creep_no_tradeoff`; the gate offers four remedies |
| today | 1:1 brief by measure: C-1 as committed, the M-7 wording change, P3 capacity and the tradeoff, the rank mismatch as one talking point |

---

## 9. The post-1:1 recap

The source plan protects the PM with private evidence. That helps them
remember, but in a disagreement it is weak: one person's notes, produced at
the moment they are needed. The strongest record is one the manager has
already received. After a 1:1 is logged, the app drafts a short recap for the
PM to send themselves:

```
Thanks for the time today. What I took away:
- LLM publishing: continuing as a POC in pre-prod this period. A production
  release depends on eng estimates, which we don't have yet.
- Project X: the team is fully allocated in P3. Happy to take it on if Search
  relevance moves to P4 — let me know which you'd prefer.
Let me know if I've got any of this wrong.
```

Marking it as sent writes `share.exported`. The app never sends anything itself.

---

## 10. Milestones

Sizes are relative (S ≈ 1–2 days, M ≈ 3–5, L ≈ 1–2 weeks). Each milestone ships
usable before the next starts. Capacity moves up to C2 because it is a core
capability, and because it needs only a link (D11), not the ledger.

### C0 — Foundation · M
- Types, event log (append, fold, snapshotAt, hash chain), IndexedDB repository, JSON export/import
- `Period` mapped onto weeks; `Person.role` widened; `Initiative.measureIds`
- Seed as events
- App shell: rail with the Cascade home and empty states that explain the idea; the existing board mounted under Capacity; `HashRouter`
- **Tests:** fold is deterministic; empty reason is rejected; the hash chain detects an edited event; export → import round-trips; existing tests untouched
- **Exit:** the app opens on the cascade; the board is reachable from the rail and works exactly as it does today

### C1 — The cascade · L
- V2MOM CRUD for company / manager / self; owners including unassigned
- Measure ↔ parent measure links; `impliedBar` from the lexicon
- Tree-list cascade with health edges and red dots; node drawer (five sections, links, flags, audit trail)
- Edits with mandatory reason and an impact preview; "reviewed against parent" to clear drift
- Flags: `missing_owner`, `v2mom_drift`, `company_guidance_gap`, `orphan_work`
- **Exit:** click the amber M-7 → self-measure edge and see the wording change, its date and its reason

### C2 — Capacity through the V2MOM · M
- Link initiatives to measures from the board's block detail and from the node drawer
- `capacity.ts`: hours by measure and method per period, share of team hours, headroom, time outside the V2MOM
- **Capacity strip on every cascade node**; board toggle "colour by method"; period grouping over weeks
- **Team lens** (all non-PM roles) and **Me lens** (PM row, overtime ledger, PM time by measure)
- Method list showing rank beside share of hours
- Flags: `capacity_over_alloc`, `unfunded_measure`, `rank_capacity_mismatch`, `unaligned_time`, `pm_overtime_run`
- **Exit:** from the cascade, the PM can see that the manager's #2 method gets 6% of team hours, that their own rubric measure has none, and which measure their nine weeks of overtime went to

### C3 — Ledger, 1:1 mode and the tradeoff gate · L
- Commitment ledger: strength, conditions, delivery bar, aliases, links to measure/roadmap/Jira key (URL only); roadmap CRUD and CSV/Markdown import
- `capacityDraw` materialises as blocks; `canAddCommitment` refuses additions to a full period and offers remedies: *move X out*, *slip*, *lower the bar*, *add capacity*. Choosing one writes `tradeoff.accepted`
- Flags: `missing_conditions`, `poc_vs_prod_ambiguity` and `soft_hardening` (structured half), `deadline_shift`, `scope_creep_no_tradeoff`
- `diffBetween`; **1:1 presentation mode** as a separate route that can't reach `private` (a test checks this); the 1:1 brief grouped by measure with capacity lines; the post-1:1 recap
- **Exit:** the red M-7 → C-1 edge explains the POC-vs-prod conflict; adding Project X to P3 is refused with four concrete remedies; the brief carries both and contains nothing from a transcript

### C4 — Meetings ingest · M
- Paste or drop plain text, Otter `.txt` or Gemini recap files; dedupe by date ± 1 day and title
- Tier 1 regex extraction; phrase lexicon plus user patterns; every extraction is a proposal the PM promotes
- Flags: text halves of `soft_hardening` / `poc_vs_prod_ambiguity`, `vague_verb`, `missing_log`, `denied_seen_artifact`
- Transcripts in `private`, behind a lock; excerpts capped at 280 characters
- **Exit:** pasting the seeded 1:1 transcript raises the critical flag, with status excerpts as evidence

### C5 — Scenarios, views and the scrubber · M
- Scenario sandbox: a fork is folded in memory; "designer −8h/week" shows the broken commitments *and* the measures left unfunded; only "promote tradeoff" writes to the main log
- Timeline scrubber (`snapshotAt`); matrix (manager × my measures); swimlane; focus/lineage; semantic zoom
- **Exit:** scrubbing to −13w shows M-7 green and −12w shows it red; a scenario shows its capacity knock-on effects without touching live data

### C6 — Intelligence and polish · M
- LLM adapter, off by default, with a preview of what leaves the browser; Tier 1 extraction by LLM uses the regex output format; Tier 2 runs only on flags
- Ask panel: without a key, structured search. With a key, answers are cite-only, and a domain validator drops any segment without a valid entity id
- PNG export of the cascade and 1:1 view; notification log; optional encrypted export
- **Exit:** every box in source §14 is ticked by the golden-path run

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| **Employer data policy** on sending transcripts to an LLM with a personal key | LLM off by default; C0–C5 need none; preview every call; README advises checking policy |
| **Recording consent** | The app ingests transcripts but never records |
| **Reads as a dossier** | Neutral flag templates; 1:1 mode is a separate route; private notes stay private |
| **Capacity data is only as good as the board**, and a stale board makes capacity flags wrong | Show "last updated" on each capacity strip; fold a "link and update hours" step into the existing Friday reset (spec §F8); rough hours are fine by design |
| **Linking effort**, since measures without links show as unaligned time | Unlinked time is visible but neutral; the board and the drawer both offer one-click linking |
| **Data loss** on a work laptop | Export reminder after 7 days; a single-file export that re-imports cleanly |
| **Regex noise** | Extractions are proposals; each hit shows its matched text |

---

## 12. Open questions

Settled in rev. 2: the V2MOM is the product's main theme; capacity is one of
its core capabilities; the app is **Cascade**, with the Capacity Timeline board
inside it.

1. **Who counts as the delivery team?** Default: everyone on the board except
   the PM, including design and content. Should anyone outside the squad (for
   example a shared data scientist) appear with a partial allocation?
2. **Does a commitment's capacity draw go through the triage gate?**
   Recommendation: the tradeoff answer satisfies triage question 5 and the other
   four are pre-filled from the commitment, so it stays one gate.
3. **Rank-mismatch threshold.** 10% of period team hours is a starting guess;
   tune it on real data.
4. **Skip-level layer.** Cut from v1 unless there is a skip-level V2MOM to load.

---

## 13. First PR (C0), concretely

- Add `idb` and `react-router-dom`
- `src/cascade/domain/{types,events,seed}.ts` with tests
- `src/cascade/state/{repository,store}.ts`
- `src/cascade/ui/{Shell,Rail,EmptyState}.tsx`; Cascade is the home route; the existing `App` content moves under `#/capacity` unchanged
- `npm test`, `npm run typecheck` and `npm run build` pass
