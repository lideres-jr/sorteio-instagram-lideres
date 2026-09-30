from abc import ABC, abstractmethod

from app.models import CommentEntry, DrawRecord


class DrawRepository(ABC):
    @abstractmethod
    async def save_comments(self, comments: list[CommentEntry]) -> int: ...

    @abstractmethod
    async def list_comments(self) -> list[CommentEntry]: ...

    @abstractmethod
    async def list_drawn_usernames(self) -> set[str]: ...

    @abstractmethod
    async def save_draw(self, draw: DrawRecord) -> None: ...

    @abstractmethod
    async def reset(self) -> None: ...

