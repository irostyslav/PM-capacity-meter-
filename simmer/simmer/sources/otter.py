"""Otter.ai meetings -> Cards.

Otter has no public API for non-Enterprise accounts, so meetings arrive as
JSON files dropped in data/inbox/otter/ by whatever fetched them (today: an
otter_fetch call over the Otter MCP connector). This module only reads those
files; it never talks to Otter.

Payload shape (what otter_fetch returns):
    {"id", "title", "url", "text": "[0:00:00] Speaker: ...\\n...",
     "metadata": {"start_time": "YYYY/MM/DD HH:MM:SS", "duration",
                  "action_items": [...], "short_summary": "markdown"}}
"""

import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from simmer.card import Card

SOURCE = "otter"
# Otter returns local wall-clock times with no offset; the account is on PDT.
OTTER_TZ = ZoneInfo("America/Los_Angeles")

TRANSCRIPT_LINE = re.compile(r"^\[\d+:\d{2}:\d{2}\] (?P<speaker>[^:]+):", re.MULTILINE)
UNNAMED_SPEAKER = re.compile(r"^Speaker \d+$")
ACTION_ITEM = re.compile(r"^(?P<owner>.*?) - \S* ?: (?P<task>.*)$")


def load_payload(path: Path) -> dict:
    """Read a meeting file. Accepts the bare meeting or the MCP result envelope."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if "result" in data:  # {"result": {"content": [{"type": "text", "text": "<json>"}]}}
        data = json.loads(data["result"]["content"][0]["text"])
    for key in ("id", "title", "url", "metadata"):
        if key not in data:
            raise ValueError(f"{path}: not an Otter meeting, missing {key!r}")
    return data


def started_at(meeting: dict) -> datetime:
    naive = datetime.strptime(meeting["metadata"]["start_time"], "%Y/%m/%d %H:%M:%S")
    return naive.replace(tzinfo=OTTER_TZ)


def people(meeting: dict) -> list[str]:
    """Named speakers, in order of first appearance. 'Speaker N' is skipped."""
    names: list[str] = []
    for match in TRANSCRIPT_LINE.finditer(meeting.get("text", "")):
        # "Jon Balza - Principal Product Designer (...) at Salesforce" -> "Jon Balza"
        name = re.split(r" [-–] ", match["speaker"], maxsplit=1)[0].strip()
        if not UNNAMED_SPEAKER.match(name) and name not in names:
            names.append(name)
    return names


def action_items(meeting: dict) -> list[tuple[str, str]]:
    """(owner, task) pairs, exact duplicates dropped. Owner may be 'Speaker N'."""
    seen: set[str] = set()
    items = []
    for raw in meeting["metadata"].get("action_items", []):
        match = ACTION_ITEM.match(raw)
        owner, task = (match["owner"], match["task"]) if match else ("", raw)
        if task.lower() not in seen:
            seen.add(task.lower())
            items.append((owner.strip(), task.strip()))
    return items


def _plain(markdown: str) -> str:
    return re.sub(r"[*#]+", "", markdown).strip()


def fallback_body(meeting: dict) -> str:
    """Rule-based 2-3 sentences for when nobody wrote a summary.

    First sentence of Otter's summary, the first open question, and the
    first action item. Clunky but free and deterministic.
    """
    summary = meeting["metadata"].get("short_summary", "")
    sentences = [_plain(summary.split("\n", 1)[0])]
    open_part = summary.split("## Open Questions", 1)
    if len(open_part) == 2:
        bullets = [line for line in open_part[1].splitlines() if line.lstrip().startswith("*")]
        if bullets:
            sentences.append("Open: " + _plain(bullets[0]))
    items = action_items(meeting)
    if items:
        sentences.append("Next: " + items[0][1])
    return " ".join(s for s in sentences if s)


def to_card(meeting: dict, body: str | None = None, tags: list[str] | None = None) -> Card:
    return Card(
        source=SOURCE,
        source_ref=meeting["url"],
        kind="capture",
        title=meeting["title"],
        body=body or fallback_body(meeting),
        occurred_at=started_at(meeting),
        tags=["meeting", *(tags or [])],
        people=people(meeting),
    )
