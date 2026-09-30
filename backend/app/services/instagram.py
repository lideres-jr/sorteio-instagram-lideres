from datetime import datetime, timezone

import httpx

from app.models import CommentEntry, CommentSource


class InstagramConfigurationError(RuntimeError):
    pass


class InstagramAPIError(RuntimeError):
    pass


class InstagramClient:
    def __init__(self, access_token: str | None, api_version: str) -> None:
        self._access_token = access_token
        self._base_url = f"https://graph.facebook.com/{api_version}"

    async def fetch_comments(self, media_id: str | None) -> list[CommentEntry]:
        if not self._access_token or not media_id:
            raise InstagramConfigurationError(
                "Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_MEDIA_ID."
            )

        url: str | None = f"{self._base_url}/{media_id}/comments"
        params: dict[str, str] | None = {
            "access_token": self._access_token,
            "fields": "id,text,username,timestamp",
            "limit": "100",
        }
        comments: list[CommentEntry] = []
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                while url:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    payload = response.json()
                    comments.extend(self._parse(payload.get("data", [])))
                    url = payload.get("paging", {}).get("next")
                    params = None
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise InstagramAPIError(
                "Falha ao consultar o Instagram. Use o fallback manual."
            ) from exc
        return comments

    @staticmethod
    def _parse(rows: list[dict[str, str]]) -> list[CommentEntry]:
        result: list[CommentEntry] = []
        for row in rows:
            if not row.get("username"):
                continue
            timestamp = row.get("timestamp")
            result.append(
                CommentEntry(
                    external_id=row.get("id"),
                    username=row["username"],
                    text=row.get("text", ""),
                    commented_at=datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    if timestamp
                    else datetime.now(timezone.utc),
                    source=CommentSource.INSTAGRAM,
                )
            )
        return result

