# Capacity Timeline

A visual capacity planner for product managers that makes overcommitment visible
before it happens and makes thinking a protected, first-class activity.

Rows are engineers, columns are weeks, initiatives are draggable blocks — and
unallocated capacity is drawn as a real thing, never as empty space. Nothing
reaches the timeline without passing a five-question triage. Fuzzy work waits in
a parking lot until someone can define it in one line. Low-confidence work can't
be promised more than two weeks out.

**Status:** pre-build. The spec is the current artifact.

📄 **[Product spec →](docs/product-spec.md)**

## What it is not

No cross-team resource leveling, no Gantt dependencies, no Jira or Linear
integration, no time tracking. A single-user planning surface first.

## Stack (planned)

React + TypeScript, Vite, `dnd-kit` for the timeline, Zustand for state,
IndexedDB for local-first persistence. Desktop-first, mobile-responsive.
