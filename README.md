# Capacity Timeline

A visual capacity planner for product managers that makes overcommitment visible
before it happens and makes thinking a protected, first-class activity.

Rows are engineers, columns are weeks, initiatives are draggable blocks — and
unallocated capacity is drawn as a real thing, never as empty space. Nothing
reaches the timeline without passing a five-question triage. Fuzzy work waits in
a parking lot until someone can define it in one line. Low-confidence work can't
be promised more than two weeks out.

📄 **[Product spec →](docs/product-spec.md)**

## Status

**M1 — the canvas.** The board, the capacity math, and the confidence horizon
work against seeded example data. Triage, the parking lot, spikes, the weekly
reset and the commitment log UI arrive in M2–M5; their domain rules are already
written and tested.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm test` | Domain and store tests (Vitest) |
| `npm run typecheck` | TypeScript, strict |
| `npm run build` | Production bundle |

## How it's put together

```
src/domain/     Types, capacity math, and the gates. No React in here.
src/state/      Zustand store — applies domain rules, never re-implements them.
src/ui/         Components. They render rules; they do not own them.
```

**The architectural rule:** enforcement lives in `src/domain/rules.ts` and is
tested there. A gate that exists only in a component is a bug. `canPlace`,
`canGraduate`, `canSchedule` and `canCompleteSpike` each return either
`{ok: true}` or a refusal carrying the remedies the user can act on — because a
refusal without a next action is how tools get abandoned.

Some specifics worth knowing before you change things:

- **An engineer's week defaults to 30 hours, not 40.** That default encodes the
  thesis; see spec §6.1.
- **Red means overcommitment and nothing else.** The initiative palette was
  validated for colour-vision-deficiency separation, and red was kept out of it
  so the alarm never competes with an initiative's identity.
- **Blocks do not span weeks.** Multi-week work is several linked blocks, which
  keeps the canvas simple. Spec §14 lists this as an open question.

## Not in v1

No cross-team resource levelling, no Gantt dependencies, no Jira or Linear
integration, no time tracking, no multiplayer. A single-user planning surface
first.
