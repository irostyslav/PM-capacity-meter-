# Simmer

Simmer is a personal feed of my own life: it pulls from my own data sources
(meetings, email, calendar, tasks, notes) and turns them into scrollable cards.
It borrows the look and pull of an addictive social feed, but every card is
about my own work and life. The goal is a morning brief and an evening debrief
that I actually want to open.

## Status

Tonight's scope: one real card rendered from one source (Otter.ai meeting
transcripts). There's no feed UI, auth or other sources yet.

## Running

Python 3.11+, standard library only. No dependencies yet.

```sh
cd simmer
python -m simmer init     # creates data/simmer.db and data/simmer.log
python -m simmer status   # shows where things live and how many cards exist
python -m unittest discover -s tests
```

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
  tests/          stdlib unittest
  data/           local storage, git-ignored
```
