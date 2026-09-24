# Cascade — Implementation Plan

**Status:** Plan for build · 2026-09-24
**Input:** *V2MOM Alignment App — Full Build Plan* (the "source plan")
**Relationship to this repo:** Cascade is built **inside** Capacity Timeline as a
second surface, not as a separate Next.js app. §2 says why.

This document does not restate the source plan. It records what changes when
the source plan meets this codebase, turns its rules into testable conditions,
and orders the work so every milestone ends with a demo of the golden path
getting further.

---

## 1. What we are building, in one paragraph

A private, local-first workspace that holds three V2MOM layers (company →
manager → self), a roadmap, and a **commitment ledger** in which every promise
carries its wording, strength, conditions and delivery bar. Every change is an
event with a mandatory reason. Health, flags, diffs and the timeline scrubber
are all *computed* from that event log, never stored beside it. The one
outcome that matters: when "LLM publishing capability — POC in pre-prod"
starts being described as "a missed production release", the app has already
turned red on that edge, can show the exact event where the wording changed,
and can hand the PM a calm, professional 1:1 brief about it.

---

## 2. Decisions that change the source plan

Each is a deliberate deviation. The reason is stated so it can be argued with.

| # | Source plan says | This plan does | Why |
|---|---|---|---|
| D1 | New Next.js + Tailwind app | **Same repo, Vite + React + Zustand + Immer, existing CSS tokens** | Cascade is private and local-first; there is no server for Next to render on. The repo already has the exact architecture the source plan asks for (pure domain rules, a store that applies them, UI that renders them), the capacity engine §8 needs, and an append-only commitment log with the same philosophy. A second app would duplicate `Person`, capacity math and the log on day one. |
| D2 | JSON files per entity, `activity.jsonl` as a side log | **Event log is the source of truth; state is `fold(events)`** | The source plan needs a diff since last 1:1, a timeline scrubber, snapshot scenarios and an un-reframeable audit trail. All four are free if state is derived from events and painful if bolted on later. Decide this in C0 or pay for it in C5. |
| D3 | Flags stored in `flags/*.json` and on each commitment | **Flags are derived** by pure rule functions; only *resolutions* are stored (as events with a reason) | Stored flags go stale the moment underlying data changes. A derived flag cannot. A resolved flag re-opens automatically if its evidence fingerprint changes. |
| D4 | Health "conflict if same theme + incompatible bar or date" | **Health runs only over explicit links** (measure → parent measure, commitment → measure, roadmap → commitment) | "Same theme" is undefined and would need an LLM to decide, which makes the core red/amber signal non-deterministic. Linking is a few clicks and makes every red edge explainable. Theme suggestions can come later as *proposed* links. |
| D5 | `Status` includes `soft_committed` alongside a separate `strength` field | **Drop `soft_committed`.** Strength and lifecycle are orthogonal | Two fields encoding the same fact will disagree, and a disagreement between them is exactly the ambiguity the product exists to prevent. |
| D6 | `conditions: string[]` | **`conditions: Condition[]`** with `met`, `metAt`, `evidence` | "Soft hardening" is only detectable if the app knows whether the conditions were ever met. "Pending eng estimates" that was never marked met cannot silently become a hard date. |
| D7 | Periods are free strings ("P3", "FY26 Q3") | **`Period` entity** with a start and end week | Capacity math is impossible against a string. Periods map onto the `WeekStart` model already in `src/domain/weeks.ts`. |
| D8 | Capacity draws computed on their own | **Commitment draws materialise as Capacity Timeline blocks** tagged with `commitmentId`; the tradeoff gate reuses `cellCapacity` | One capacity engine, one board. The source plan's "cannot silently add; name what moves out" rule is the same move as this repo's triage Q5 ("what are we cutting"). |
| D9 | Private evidence + screenshots | **Add a post-1:1 recap** the PM sends from their own email/Slack | Private notes persuade nobody but their author. A recap the manager received and didn't correct is the strongest anti-reframing artifact there is, and it costs one paste. See §8. |
| D10 | Activity log requires a reason | **…and is hash-chained** (`prevHash` via WebCrypto SHA-256) | Cheap, and it makes "I edited that later" detectable. This is honest tamper-*evidence* for the PM's own confidence, not proof to a third party, and the UI says so. |

Unchanged and endorsed: private by default, stay thin, regex before LLM, visual
first, tree-list over mind map, color only for health, no multiplayer, no OAuth
in v1, the golden-path seed.

---

## 3. How Cascade fits the existing app

```
src/domain/            existing — capacity, weeks, rules, Capacity Timeline types
src/cascade/domain/    NEW — pure, no React
  types.ts             V2MOM, Measure, Commitment, Period, Meeting, Scenario…
  events.ts            Event union, append(), fold(), snapshotAt(), hash chain
  health.ts            edge + node health from explicit links
  flags.ts             one pure function per flag type → Flag[]
  lexicon.ts           delivery-bar words, phrase patterns, vague verbs
  extract.ts           Tier 1 regex extraction from transcript text
  diff.ts              diffBetween(events, from, to) → added/changed/dropped
  tradeoff.ts          canAddCommitment() → RuleResult with remedies
  brief.ts             1:1 brief + post-1:1 recap markdown
  seed.ts              the golden-path story, *as events*
src/cascade/state/     store slice + repository (IndexedDB) + import/export
src/cascade/ui/        rail, cascade tree, drawer, inbox, O3O mode, meetings…
src/ui/                existing board — becomes the "Capacity" rail destination
```

**The architectural rule carries over unchanged:** every flag, health rule and
gate is a pure function in `src/cascade/domain/` with tests next to it. A rule
that exists only in a component is a bug.

**Shared types.** `Person.role` widens from `'engineer' | 'pm'` to add
`'design' | 'content' | 'manager' | 'other'`. The existing squad rollup keeps
filtering on `engineer`, so nothing on the current board changes. `RuleResult`
and `Remedy` are reused as-is, with new remedy ids.

**Routing.** `react-router` with `HashRouter`, so every entity has a deep link
(`#/node/m-12`) — the ask panel and the inbox need to jump the main view to a
cited entity, and a hash router works from static hosting or a file.

**Persistence.** IndexedDB via `idb` behind a repository interface, as the
existing spec §10 already prescribes. Two object stores:

- `events` — the log. Exported by default.
- `private` — transcripts and private notes, keyed by id. **Never** read by the
  O3O route, and excluded from export unless the PM ticks "include private".

---

## 4. Schema deltas from the source plan

Only differences are listed; everything else in source §3 stands.

```ts
interface Period { id: string; label: string; startWeek: WeekStart; endWeek: WeekStart }

type DeliveryBar = 'decision' | 'doc' | 'poc' | 'preprod' | 'prod' | 'unknown';
// Ordered. "Harder" means further right. Used by every bar comparison.

interface Condition {
  id: string;
  text: string;             // "Pending eng estimates"
  met: boolean;
  metAt?: string;
  evidence?: EvidenceRef;   // who confirmed it, where
}

interface Commitment {
  // …source fields, with:
  conditions: Condition[];  // D6
  aliases: string[];        // "LLM publishing", "publishing agent" — for meeting matching
  periodId: string;         // D7
  acknowledgement?: { by: string; at: string; evidence: EvidenceRef }; // manual attestation
  // status: no 'soft_committed' (D5)
}

interface Measure {
  // …source fields, with:
  parentMeasureIds: string[];      // cross-layer links; edges are drawn from these (D4)
  impliedBar: DeliveryBar;         // derived from text via lexicon; overridable
  reviewedAgainstParentAt?: string; // set when the PM confirms "still aligned"
}

// Flags: derived (D3). Stored only as:
interface FlagResolution {
  flagKey: string;          // `${type}:${entityId}:${discriminator}`
  fingerprint: string;      // hash of the evidence at resolution time
  outcome: 'acknowledged' | 'fixed' | 'not_an_issue';
  // reason lives on the event
}

// Scenario: an assumption expressed as events, never written to the main log.
interface Scenario { id: string; name: string; baseEventId: string; events: CascadeEvent[] }
```

**Events.** One discriminated union. Every event carries
`{ id, at, actor, reason, prevHash, hash }` plus a typed payload
(`v2mom.created`, `measure.updated`, `commitment.strength_changed`,
`condition.met`, `meeting.ingested`, `flag.resolved`, `share.exported`, …).
`append()` rejects an empty or whitespace reason; that is the one enforcement
point for "reason is mandatory", and it is tested.

---

## 5. Rules, made testable

Every rule below is a pure function of `(state, today)` returning `Flag[]`,
with at least one passing and one failing fixture in its test file.

| Flag | Fires when | Severity |
|---|---|---|
| `missing_owner` | Measure or method has no owner, or only `unassigned` | warning |
| `missing_conditions` | Commitment is `soft` with zero conditions, or `hard` with a due date but no delivery bar | warning |
| `poc_vs_prod_ambiguity` | A commitment with bar ≤ `preprod` is linked (directly or via roadmap) to a measure whose `impliedBar` is `prod`; **or** meeting text within the same period matches both a commitment alias and a prod-lexicon term | critical |
| `soft_hardening` | Commitment is `soft` or has any unmet condition, and a later event or meeting treats it as hard: a due date is added, strength flips without `condition.met` events for every condition, or prod/deadline language matches an alias | critical |
| `v2mom_drift` | Parent measure's text or target changed after the child's `reviewedAgainstParentAt` (or `createdAt` if never reviewed) | warning |
| `company_guidance_gap` | A manager or self measure links to no company item, or links to one whose `impliedBar`/period is incompatible | warning |
| `capacity_over_alloc` | Any person's allocated hours in a period exceed plannable capacity (absence already subtracted, per spec §6.2) | critical |
| `scope_creep_no_tradeoff` | A commitment or roadmap item was added to a period that was already ≥ 100% allocated and no `tradeoff.accepted` event references it | critical |
| `deadline_shift` | A commitment's due date or period changed ≥ 2 times, or once without a linked meeting/evidence | warning |
| `vague_verb` | Commitment statement or extracted action uses a vague verb (explore, look into, see if, try to, align on) and has no owner or no date | info |
| `orphan_work` | Roadmap item or work item links to no measure | info |
| `missing_log` | A meeting mentions a roadmap item name or alias that has no commitment | info |
| `denied_seen_artifact` | Meeting text matches a denial phrase ("I don't recall seeing that") near an alias whose commitment has a `share.exported` or status-meeting event before it | warning |

**Edge health** is the worst of: the link's own compatibility (bar and period),
plus any unresolved flag on the child. Grey by default; amber for warning; red
for critical. Clicking an edge opens the drawer on the flags that coloured it,
each with its implication, evidence excerpts and a suggested move. That is the
C1 exit criterion from source §15.

**Flag language is professional by construction.** Titles and implications are
templates, not generated prose, and none of them names a person as the subject
of a failing. "The Q3 measure describes a production release; the linked
commitment is a pre-prod POC" — never "Manager changed the goalposts".

---

## 6. The golden path, as a script

The seed is a sequence of dated events, so the scrubber replays the story. The
demo is also the end-to-end test: a Playwright script walks it at the end of
each milestone, and each milestone adds steps.

| Seed event (relative dates) | What the app shows |
|---|---|
| −30w: Company guidance "AI-assisted content at scale" | Root of the cascade |
| −28w: Manager V2MOM, 12 methods/measures, 3 unassigned; measure M-7 "Deliver LLM publishing capability" (impliedBar `unknown`) | Unassigned owners flagged amber |
| −27w: Roadmap Q1 "LLM publishing capability", bar `unknown`, capacity pre-allocated before the PM's start date | `orphan_work` until linked |
| −26w: Kickoff meeting. Commitment C-1: *soft*, bar `poc`, env pre-prod, condition "pending eng estimates" (never marked met) | Ledger entry with its original wording and source excerpt |
| −25w…−14w: Twelve weekly status summaries, each "POC in pre-prod" | Evidence trail on C-1 |
| −12w: Manager edits M-7 → "Launch LLM publishing to production" | **Edge M-7 → C-1 turns red** (`poc_vs_prod_ambiguity`); self measure turns amber (`v2mom_drift`) |
| −2w: 1:1 transcript: "this should be in prod by now" | `soft_hardening` (critical), evidence: the edit, 12 status excerpts, the unmet condition |
| −1w: "Can we just add Project X to P3?" | `scope_creep_no_tradeoff`; P3 has designer + 2 engineers at 100% |
| today | 1:1 brief: C-1 as committed (POC, pre-prod, condition unmet), the M-7 wording change with its date, the P3 tradeoff with four remedies |

---

## 7. Milestones

Sizes are relative (S ≈ 1–2 days, M ≈ 3–5, L ≈ 1–2 weeks) for one developer
with an agent. Each ships usable before the next starts.

### C0 — Foundation · M
- `src/cascade/domain/types.ts`, `events.ts` (append, fold, snapshotAt, hash chain)
- Repository over IndexedDB; JSON export/import of the event log; "include private" toggle
- `Period` + mapping onto `weeks.ts`
- Seed as events (story above, through −1w)
- App shell: left rail (all eleven destinations, empty states that explain the idea), top bar with period selector, `HashRouter`; existing board mounted under Capacity
- **Tests:** fold is deterministic; `append` rejects empty reason; hash chain detects an edited event; export → import round-trips byte-identically; `snapshotAt(t)` equals folding the prefix
- **Exit:** app opens on a rail; export produces a file that re-imports to the same state

### C1 — Cascade and V2MOM · L
- V2MOM CRUD for company / manager / self; methods, measures, obstacles; owners incl. unassigned
- Measure ↔ parent measure linking; `impliedBar` from lexicon, overridable
- Tree-list cascade (company → manager → self → roadmap leaves), thin connectors, health edges, red dots
- Node drawer: five sections, parents/children, flags, audit trail for that node
- Edit form: mandatory reason, impact preview ("these edges will turn amber")
- Flags: `missing_owner`, `v2mom_drift`, `company_guidance_gap`, `orphan_work`
- "Reviewed against parent" action that clears drift with a reason
- **Exit:** click the amber M-7 → self-measure edge and see why: the wording change, its date, and the reason given. (Red needs commitments, which arrive in C2; the source plan's "click a red edge" criterion moves there.)

### C2 — Ledger, roadmap, 1:1 mode · L
- Commitment ledger: strength, conditions (with met/unmet), delivery bar, aliases, links to measure/roadmap/Jira key (URL only)
- Roadmap CRUD and CSV/Markdown import
- Flags: `missing_conditions`, `poc_vs_prod_ambiguity` (structured half), `soft_hardening` (structured half), `deadline_shift`
- `diffBetween(from, to)`; "since last 1:1" = since the latest meeting tagged 1:1
- **O3O mode** as its own route that never imports from the `private` store — enforced by a test that the route's module graph cannot reach it
- 1:1 brief markdown (source §13) and the **post-1:1 recap** (§8)
- **Exit:** clicking the red M-7 → C-1 edge shows the POC-vs-prod conflict; the seed produces a 1:1 brief that states C-1's wording, conditions and the M-7 change, with nothing from a transcript in it

### C3 — Meetings ingest · M
- Paste or drop: plain text, Otter `.txt`, Gemini recap markdown; parser per format with fixtures
- Dedupe by date ± 1 day + title similarity; merge duplicates into one Meeting with multiple sources
- Tier 1 regex extraction: decisions, actions (owner/date/strength guess), open questions, risks, delivery-bar words
- Phrase lexicon (source §6 seed list) plus user-defined patterns
- Review screen: each extraction is a proposal; "promote to ledger" opens the commitment form prefilled
- Flags: text halves of `soft_hardening` and `poc_vs_prod_ambiguity`, `vague_verb`, `missing_log`, `denied_seen_artifact`
- Transcript stored in `private`, shown behind a lock, excerpts capped at 280 characters
- **Exit:** pasting the seeded 1:1 transcript raises the critical flag with the status-meeting excerpts as evidence

### C4 — Capacity and scenarios · M
- Commitment `capacityDraw` materialises as blocks on the existing board, tagged `commitmentId`
- `canAddCommitment` in `tradeoff.ts`: refuses when the period is full and returns remedies — *move X out*, *slip to next period*, *lower the bar (POC not prod)*, *add capacity* — each pre-filled with concrete candidates
- Choosing a remedy writes `tradeoff.accepted` with a reason
- Flags: `capacity_over_alloc`, `scope_creep_no_tradeoff`
- Scenario sandbox: a fork is `baseEventId` + scenario events folded in memory; broken commitments are derived; only "promote tradeoff" writes to the main log
- **Exit:** adding Project X to P3 is refused with four remedies; a scenario "designer −8h/week" shows which commitments break

### C5 — Views and the scrubber · M
- Timeline scrubber driving `snapshotAt`; changed nodes highlight; 300–500 ms fades, off under `prefers-reduced-motion`
- Matrix (manager measures × my measures: link / gap / conflict)
- Swimlane (company / manager / me / roadmap over time)
- Focus / lineage (dim all but ancestors and descendants)
- Semantic zoom on the tree
- **Exit:** scrubbing to −13w shows M-7 green; −12w shows it turn red

### C6 — Intelligence and polish · M
- LLM adapter behind one interface; off by default; the key lives in IndexedDB, never in export; a "what will be sent" preview before every call
- Tier 1 via LLM when a key is present (same output shape as regex, so the review screen is unchanged); Tier 2 only on flag triggers
- **Ask panel**: without a key, structured search over entities (cmdk). With a key, the model must return `{ segments: [{ text, citations: entityId[] }] }`; a domain validator drops any segment with no citation or an unknown id, and the UI renders citations as links that move the main view
- PNG export of the cascade and O3O view; notification log; optional passphrase-encrypted export (WebCrypto AES-GCM)
- **Exit:** every acceptance box in source §14 is ticked by the Playwright golden-path run

---

## 8. The post-1:1 recap

The source plan's defence against reframing is private evidence. That helps the
PM remember, but it is weak in a disagreement: it is one person's notes, first
revealed at the moment they are needed. The strongest record is one the manager
already received.

After a 1:1 is logged, C2 generates a short recap to paste into email or Slack:

```
Thanks for the time today. What I took away:
- LLM publishing: continuing as a POC in pre-prod this period. A production
  release depends on eng estimates, which we don't have yet.
- Project X: happy to take it on in P3 if Search relevance moves to P4 —
  let me know which you'd prefer.
Let me know if I've got any of this wrong.
```

Sending it writes `share.exported` with the text. An uncorrected recap is what
makes `denied_seen_artifact` meaningful. The app never sends anything itself.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Employer data policy.** Sending work transcripts to an LLM on a personal key may breach it, even though "user-keyed" satisfies the source plan's wording | LLM off by default; the app is fully usable without it (C0–C5 have no LLM); per-call preview of what leaves the browser; README says to check policy first |
| **Recording consent** varies by jurisdiction and company | The app ingests transcripts, it never records; ingest shows a one-time consent reminder |
| **The tool reads as a dossier** if anyone sees it | Professional flag templates (§5); O3O mode as a separate route; private notes never render outside the private workspace |
| **Data loss** — browser storage on a work laptop can be wiped | Export reminder when the last export is > 7 days old; a single-file export that re-imports cleanly |
| **Maintenance burden** — ~50 measures and weekly meetings is real upkeep, and a stale ledger is worse than none | Quiet by default; meeting ingest is the main input and proposes, rather than demands, ledger entries; one weekly "anything drifted?" prompt folded into the existing Friday reset (spec §F8) |
| **Regex extraction is noisy** | Every extraction is a proposal the PM promotes; lexicon hits carry the matched span so false positives are obvious |
| **Two roadmaps in one repo** compete for time with Capacity Timeline M2–M5 | Open question 1 |

---

## 10. Open questions

1. **Sequencing with Capacity Timeline.** Recommendation: C0–C2 before
   Capacity Timeline M2, since Cascade C2 (1:1 brief) solves the more
   immediate problem and C4 needs the board to exist more than it needs triage.
2. **Should a commitment's capacity draw go through the triage gate?** D8
   routes draws onto the board; the existing `canSchedule` requires a
   TriageRecord. Recommendation: the tradeoff answer satisfies triage Q5 and
   the other four are pre-filled from the commitment, so it stays one gate.
3. **Skip-level layer.** The source plan lists `skip` as optional. Cut from v1
   unless there is a skip-level V2MOM to load.
4. **Name.** "Cascade" as the rail section inside Capacity Timeline, or rename
   the whole app? No code depends on the answer before C0 ships.

---

## 11. First PR (C0), concretely

- Add `idb` and `react-router-dom`
- `src/cascade/domain/{types,events,seed}.ts` with tests
- `src/cascade/state/{repository,store}.ts`
- `src/cascade/ui/{Shell,Rail,EmptyState}.tsx`; existing `App` content moves under the Capacity route unchanged
- `npm test`, `npm run typecheck` and `npm run build` pass; existing tests untouched
