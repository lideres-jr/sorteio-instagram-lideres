import random
import re

from app.models import CommentEntry, CommentSource, DrawRecord, DrawResponse
from app.repositories.base import DrawRepository


class NoEligibleEntriesError(RuntimeError):
    pass


class DrawService:
    def __init__(
        self, repository: DrawRepository, randomizer: random.Random | None = None
    ) -> None:
        self._repository = repository
        self._random = randomizer or random.SystemRandom()

    async def draw(self) -> DrawResponse:
        entries = await self._repository.list_comments()
        drawn = await self._repository.list_drawn_usernames()
        eligible = [entry for entry in entries if entry.username not in drawn]
        if not eligible:
            raise NoEligibleEntriesError(
                "Nao existem entradas elegiveis. Importe novos comentarios."
            )

        winner = self._random.choice(eligible)
        record = DrawRecord(comment_id=winner.id, username=winner.username)
        await self._repository.save_draw(record)
        remaining = sum(1 for item in eligible if item.username != winner.username)
        return DrawResponse(
            draw_id=record.id,
            username=winner.username,
            display_username=f"@{winner.username}",
            comment=winner.text,
            source=winner.source,
            drawn_at=record.drawn_at,
            remaining_entries=remaining,
        )

    @staticmethod
    def parse_manual_comments(raw: str) -> list[CommentEntry]:
        entries: list[CommentEntry] = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = re.split(r"\s*[|;]\s*", line, maxsplit=1)
            entries.append(
                CommentEntry(
                    username=parts[0],
                    text=parts[1] if len(parts) > 1 else "",
                    source=CommentSource.MANUAL,
                )
            )
        return entries

