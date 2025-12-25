"""Screenshot endpoints for Pi display streaming."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query
from fastapi.responses import Response, StreamingResponse

from app.services.screenshot import screenshot_service

router = APIRouter()


@router.get("/views")
async def list_views() -> dict[str, list[str] | bool]:
    """List available screenshot views."""
    return {
        "views": screenshot_service.views,
        "running": screenshot_service.is_running,
    }


@router.get("/{view}.jpg")
async def get_screenshot(
    view: Annotated[str, Path(description="View name to capture")],
) -> Response:
    """Get a single screenshot as JPEG.

    Fast endpoint for Pi to poll - page is already loaded in memory.
    """
    if not screenshot_service.is_running:
        raise HTTPException(status_code=503, detail="Screenshot service not running")

    if view not in screenshot_service.views:
        raise HTTPException(status_code=404, detail=f"Unknown view: {view}")

    try:
        data = await screenshot_service.capture(view)
        return Response(
            content=data,
            media_type="image/jpeg",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stream/{view}")
async def stream_view(
    view: Annotated[str, Path(description="View name to stream")],
    fps: Annotated[float, Query(ge=0.1, le=30, description="Target FPS")] = 5.0,
) -> StreamingResponse:
    """Stream a view as MJPEG.

    Pi can open this directly with mpv or ffplay:
       mpv --no-cache http://localhost:8080/api/screenshot/stream/leaderboard
    """
    if not screenshot_service.is_running:
        raise HTTPException(status_code=503, detail="Screenshot service not running")

    if view not in screenshot_service.views:
        raise HTTPException(status_code=404, detail=f"Unknown view: {view}")

    interval = 1.0 / fps

    async def generate():
        while True:
            try:
                frame = await screenshot_service.capture(view)
                header = (
                    b"--frame\r\n"
                    + b"Content-Type: image/jpeg\r\n"
                    + b"Content-Length: "
                    + str(len(frame)).encode()
                    + b"\r\n"
                    + b"\r\n"
                )
                yield header + frame + b"\r\n"
                await asyncio.sleep(interval)
            except Exception:
                break

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.post("/reload")
async def reload_all_views() -> dict[str, str]:
    """Reload all view pages (useful after frontend changes)."""
    if not screenshot_service.is_running:
        raise HTTPException(status_code=503, detail="Screenshot service not running")

    await screenshot_service.reload_all()
    return {"status": "ok", "message": "All views reloaded"}


@router.post("/reload/{view}")
async def reload_view(
    view: Annotated[str, Path(description="View name to reload")],
) -> dict[str, str]:
    """Reload a specific view page."""
    if not screenshot_service.is_running:
        raise HTTPException(status_code=503, detail="Screenshot service not running")

    if view not in screenshot_service.views:
        raise HTTPException(status_code=404, detail=f"Unknown view: {view}")

    await screenshot_service.reload_page(view)
    return {"status": "ok", "message": f"View {view} reloaded"}
