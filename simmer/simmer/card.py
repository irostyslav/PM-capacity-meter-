"""The Card: one item in the feed.

Decisions (step 2):
- id is a random UUID. Uniqueness is on (source, source_ref, kind), so
  re-ingesting the same meeting is a no-op instead of a duplicate.
- Cards are immutable once stored. Re-ingesting skips; nothing is updated
  or deleted (enforced by triggers in db.py).
- created_at = when Simmer made the card; occurred_at = when the thing
  happened. The feed sorts by occurred_at. Both are timezone-aware UTC.
- A recap lists the capture cards it rolls up in rollup_of. Captures
  leave it empty.
- tags are free-form lowercase strings; people are a separate field.
- The raw source payload is not on the card. It is logged in the
  raw_payloads table so cards can be rebuilt without refetching.
"""

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

Kind = Literal["capture", "recap"]
KINDS: tuple[str, ...] = ("capture", "recap")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


@dataclass(frozen=True)
class Card:
    source: str  # "otter", "gcal", ... or "simmer" for recaps
    source_ref: str  # link or id back to the original
    kind: Kind
    title: str
    body: str  # short text, 2-3 sentences
    occurred_at: datetime
    id: str = field(default_factory=new_id)
    created_at: datetime = field(default_factory=utc_now)
    media: list[str] = field(default_factory=list)  # image/video/audio URLs
    tags: list[str] = field(default_factory=list)
    people: list[str] = field(default_factory=list)
    rollup_of: list[str] = field(default_factory=list)  # card ids, recaps only

    def __post_init__(self) -> None:
        if self.kind not in KINDS:
            raise ValueError(f"kind must be one of {KINDS}, got {self.kind!r}")
        for name in ("source", "source_ref", "title"):
            if not getattr(self, name).strip():
                raise ValueError(f"{name} must not be empty")
        for name in ("created_at", "occurred_at"):
            if getattr(self, name).tzinfo is None:
                raise ValueError(f"{name} must be timezone-aware")
        if self.kind == "capture" and self.rollup_of:
            raise ValueError("only recap cards can roll up other cards")
        # Normalize tags in place; frozen dataclasses need object.__setattr__.
        object.__setattr__(self, "tags", sorted({t.strip().lower() for t in self.tags if t.strip()}))

    def to_row(self) -> dict:
        return {
            "id": self.id,
            "source": self.source,
            "source_ref": self.source_ref,
            "kind": self.kind,
            "title": self.title,
            "body": self.body,
            "created_at": self.created_at.isoformat(),
            "occurred_at": self.occurred_at.isoformat(),
            "media": json.dumps(self.media),
            "tags": json.dumps(self.tags),
            "people": json.dumps(self.people),
            "rollup_of": json.dumps(self.rollup_of),
        }

    @classmethod
    def from_row(cls, row) -> "Card":
        return cls(
            id=row["id"],
            source=row["source"],
            source_ref=row["source_ref"],
            kind=row["kind"],
            title=row["title"],
            body=row["body"],
            created_at=datetime.fromisoformat(row["created_at"]),
            occurred_at=datetime.fromisoformat(row["occurred_at"]),
            media=json.loads(row["media"]),
            tags=json.loads(row["tags"]),
            people=json.loads(row["people"]),
            rollup_of=json.loads(row["rollup_of"]),
        )

    def render(self) -> str:
        """Plain-text rendering for the terminal."""
        when = self.occurred_at.astimezone().strftime("%a %d %b %Y, %H:%M")
        lines = [
            f"┌─ {self.kind.upper()} · {self.source} · {when}",
            f"│ {self.title}",
            "│",
        ]
        lines += [f"│ {line}" for line in self.body.splitlines()]
        if self.people:
            lines += ["│", f"│ with {', '.join(self.people)}"]
        if self.tags:
            lines.append(f"│ {' '.join('#' + t for t in self.tags)}")
        lines += [f"│ ↗ {self.source_ref}", f"└─ {self.id}"]
        return "\n".join(lines)
