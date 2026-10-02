# Simmer

Simmer is a personal feed of my own life: it pulls from my own data sources
(meetings, email, calendar, tasks, notes) and turns them into scrollable cards.
It borrows the look and pull of an addictive social feed, but every card is
about my own work and life. The goal is a morning brief and an evening debrief
that I actually want to open.

## Status

Tonight's scope: one real card rendered from one source (Otter.ai meeting
transcripts). There's no feed UI, auth or other sources yet.

## The app

`app/simmer.html` is the feed: a morning brief, an evening recap, a capture box
and day-grouped cards.

- **Inside claude.ai** (published as a private artifact) it reads Otter,
  Google Calendar and Todoist live through your connectors, uses Claude to
  write card summaries and recaps, and saves cards to your private store.
- **On GitHub Pages** (`site/index.html`, built with `python build_site.py`)
  there are no connectors, so it works as a capture-and-recap feed and keeps
  cards in your browser.

## Running the Python side

Python 3.11+, standard library only. No dependencies yet.

```sh
cd simmer
python -m simmer init     # creates data/simmer.db and data/simmer.log
python -m simmer status   # shows where things live and how many cards exist
python -m unittest discover -s tests
```

## Getting an Otter meeting in

Otter has no public API outside Enterprise plans, so meetings come in as JSON
files. Today a Claude session with the Otter connector calls `otter_fetch` and
saves the result to `data/inbox/otter/<meeting-id>.json`. Then:

```sh
python -m simmer otter-raw  data/inbox/otter/<id>.json          # log + print the raw payload
python -m simmer otter-card data/inbox/otter/<id>.json \
    --body "2-3 sentences: decisions, open items" --tag some-topic # store + print the card
python -m simmer cards                                           # every card, newest first
```

Without `--body`, a rule-based summary is built from Otter's own summary and
action items. Running `otter-card` twice on the same meeting is a no-op.
Set `SIMMER_TZ` to change the display time zone (default America/Los_Angeles).

## Principles

- Everything is logged (`data/simmer.log`).
- Cards are never deleted.
- Capture must be near-zero friction.
- Boring, readable code over cleverness.
- Ask before adding dependencies.

## Layout

```
simmer/
  simmer/
    __main__.py   CLI entry point (python -m simmer ...)
    config.py     paths (data dir, db file, log file)
    log.py        logging to file + stderr
    card.py       the Card model (decisions documented at the top)
    db.py         SQLite storage; cards are append-only
    sources/otter.py  Otter meeting JSON -> Card
  tests/          stdlib unittest
  data/           local storage, git-ignored
```
