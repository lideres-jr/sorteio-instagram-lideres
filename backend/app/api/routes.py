from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.dependencies import get_draw_service, get_instagram_client, get_repository
from app.models import (
    DrawResponse,
    FetchCommentsRequest,
    FetchCommentsResponse,
    ManualFallbackRequest,
    ManualFallbackResponse,
    StatusResponse,
)
from app.repositories.base import DrawRepository
from app.services.draw import DrawService, NoEligibleEntriesError
from app.services.instagram import (
    InstagramAPIError,
    InstagramClient,
    InstagramConfigurationError,
)

router = APIRouter(prefix="/api")


@router.get("/health", response_model=StatusResponse, tags=["Sistema"])
async def health(settings: Settings = Depends(get_settings)) -> StatusResponse:
    return StatusResponse(status="ok", storage=settings.storage_backend)


@router.post(
    "/sorteio/buscar-comentarios",
    response_model=FetchCommentsResponse,
    tags=["Sorteio"],
)
async def fetch_comments(
    body: FetchCommentsRequest,
    repository: DrawRepository = Depends(get_repository),
    instagram: InstagramClient = Depends(get_instagram_client),
    settings: Settings = Depends(get_settings),
) -> FetchCommentsResponse:
    try:
        comments = await instagram.fetch_comments(
            body.media_id or settings.instagram_media_id
        )
    except InstagramConfigurationError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except InstagramAPIError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
    imported = await repository.save_comments(comments)
    return FetchCommentsResponse(
        imported=imported, total_entries=len(await repository.list_comments())
    )


@router.post("/sorteio/sortear", response_model=DrawResponse, tags=["Sorteio"])
async def draw(service: DrawService = Depends(get_draw_service)) -> DrawResponse:
    try:
        return await service.draw()
    except NoEligibleEntriesError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post(
    "/sorteio/fallback-manual",
    response_model=ManualFallbackResponse,
    tags=["Sorteio"],
)
async def manual_fallback(
    body: ManualFallbackRequest,
    repository: DrawRepository = Depends(get_repository),
    service: DrawService = Depends(get_draw_service),
) -> ManualFallbackResponse:
    comments = service.parse_manual_comments(body.comments)
    if not comments:
        raise HTTPException(422, "Nenhuma entrada manual valida foi informada.")
    imported = await repository.save_comments(comments)
    winner = await service.draw() if body.draw_now else None
    return ManualFallbackResponse(
        imported=imported,
        total_entries=len(await repository.list_comments()),
        winner=winner,
    )


@router.post("/sorteio/resetar", status_code=204, tags=["Sorteio"])
async def reset(repository: DrawRepository = Depends(get_repository)) -> None:
    await repository.reset()

