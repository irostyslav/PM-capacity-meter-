# Capacity Timeline — Product Spec (v1)

**Status:** Draft for build
**Owner:** PM (single-user surface)
**Last updated:** 2026-09-17

---

## 1. Summary

**Capacity Timeline** is a visual capacity planner for product managers that makes
overcommitment visible *before* it happens and makes thinking a protected,
first-class activity.

It is not a task tracker. It does not care whether a ticket is done. It cares
about one question: **for each engineer, for each week, how much of their
capacity is already spoken for — and how confident are we that the answer is
right?**

---

## 2. Problem

Four failures compound in most PM-led squads:

1. **Work is scheduled before it is understood.** A request arrives, gets a
   nod, and lands on a plan. Nobody has written down what "done" means, so the
   estimate is fiction and the schedule inherits that fiction.
2. **Engineers wait for perfect specs and stop thinking.** When the PM is the
   sole source of definition, engineers become order-takers. Ambiguity gets
   escalated back to the PM instead of being resolved at the source, which
   creates a dependency loop: the PM is the bottleneck for the thinking that
   would relieve the PM.
3. **Capacity is treated as a 100% resource.** Every week is planned full. There
   is no slack, so every surprise — an incident, a sick day, a discovery — is a
   crisis rather than an absorption.
4. **Existing tools track tasks, not capacity.** Jira, Linear, and friends model
   items and states. They model neither the shape of a person's week nor the
   PM's own time, and they offer no mechanism to refuse or defer work.

### What already exists and why it doesn't solve this

| Tool | Models | Missing |
| --- | --- | --- |
| Jira / Linear | Tickets, states, sprints | Per-person weekly capacity as a first-class object; no buffer concept |
| Gantt tools (MS Project, TeamGantt) | Dependencies, critical path | Assumes work is understood; no triage gate; no confidence |
| Resource managers (Float, Runn) | Utilization %, billable hours | Optimizes for *fullness*; treats 100% as success, which is the bug |
| Spreadsheets | Anything | No enforcement — nothing stops you from overcommitting |

The gap: **no tool refuses to let you do the wrong thing.** Capacity Timeline's
differentiator is enforcement — gates that block, not warnings you can ignore.

---

## 3. Target user

**Primary:** Solo PMs or small PM teams (1–3) managing multi-initiative
engineering squads of roughly 4–12 engineers.

**Explicitly designed for visual thinkers and people with ADHD.** This is a
design constraint, not a marketing line. It means:

- State is *seen*, not remembered. Every number on screen is also a shape, a
  width, or a color.
- Focus Mode exists to kill peripheral load on demand.
- The weekly reset is a ritual with a prompt, not a habit you must self-start.
- No feature requires holding a prior screen in working memory to interpret the
  current one.
- Destructive or committing actions are always reversible or confirmable.

**Secondary (not built for in v1):** engineering managers, tech leads. They may
read the timeline; v1 has no multiplayer.

### Anti-personas

- Agency/consultancy resource managers optimizing billable utilization.
- Programs needing cross-team leveling or dependency math.
- Teams wanting a system of record for work items.

---

## 4. Principles

These decide arguments during build.

1. **Buffer is a feature, not leftover.** Unallocated capacity is drawn in its
   own color and is always visible. Empty space is never rendered as empty.
2. **Gates over warnings.** Where the product has an opinion, it blocks. A
   dismissible toast is not enforcement.
3. **Thinking is schedulable work.** Spikes occupy real capacity and produce a
   written artifact. A week spent thinking is a week well spent.
4. **Confidence is part of a commitment.** An estimate without a confidence
   level is an unfinished thought.
5. **Every refusal is recorded.** What got cut, who asked, and when, is a
   first-class searchable artifact — because the argument always comes back.
6. **Nothing reaches the timeline unexamined.** Triage is the only door.

---

## 5. Core loop

```
Request arrives
      │
      ▼
[1] Triage checklist (5 questions) ── fails ──▶ Declined (logged)
      │ passes
      ├── fuzzy ──▶ [2] Parking Lot ── needs one-line definition ──┐
      │                                                            │
      │                            graduates ◀───────────────────-─┘
      ▼
[3] Sized? ── no ──▶ Spike (2–5 days, timeboxed, output = written brief)
      │ yes                                     │
      ▼                                         ▼
[4] Committed block on timeline  ◀── brief informs estimate
      (carries confidence: High / Med / Low)
      │
      ▼
[5] Work happens → actuals logged → burn-down updates live
      │
      ▼
[6] Friday weekly reset: mark what happened, rebalance, protect next week's buffer
      │
      └──▶ back to top
```

---

## 6. Domain model

Names here are contractual — use them in code, UI copy, and analytics.

### Engineer
| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `name` | string | |
| `color` | hex | Row accent, distinct from initiative colors |
| `weeklyCapacityHours` | number | Default 30, not 40. See §6.1 |
| `active` | bool | Inactive engineers hide from the canvas, keep history |

#### 6.1 Why 30, not 40
The default assumes ~25% of a week is meetings, support, review, and context
switching. A user can change it, but the default encodes the thesis: **a week
was never 40 hours of project work.** Changing it to 40 shows an inline note
explaining what that implies.

### Initiative
| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `title` | string | |
| `color` | hex | From a fixed 8-color palette |
| `status` | enum | `parked` \| `active` \| `done` \| `declined` |
| `estimatedHours` | number \| null | Rolls up from blocks |
| `triageId` | uuid | Required for anything not `parked` |
| `definitionOfDone` | string | Required to graduate from the Parking Lot |

### Block
A contiguous allocation of one engineer's time, on one initiative, in one week.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `engineerId` | uuid | |
| `initiativeId` | uuid | |
| `weekStart` | ISO date (Monday) | Blocks do not span weeks; multi-week work = multiple linked blocks |
| `hours` | number | Drives rendered width |
| `confidence` | enum | `high` \| `medium` \| `low` |
| `kind` | enum | `delivery` \| `spike` \| `protected` |
| `actualHours` | number | Default 0, updated by logging |

`protected` blocks are PM-declared no-touch time (thinking, writing, discovery).
They consume capacity and cannot be auto-rebalanced away.

### TriageRecord
The five answers, timestamped, immutable once submitted. See §7.2.

### ParkingLotItem
An Initiative with `status = parked` plus a `oneLineDefinition` field that must
be non-empty to graduate.

### Spike
A Block with `kind = spike`, plus:
| Field | Type | Notes |
| --- | --- | --- |
| `timeboxDays` | int | Constrained 2–5 |
| `brief` | rich text | The acceptance criterion. Not code. |
| `briefSubmittedAt` | timestamp \| null | |

### CommitmentLogEntry
| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `timestamp` | timestamp | |
| `requester` | string | Who asked |
| `initiativeId` | uuid \| null | |
| `action` | enum | `committed` \| `declined` \| `deferred` \| `cut` \| `rebalanced` |
| `whatWasCut` | string | Free text — the tradeoff |
| `note` | string | |

Log entries are append-only. Corrections are new entries referencing the old.

### WeeklyReset
One record per week: what shipped, what slipped, buffer before/after, notes.

---

## 7. Features

Build order is the order below. Each ships usable before the next starts.

---

### F1 — Timeline Canvas

**The product's spine.** Everything else hangs off it.

**Layout**
- Rows = engineers. Columns = ISO weeks (Monday-start).
- Default viewport: 8 weeks, horizontally scrollable, "today" column visually
  marked.
- Each cell renders that engineer's blocks for that week as horizontal segments
  whose widths are proportional to `hours` against `weeklyCapacityHours`.
- **Remaining capacity renders as an explicit Buffer segment** in a reserved
  neutral color (never a background, never absence). It carries a label with
  remaining hours.

**Interactions**
- Drag a block between cells (engineer and/or week). Drop is validated (§F5).
- Resize a block horizontally to change `hours`, snapped to 2-hour increments.
- Click a block → detail panel (initiative, confidence, actuals, spike brief).
- Drag from the Parking Lot onto the canvas — blocked unless the item has
  graduated (§F3).

**Overcommit rendering**
When allocated hours exceed capacity, the cell does **not** silently grow. It
renders an overflow segment in a high-contrast alert treatment, the row shows a
persistent marker, and the cell displays `+Xh over`. Overcommit is allowed but
never quiet — the product's job is visibility, not obstruction, for work already
under way.

**Acceptance criteria**
- [ ] Buffer is visible in every cell where capacity remains, with hours labeled.
- [ ] Dragging a block to another engineer/week updates both source and target
      cells and their buffers immediately, with no reload.
- [ ] Overcommitted cells are distinguishable at a glance from 3 feet away.
- [ ] Every drag is undoable (Cmd/Ctrl+Z) for the session.
- [ ] Keyboard alternative exists for every drag operation (select block, arrow
      keys to move, Enter to drop).
- [ ] Canvas renders 12 engineers × 12 weeks at 60fps during drag.

---

### F2 — Triage Intake

**No initiative reaches the timeline without passing through here.** This is a
hard gate, enforced in the data layer, not just the UI.

**The five questions** (all required; free text unless noted):
1. **What problem does this solve, for whom?**
2. **What breaks if we don't do this in the next 90 days?**
3. **How will we know it worked?** (the success signal)
4. **Is this understood well enough to size?** *(yes / no)* — `no` routes to the
   Parking Lot; `yes` allows direct scheduling.
5. **What are we cutting to make room?** *(required; "nothing — buffer absorbs
   it" is a valid answer and is recorded as such)*

**Behavior**
- Answers are stored as an immutable `TriageRecord` and surfaced in the
  initiative detail panel forever.
- Q5's answer auto-drafts a `CommitmentLogEntry` (§F7).
- Answering Q4 = `no` disables the "schedule" action entirely; the only exit is
  the Parking Lot.
- A triage can be **declined** at any point. Declined initiatives are logged,
  searchable, and never deleted — the record of "we said no to this in March"
  is the asset.

**Acceptance criteria**
- [ ] No code path creates a schedulable Initiative without a completed
      `TriageRecord`.
- [ ] Partial triages persist as drafts and can be resumed.
- [ ] Triage answers are visible from the block detail panel in one click.
- [ ] Completing triage takes under 90 seconds for a well-understood request.

---

### F3 — Parking Lot

A visually separate lane below (or beside) the canvas holding everything too
fuzzy to schedule. **Not a backlog** — a backlog is infinite and demoralizing.
This is a holding pen with an exit condition.

**Behavior**
- Items enter from Triage Q4 = `no`.
- Each item shows a prompt: *"In one line: what would we actually be building?"*
- **Graduation gate:** `oneLineDefinition` must be non-empty AND the item must
  have either a sizing estimate or a scheduled spike before it can be dragged to
  the canvas. Attempting to drag an ungraduated item shows the unanswered
  question rather than an error.
- Items display age in weeks. At 8 weeks an item is flagged **stale** with a
  prompt to define, spike, or decline it.
- Declining from the Parking Lot writes to the Commitment Log.

**Acceptance criteria**
- [ ] Ungraduated items cannot land on the canvas by drag, keyboard, or API.
- [ ] Item age is visible without interaction.
- [ ] Stale items are visually distinct and prompt an explicit decision.
- [ ] The Parking Lot can be collapsed but its item count stays visible.

---

### F4 — Spike Tickets

The mechanism that breaks the PM/engineer dependency loop.

**Rules**
- A spike is timeboxed to **2–5 days**. The UI offers no other values.
- A spike occupies real capacity on the timeline (`kind = spike`), rendered with
  a distinct pattern (e.g. hatched fill) so thinking time is visible as work.
- **Acceptance criteria is a written brief, not code.** The spike's completion
  form asks for prose, with a template:
  - What we learned
  - What we'd build
  - Rough size (S/M/L or hours)
  - What's still unknown
  - Recommendation: build / don't build / spike again (max once)
- A spike cannot be marked complete without a submitted brief.
- On completion, the brief attaches to the initiative and pre-fills the estimate
  for any block created from it.
- **Engineers can create spikes.** A shareable spike-request link lets an
  engineer propose a spike without PM mediation; it lands in the PM's triage
  queue pre-marked as engineer-initiated. This directly serves the success
  metric in §12.

**Acceptance criteria**
- [ ] Timebox input accepts only 2, 3, 4, or 5 days.
- [ ] Completing a spike without a brief is impossible.
- [ ] Spike blocks are visually distinct from delivery blocks at a glance.
- [ ] Spike briefs are searchable alongside the Commitment Log.
- [ ] Engineer-initiated spikes are tagged as such and counted.

---

### F5 — Confidence Scoring

Every block carries `high`, `medium`, or `low`.

**Definitions shown inline at selection time:**
- **High** — we've built something like this; estimate is within ±20%.
- **Medium** — we understand the shape; estimate could be off by half.
- **Low** — we're guessing.

**The rule: low-confidence blocks cannot be scheduled more than two weeks out.**

Rationale: a low-confidence commitment far in the future is a promise made
entirely of hope, and it will be treated as real by everyone downstream. If it
matters and it's fuzzy, it needs a spike first.

**Enforcement**
- Dropping a `low` block beyond `today + 14 days` is rejected at drop time with
  an inline explanation and two offered actions: *"Schedule a spike"* or
  *"Move to Parking Lot."*
- Raising confidence requires a reason if the block hasn't changed otherwise —
  the reason is logged. This prevents confidence laundering under deadline
  pressure.
- Confidence is rendered on the block itself (dot, border weight, or opacity —
  **not color alone**, which must remain initiative identity).

**Acceptance criteria**
- [ ] Low-confidence drops beyond the 2-week horizon are rejected in UI and data
      layer.
- [ ] The rejection offers a next action, never just a refusal.
- [ ] Confidence is legible without hovering and without relying on hue.
- [ ] Confidence upgrades are logged with reason and timestamp.

---

### F6 — Burn-down

Estimated vs. actual hours, per initiative, live.

**Views**
- **Per-initiative:** cumulative estimated line vs. actual line across weeks,
  with remaining-to-estimate.
- **Inline on the block:** a thin fill bar showing `actualHours / hours`. Past
  100%, the bar overflows in the alert treatment.
- **Squad roll-up:** total committed vs. total capacity vs. buffer, for the
  visible window.

**Logging actuals**
Low friction is the entire game here; if logging is a chore, this feature dies.
- One-click "log time" on any block, defaulting to the block's planned hours for
  the elapsed period.
- The weekly reset (§F8) batch-prompts for any unlogged blocks.
- Actuals are estimates too. Copy says "roughly" everywhere. No timers.

**Acceptance criteria**
- [ ] Burn-down updates within one interaction of logging actuals — no refresh.
- [ ] Every chart is readable in both light and dark themes, and does not encode
      meaning in hue alone.
- [ ] Logging a week of actuals for one engineer takes under 30 seconds.
- [ ] Estimate-vs-actual variance per initiative is exportable as CSV.

---

### F7 — Commitment Log

**Who asked, when, what was cut.** Searchable, append-only, permanent.

Entries are written automatically by: triage completion (Q5), declines,
Parking Lot graduations and rejections, rebalances during weekly reset, and any
block deletion. Manual entries are also allowed.

**UI**
- Reverse-chronological list with full-text search across requester, initiative,
  and the `whatWasCut` text.
- Filters: date range, requester, action type, initiative.
- Every entry links to the initiative and, where relevant, the triage record.
- Export to CSV/Markdown — this is the artifact a PM brings to a planning
  meeting or a performance conversation.

**Acceptance criteria**
- [ ] Every scheduling decision produces an entry without the user writing one.
- [ ] Search returns results across 1,000+ entries in under 200ms.
- [ ] Entries cannot be edited or deleted; corrections append and reference.
- [ ] Export preserves the link between a commitment and what it displaced.

---

### F8 — Weekly Reset Ritual

A guided Friday flow. The product's heartbeat.

**Trigger:** Friday (configurable day/time) — an in-app prompt, plus optional
browser notification. Dismissible, but the badge persists until completed and
the canvas shows "reset overdue" after 3 days.

**The flow** (four screens, each skippable but tracked):
1. **What happened?** Each of this week's blocks: shipped / slipped / cut /
   still going. Bulk actions for the common case.
2. **Log actuals.** Any block with `actualHours = 0` is surfaced with its planned
   hours pre-filled.
3. **Rebalance.** Slipped work is offered for next week; the app shows the
   resulting buffer per engineer *before* confirming, and flags any engineer
   whose next-week buffer would fall below threshold.
4. **Protect the buffer.** Explicit confirmation step. Default target: **20% of
   each engineer's weekly capacity left unallocated.** If an engineer is below
   it, the app names them and asks what moves out. Proceeding anyway is allowed
   and is logged as a deliberate choice.

The reset writes a `WeeklyReset` record. Over time these become the honest
history of what the squad actually does versus what it planned.

**Acceptance criteria**
- [ ] The full ritual completes in under 5 minutes for a 6-engineer squad.
- [ ] Buffer impact is shown *before* each rebalance is confirmed.
- [ ] Below-threshold buffer requires an explicit acknowledgement, logged.
- [ ] A skipped reset is visible on the canvas, not silently forgotten.
- [ ] Reset records are browsable as a history.

---

### F9 — Focus Mode

One keystroke (`F`) hides everything except the current week's blocks.

- Future and past columns collapse away; Parking Lot, charts, and navigation
  chrome hide.
- Remaining: this week's rows, blocks, buffer, and a single "log time" affordance.
- Escape or `F` restores the previous view and scroll position exactly.
- The mode persists across reloads until exited.

This is an accessibility feature for the target user, not a gimmick. It exists
so the canvas can be looked at without the rest of the quarter shouting.

**Acceptance criteria**
- [ ] Toggle is instant (<100ms) and restores exact prior scroll/selection.
- [ ] No horizontal scrolling in Focus Mode at 1280px and above.
- [ ] Mode survives reload.
- [ ] Screen-reader announces entry/exit and the reduced content set.

---

## 8. Cross-cutting requirements

### Accessibility (non-negotiable — it is the target persona)
- Meaning is never carried by hue alone: pair every color with shape, pattern,
  label, or position.
- Full keyboard path for every drag-and-drop interaction.
- Respect `prefers-reduced-motion`: drags snap rather than animate.
- WCAG AA contrast minimum in both themes.
- Focus indicators visible on every interactive element.

### Undo
Every destructive or state-changing action is undoable within the session.
Deletions are soft for 30 days.

### Performance budget
- Initial load to interactive canvas: < 1.5s on a cold cache.
- Drag feedback: 60fps at 12 engineers × 12 weeks.
- Commitment Log search: < 200ms at 1,000 entries.

### Data safety
Local-first storage means device loss is data loss. v1 ships manual JSON
export/import from day one and prompts for an export after every 4th weekly
reset.

---

## 9. Non-goals for v1

Stated plainly so they don't creep in:

- **No cross-team resource leveling.** One squad, one PM's view.
- **No Gantt dependencies.** No critical path, no blocking arrows, no
  auto-scheduling. Dependencies live in the PM's head or in prose.
- **No Jira/Linear/Asana integration.** Not even read-only. Integration invites
  the task-tracker mental model this product exists to escape.
- **No multiplayer, real-time collaboration, or comments.** Single-user planning
  surface first. Engineers interact only via the spike-request link (§F4).
- **No time tracking.** No timers, no clock-in. Actuals are rough, by design.
- **No forecasting, velocity math, or ML estimation.**
- **No mobile-first workflows.** Responsive so the canvas is *readable* on a
  phone; editing is desktop.

---

## 10. Technical approach

| Layer | Choice | Notes |
| --- | --- | --- |
| Frontend | React + TypeScript | Strict mode; domain types mirror §6 exactly |
| Build | Vite | |
| Drag & drop | `dnd-kit` | Chosen over `react-beautiful-dnd` (unmaintained) for keyboard sensor support and custom collision detection, both of which F1/F5 require |
| State | Zustand + Immer | Small surface, easy undo via snapshot middleware |
| Charts | Recharts or lightweight custom SVG | Burn-down only; don't pull in a heavy lib for two chart types |
| Persistence | IndexedDB (via `idb`) behind a repository interface | localStorage is too small and synchronous for block-level history |
| Backend | None in v1 | The repository interface is the seam; a sync backend drops in later without touching the UI |
| Testing | Vitest + React Testing Library; Playwright for the drag/gate paths | Gates (F2, F3, F5) get tests at the data layer, not just the UI |
| Styling | CSS Modules or Tailwind — pick one, tokens either way | Color tokens must be theme-aware from day one |

**Architectural rule:** enforcement (triage gate, graduation gate, confidence
horizon) lives in the domain layer and is tested there. The UI reflects those
rules; it does not own them. Any gate that exists only in a component is a bug.

**Desktop-first, mobile-responsive:** the canvas is a desktop instrument. Below
768px it becomes a read-only week view with Focus Mode as the default.

---

## 11. Milestones

| Milestone | Contents | Usable outcome |
| --- | --- | --- |
| **M1 — Canvas** | F1 + domain model + persistence | A PM can lay out a squad's weeks and see buffer. Replaces the spreadsheet. |
| **M2 — The Gate** | F2, F3 | Nothing reaches the timeline unexamined; fuzzy work has a home. |
| **M3 — Thinking** | F4, F5 | Spikes are schedulable; low-confidence far-future work is impossible. |
| **M4 — Truth** | F6, F7 | Plans get compared to reality; decisions get a paper trail. |
| **M5 — Rhythm** | F8, F9 | The weekly ritual and the focus affordance close the loop. |

Ship M1 to real use before starting M2. The canvas alone is the riskiest
assumption — if the buffer visualization doesn't change behavior, the rest of
the spec is built on sand.

---

## 12. Success metrics

**Primary (from the brief):**
1. **Fewer than two surprise overcommitments per quarter.** Measured as: weeks
   where actual allocated hours exceeded capacity *without* a prior
   `CommitmentLogEntry` acknowledging the tradeoff. The word that matters is
   *surprise* — a logged, deliberate overcommit does not count.
2. **Engineers initiate at least one spike per month without being asked.**
   Measured directly via the engineer-initiated flag on spike requests (§F4).
   This is the loop-breaking metric: it means engineers are thinking upstream
   instead of waiting.

**Supporting signals:**
- Median weekly buffer per engineer stays ≥ 15% (target 20%).
- Weekly reset completion rate ≥ 80% of weeks.
- Median estimate-vs-actual variance narrows quarter over quarter.
- Parking Lot median age trends down (items get defined or declined, not hoarded).
- Triage completion under 90 seconds median — if it's slower, people route
  around the gate.

---

## 13. Risks and mitigations

| Risk | Why it's likely | Mitigation |
| --- | --- | --- |
| **Actuals never get logged**, so burn-down and the variance metric die | Logging is the least rewarding action in the product | Pre-filled defaults, batch logging in the weekly reset, explicit "roughly" framing, never a timer. Treat logging friction as a P0 bug. |
| **Gates get routed around** — the PM keeps a side spreadsheet for "urgent" work | Enforcement is only valuable if it's not escapable, and it will feel obstructive under pressure | Every gate offers a fast path, not just a refusal. Triage under 90s. Overcommit is *allowed but logged* rather than blocked — refusing real work is how tools get abandoned. |
| **Buffer gets eaten anyway** and 20% becomes theatre | Organizational pressure is stronger than a default | Buffer erosion is rendered as a trend across the reset history, so the pattern — not just the week — becomes visible. |
| **Single-user means the plan diverges from what the squad believes** | No multiplayer in v1 | Read-only share export (image/link) out of M4; spike-request link keeps one engineer path open. Multiplayer is the leading v2 candidate. |
| **Local-first data loss** | No backend | Export from day one, export prompts on a cadence, import path tested. |
| **Spike briefs become box-ticking** | Any required artifact can be gamed | Template with specific prompts, brief is visible on the initiative forever, "spike again" allowed only once. |

---

## 14. Open questions

1. **Multi-week work:** linked blocks (one per week) vs. a spanning object. Spec
   currently assumes linked blocks for canvas simplicity — validate during M1.
2. **Partial weeks:** how are holidays and PTO modeled? Candidate: a `protected`
   block of kind `unavailable` that reduces effective capacity. Decide in M1.
3. **Should overcommit ever hard-block?** Current answer: no — visibility, not
   obstruction, for work already under way. Revisit against metric 1.
4. **The 2-week confidence horizon** — is two weeks right, or should it scale
   with sprint length? Ship fixed at 14 days; make it configurable only if real
   use demands it.
5. **Buffer default of 20%** — a starting hypothesis. Instrument it.
