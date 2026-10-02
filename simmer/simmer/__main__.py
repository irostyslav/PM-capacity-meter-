"""Command-line entry point: python -m simmer <command>."""

import argparse
import json
from pathlib import Path

from simmer import db
from simmer.config import DB_PATH, LOG_PATH
from simmer.log import setup_logging
from simmer.sources import otter


def cmd_init(args: argparse.Namespace) -> None:
    log = setup_logging()
    conn = db.connect()
    conn.close()
    log.info("initialized database at %s", DB_PATH)


def cmd_status(args: argparse.Namespace) -> None:
    conn = db.connect()
    tables = db.table_names(conn)
    cards = db.count_cards(conn)
    conn.close()
    print(f"database: {DB_PATH}")
    print(f"log:      {LOG_PATH}")
    print(f"tables:   {', '.join(tables)}")
    print(f"cards:    {cards}")


def cmd_otter_raw(args: argparse.Namespace) -> None:
    """Step 3: log the raw meeting payload and print it."""
    log = setup_logging()
    meeting = otter.load_payload(args.file)
    conn = db.connect()
    db.log_raw_payload(conn, otter.SOURCE, meeting["url"], meeting)
    conn.close()
    log.info("logged raw otter payload %s (%s)", meeting["id"], meeting["title"])
    print(json.dumps(meeting, indent=2, ensure_ascii=False))


def cmd_otter_card(args: argparse.Namespace) -> None:
    """Step 4: turn a meeting file into a capture card, store it, print it."""
    log = setup_logging()
    meeting = otter.load_payload(args.file)
    conn = db.connect()
    db.log_raw_payload(conn, otter.SOURCE, meeting["url"], meeting)
    card = otter.to_card(meeting, body=args.body, tags=args.tag)
    if db.insert_card(conn, card):
        log.info("stored card %s for otter meeting %s", card.id, meeting["id"])
    else:
        card = db.find_card(conn, card.source, card.source_ref, card.kind)
        log.info("otter meeting %s already has card %s; skipped", meeting["id"], card.id)
    conn.close()
    print(card.render())


def cmd_cards(args: argparse.Namespace) -> None:
    conn = db.connect()
    rows = conn.execute("SELECT * FROM cards ORDER BY occurred_at DESC").fetchall()
    conn.close()
    for row in rows:
        print(db.Card.from_row(row).render(), end="\n\n")


def main() -> None:
    parser = argparse.ArgumentParser(prog="simmer")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init", help="create the local database and log").set_defaults(func=cmd_init)
    sub.add_parser("status", help="show where things live").set_defaults(func=cmd_status)
    sub.add_parser("cards", help="print every card, newest first").set_defaults(func=cmd_cards)

    raw = sub.add_parser("otter-raw", help="log and print a raw Otter meeting file")
    raw.add_argument("file", type=Path)
    raw.set_defaults(func=cmd_otter_raw)

    card = sub.add_parser("otter-card", help="turn an Otter meeting file into a card")
    card.add_argument("file", type=Path)
    card.add_argument("--body", help="2-3 sentence summary; omit to use the rule-based fallback")
    card.add_argument("--tag", action="append", default=[], help="extra tag (repeatable)")
    card.set_defaults(func=cmd_otter_card)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
