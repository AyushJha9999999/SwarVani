"""Gnani Prisma v3.0 and Timbre v3.0 WebSocket adapters.

Audio and transcripts stay on the backend connection. The browser never receives
the Gnani credential. The wire formats follow Gnani's public streaming contract.
"""

from __future__ import annotations

import base64
import json
from typing import Any

import websockets

from .config import settings


def _headers() -> dict[str, str]:
    return {"X-API-Key-ID": settings.gnani_api_key}


async def open_stt():
    """Connect to Prisma and initialize a mono 16 kHz PCM stream."""
    if not settings.gnani_api_key:
        raise RuntimeError("GNANI_API_KEY is not configured")
    headers = {
        **_headers(),
        "model": "prisma-v3.0",
        "language_code": settings.language,
        "format": "codemix",
        "x-sample-rate": "16000",
    }
    return await websockets.connect(settings.gnani_stt_ws_url, additional_headers=headers)


async def parse_stt_message(message: str | bytes) -> dict[str, Any] | None:
    if isinstance(message, bytes):
        return None
    try:
        data = json.loads(message)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    if data.get("type") == "error":
        return {"error": str(data.get("message") or "Gnani Prisma reported an error")}
    transcript = data.get("transcript") or data.get("text")
    if not transcript:
        return {"done": data.get("type") in {"end", "done", "complete"}} if data.get("type") in {"end", "done", "complete"} else None
    return {
        "text": str(transcript),
        "final": bool(data.get("is_final", data.get("final", True))),
        "done": False,
    }


async def synthesize(text: str) -> str | None:
    """Synthesize a line through Timbre's realtime WebSocket API.

    Timbre emits JSON audio events with base64 payloads. Accumulate them into a
    WAV data URL for the browser audio player.
    """
    if not settings.gnani_api_key or not text:
        return None
    try:
        async with websockets.connect(settings.gnani_tts_ws_url, additional_headers=_headers()) as ws:
            await ws.send(
                json.dumps(
                    {
                        "text": text,
                        "voice": settings.gnani_tts_voice,
                        "language": settings.language,
                        "model": "timbre-v3.0",
                        "audio_config": {
                            "sample_rate": 16000,
                            "num_channels": 1,
                            "sample_width": 2,
                            "encoding": "linear_pcm",
                            "container": "wav",
                        },
                    }
                )
            )
            chunks: list[bytes] = []
            async for frame in ws:
                if isinstance(frame, bytes):
                    chunks.append(frame)
                    continue
                try:
                    event = json.loads(frame)
                except json.JSONDecodeError:
                    continue
                kind = event.get("type")
                if kind == "error":
                    return None
                audio = event.get("data", {}).get("audio") or event.get("audio")
                if audio:
                    chunks.append(base64.b64decode(audio))
                if kind in {"complete", "done", "end"}:
                    break
            if chunks:
                return "data:audio/wav;base64," + base64.b64encode(b"".join(chunks)).decode()
    except Exception:
        return None
    return None
