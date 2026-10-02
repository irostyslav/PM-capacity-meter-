import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timezone

os.environ["SIMMER_DATA_DIR"] = tempfile.mkdtemp()

from simmer import db  # noqa: E402
from simmer.card import Card  # noqa: E402

WHEN = datetime(2026, 10, 1, 15, 0, tzinfo=timezone.utc)


def make_card(**overrides) -> Card:
    fields = dict(
        source="otter", source_ref="https://otter.ai/u/abc", kind="capture",
        title="Weekly sync", body="Decided X. Open: Y.", occurred_at=WHEN,
        tags=["Planning", " planning ", "q4"],
    )
    fields.update(overrides)
    return Card(**fields)


class CardTest(unittest.TestCase):
    def test_tags_are_normalized(self):
        self.assertEqual(make_card().tags, ["planning", "q4"])

    def test_rejects_bad_kind_and_naive_time(self):
        with self.assertRaises(ValueError):
            make_card(kind="post")
        with self.assertRaises(ValueError):
            make_card(occurred_at=datetime(2026, 10, 1))

    def test_capture_cannot_roll_up(self):
        with self.assertRaises(ValueError):
            make_card(rollup_of=["x"])


class DbTest(unittest.TestCase):
    def setUp(self):
        self.conn = db.connect()

    def tearDown(self):
        self.conn.close()

    def test_round_trip_and_dedupe(self):
        card = make_card(source_ref="https://otter.ai/u/round-trip")
        self.assertTrue(db.insert_card(self.conn, card))
        self.assertFalse(db.insert_card(self.conn, make_card(source_ref=card.source_ref)))
        self.assertEqual(db.find_card(self.conn, "otter", card.source_ref, "capture"), card)

    def test_cards_cannot_be_deleted_or_updated(self):
        card = make_card(source_ref="https://otter.ai/u/immutable")
        db.insert_card(self.conn, card)
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("DELETE FROM cards WHERE id = ?", (card.id,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("UPDATE cards SET title = 'x' WHERE id = ?", (card.id,))


if __name__ == "__main__":
    unittest.main()
