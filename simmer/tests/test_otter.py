import json
import tempfile
import unittest
from pathlib import Path

from simmer.sources import otter

# Synthetic meeting in the shape otter_fetch returns. No real data in tests.
MEETING = {
    "id": "abc123",
    "title": "Roadmap sync",
    "url": "https://otter.ai/u/abc123",
    "text": (
        "[0:00:00] Speaker 1: Hi all.\n"
        "[0:00:05] Ada Lovelace - Principal Engineer (R&D - Products) at Example: Hello.\n"
        "[0:00:09] Grace Hopper – Director at Example (SF): Morning.\n"
        "[0:00:12] Ada Lovelace - Principal Engineer (R&D - Products) at Example: Again."
    ),
    "metadata": {
        "start_time": "2026/10/01 14:02:19",
        "duration": "29m",
        "action_items": [
            "Ada Lovelace - ada@example.com : Ship the memo.",
            "Speaker 0 - : Ship the memo.",
            "Speaker 1 - : Book the review.",
        ],
        "short_summary": "We discussed **pricing**.\n\n## Open Questions\n*   Who owns **pricing**?\n",
    },
}


class OtterTest(unittest.TestCase):
    def write(self, data) -> Path:
        path = Path(tempfile.mkdtemp()) / "m.json"
        path.write_text(json.dumps(data))
        return path

    def test_loads_bare_and_mcp_envelope(self):
        envelope = {"result": {"content": [{"type": "text", "text": json.dumps(MEETING)}]}}
        self.assertEqual(otter.load_payload(self.write(MEETING)), MEETING)
        self.assertEqual(otter.load_payload(self.write(envelope)), MEETING)

    def test_rejects_non_meeting(self):
        with self.assertRaises(ValueError):
            otter.load_payload(self.write({"id": "x"}))

    def test_start_time_is_pacific(self):
        self.assertEqual(otter.started_at(MEETING).isoformat(), "2026-10-01T14:02:19-07:00")

    def test_people_are_named_speakers_without_titles(self):
        self.assertEqual(otter.people(MEETING), ["Ada Lovelace", "Grace Hopper"])

    def test_action_items_drop_exact_duplicates(self):
        self.assertEqual(
            otter.action_items(MEETING),
            [("Ada Lovelace", "Ship the memo."), ("Speaker 1", "Book the review.")],
        )

    def test_card_uses_fallback_body_when_none_given(self):
        card = otter.to_card(MEETING)
        self.assertEqual(card.source_ref, "https://otter.ai/u/abc123")
        self.assertEqual(card.kind, "capture")
        self.assertEqual(card.body, "We discussed pricing. Open: Who owns pricing? Next: Ship the memo.")
        self.assertEqual(card.tags, ["meeting"])


if __name__ == "__main__":
    unittest.main()
