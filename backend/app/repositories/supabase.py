from app.models import CommentEntry, DrawRecord
from app.repositories.base import DrawRepository


class SupabaseDrawRepository(DrawRepository):
    def __init__(self, url: str, key: str) -> None:
        from supabase import Client, create_client

        self._client: Client = create_client(url, key)

    async def save_comments(self, comments: list[CommentEntry]) -> int:
        if not comments:
            return 0
        rows = [
            {
                "id": str(item.id),
                "external_id": item.external_id,
                "username": item.username,
                "text": item.text,
                "commented_at": item.commented_at.isoformat(),
                "source": item.source.value,
            }
            for item in comments
        ]
        response = (
            self._client.table("comments")
            .upsert(rows, on_conflict="external_id", ignore_duplicates=True)
            .execute()
        )
        return len(response.data or [])

    async def list_comments(self) -> list[CommentEntry]:
        response = self._client.table("comments").select("*").execute()
        return [CommentEntry.model_validate(row) for row in response.data or []]

    async def list_drawn_usernames(self) -> set[str]:
        response = self._client.table("draws").select("username").execute()
        return {row["username"] for row in response.data or []}

    async def save_draw(self, draw: DrawRecord) -> None:
        self._client.table("draws").insert(
            {
                "id": str(draw.id),
                "comment_id": str(draw.comment_id),
                "username": draw.username,
                "drawn_at": draw.drawn_at.isoformat(),
            }
        ).execute()

    async def reset(self) -> None:
        self._client.rpc("reset_current_draw").execute()

