"""SQLite storage. Cards are append-only: triggers block UPDATE and DELETE."""

import json
import sqlite3

from simmer.card import Card, utc_now
from simmer.config import DATA_DIR, DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    source_ref  TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('capture', 'recap')),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    media       TEXT NOT NULL DEFAULT '[]',
    tags        TEXT NOT NULL DEFAULT '[]',
    people      TEXT NOT NULL DEFAULT '[]',
    rollup_of   TEXT NOT NULL DEFAULT '[]',
    UNIQUE (source, source_ref, kind)
);

CREATE TRIGGER IF NOT EXISTS cards_no_delete BEFORE DELETE ON cards
BEGIN SELECT RAISE(ABORT, 'cards are never deleted'); END;

CREATE TRIGGER IF NOT EXISTS cards_no_update BEFORE UPDATE ON cards
BEGIN SELECT RAISE(ABORT, 'cards are immutable'); END;

-- Every payload fetched from a source, kept verbatim.
CREATE TABLE IF NOT EXISTS raw_payloads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source      TEXT NOT NULL,
    source_ref  TEXT NOT NULL,
    fetched_at  TEXT NOT NULL,
    payload     TEXT NOT NULL
);
"""


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def table_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    return [row["name"] for row in rows]


def insert_card(conn: sqlite3.Connection, card: Card) -> bool:
    """Store a card. Returns False if an equivalent card already exists."""
    row = card.to_row()
    columns = ", ".join(row)
    placeholders = ", ".join(f":{k}" for k in row)
    cur = conn.execute(f"INSERT OR IGNORE INTO cards ({columns}) VALUES ({placeholders})", row)
    conn.commit()
    return cur.rowcount == 1


def find_card(conn: sqlite3.Connection, source: str, source_ref: str, kind: str) -> Card | None:
    row = conn.execute(
        "SELECT * FROM cards WHERE source = ? AND source_ref = ? AND kind = ?",
        (source, source_ref, kind),
    ).fetchone()
    return Card.from_row(row) if row else None


def count_cards(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM cards").fetchone()[0]


def log_raw_payload(conn: sqlite3.Connection, source: str, source_ref: str, payload) -> None:
    conn.execute(
        "INSERT INTO raw_payloads (source, source_ref, fetched_at, payload) VALUES (?, ?, ?, ?)",
        (source, source_ref, utc_now().isoformat(), json.dumps(payload, ensure_ascii=False)),
    )
    conn.commit()
