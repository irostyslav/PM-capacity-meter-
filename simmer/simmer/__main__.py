"""Command-line entry point: python -m simmer <command>."""

import argparse

from simmer import db
from simmer.config import DB_PATH, LOG_PATH
from simmer.log import setup_logging


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


def main() -> None:
    parser = argparse.ArgumentParser(prog="simmer")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init", help="create the local database and log").set_defaults(func=cmd_init)
    sub.add_parser("status", help="show where things live").set_defaults(func=cmd_status)
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
