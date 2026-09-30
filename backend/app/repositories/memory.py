import asyncio
from uuid import UUID

from app.models import CommentEntry, DrawRecord
from app.repositories.base import DrawRepository


class InMemoryDrawRepository(DrawRepository):
    def __init__(self) -> None:
        self._comments: dict[UUID, CommentEntry] = {}
        self._external_ids: set[str] = set()
        self._draws: list[DrawRecord] = []
        self._lock = asyncio.Lock()

    async def save_comments(self, comments: list[CommentEntry]) -> int:
        inserted = 0
        async with self._lock:
            for comment in comments:
                if comment.external_id and comment.external_id in self._external_ids:
                    continue
                self._comments[comment.id] = comment
                if comment.external_id:
                    self._external_ids.add(comment.external_id)
                inserted += 1
        return inserted

    async def list_comments(self) -> list[CommentEntry]:
        async with self._lock:
            return list(self._comments.values())

    async def list_drawn_usernames(self) -> set[str]:
        async with self._lock:
            return {draw.username for draw in self._draws}

    async def save_draw(self, draw: DrawRecord) -> None:
        async with self._lock:
            self._draws.append(draw)

    async def reset(self) -> None:
        async with self._lock:
            self._comments.clear()
            self._external_ids.clear()
            self._draws.clear()

