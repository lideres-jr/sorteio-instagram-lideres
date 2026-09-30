from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class CommentSource(str, Enum):
    INSTAGRAM = "instagram"
    MANUAL = "manual"


class CommentEntry(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    external_id: str | None = None
    username: str = Field(min_length=1, max_length=100)
    text: str = ""
    commented_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: CommentSource

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        username = value.strip().lstrip("@").lower()
        if not username:
            raise ValueError("O usuario nao pode ser vazio.")
        return username


class DrawRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    comment_id: UUID
    username: str
    drawn_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FetchCommentsRequest(BaseModel):
    media_id: str | None = None


class FetchCommentsResponse(BaseModel):
    imported: int
    total_entries: int
    source: CommentSource = CommentSource.INSTAGRAM


class ManualFallbackRequest(BaseModel):
    comments: str = Field(
        min_length=1,
        description="Uma entrada por linha: @usuario ou @usuario | comentario.",
    )
    draw_now: bool = True


class DrawResponse(BaseModel):
    draw_id: UUID
    username: str
    display_username: str
    comment: str
    source: CommentSource
    drawn_at: datetime
    remaining_entries: int


class ManualFallbackResponse(BaseModel):
    imported: int
    total_entries: int
    winner: DrawResponse | None = None


class StatusResponse(BaseModel):
    status: str
    storage: str

