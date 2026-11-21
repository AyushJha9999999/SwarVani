"""SQLite storage with optional encryption at rest.

Records (including the transcript) are serialised to JSON and encrypted with
Fernet when SV_DB_KEY is set. Without a key the app still runs, but the mode is
reported so the UI can warn; the hackathon build must ship with a key.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import settings

try:  # cryptography is optional at runtime
    from cryptography.fernet import Fernet, InvalidToken

    _FERNET_OK = True
except Exception:  # pragma: no cover
    Fernet = None  # type: ignore[assignment]
    InvalidToken = Exception  # type: ignore[assignment,misc]
    _FERNET_OK = False


_fernet = None


def _cipher():
    global _fernet
    if _fernet is None and settings.db_key and _FERNET_OK:
        _fernet = Fernet(settings.db_key.encode())
    return _fernet


def encryption_enabled() -> bool:
    return _cipher() is not None


@contextmanager
def _connect():
    path: Path = settings.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                payload TEXT NOT NULL,
                encrypted INTEGER NOT NULL DEFAULT 0,
                danger INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at DESC)")
        conn.commit()


def save_record(record: dict[str, Any]) -> None:
    payload = json.dumps(record, ensure_ascii=False)
    cipher = _cipher()
    encrypted = 0
    if cipher is not None:
        payload = cipher.encrypt(payload.encode()).decode()
        encrypted = 1
    with _connect() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO records (id, created_at, payload, encrypted, danger) VALUES (?,?,?,?,?)",
            (
                record["id"],
                record.get("createdAt") or datetime.now(timezone.utc).isoformat(timespec="seconds"),
                payload,
                encrypted,
                1 if record.get("dangerSigns") else 0,
            ),
        )
        conn.commit()


def _decode(payload: str, encrypted: int) -> dict[str, Any]:
    if encrypted:
        cipher = _cipher()
        if cipher is None:
            return {"id": "locked", "error": "record encrypted, SV_DB_KEY not set"}
        try:
            payload = cipher.decrypt(payload.encode()).decode()
        except InvalidToken:
            return {"id": "locked", "error": "cannot decrypt record"}
    return json.loads(payload)


def list_records(limit: int = 50) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT payload, encrypted FROM records ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
    records = []
    for row in rows:
        item = _decode(row["payload"], row["encrypted"])
        item.pop("transcript", None)  # transcripts are not served over HTTP
        records.append(item)
    return records


def follow_ups() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for record in list_records(limit=100):
        for line in record.get("followUps", []):
            out.append(
                {
                    "recordId": record.get("id"),
                    "beneficiaryName": record.get("beneficiaryName"),
                    "visitType": record.get("visitType"),
                    "nextVisit": record.get("nextVisit"),
                    "line": line,
                    "danger": bool(record.get("dangerSigns")),
                }
            )
    out.sort(key=lambda item: (item["nextVisit"] or "9999", item["beneficiaryName"] or ""))
    return out


def purge_transcripts() -> int:
    """Delete transcript text from every stored record (DPDP retention step)."""
    removed = 0
    with _connect() as conn:
        rows = conn.execute("SELECT id, payload, encrypted FROM records").fetchall()
        for row in rows:
            record = _decode(row["payload"], row["encrypted"])
            if not record.get("transcript"):
                continue
            record["transcript"] = ""
            record["transcriptPurged"] = True
            payload = json.dumps(record, ensure_ascii=False)
            encrypted = 0
            cipher = _cipher()
            if cipher is not None:
                payload = cipher.encrypt(payload.encode()).decode()
                encrypted = 1
            conn.execute(
                "UPDATE records SET payload = ?, encrypted = ? WHERE id = ?",
                (payload, encrypted, row["id"]),
            )
            removed += 1
        conn.commit()
    return removed


def stats() -> dict[str, Any]:
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) AS c FROM records").fetchone()["c"]
        flagged = conn.execute("SELECT COUNT(*) AS c FROM records WHERE danger = 1").fetchone()["c"]
    return {"visits": total, "flagged": flagged}
