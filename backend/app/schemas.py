"""Visit-record shape shared by the extractor, pipeline and HTTP API."""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone, timedelta
from typing import Any

VISIT_TYPES = ("ANC", "PNC", "IMMUNISATION", "NEWBORN", "GROWTH", "OTHER")

# Fields the voice agent is allowed to read back / patch.
EDITABLE_FIELDS = (
    "beneficiaryName",
    "beneficiaryId",
    "visitType",
    "weightKg",
    "bp",
    "hb",
    "vaccination",
    "supplements",
    "nextVisit",
    "notes",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class VisitRecord:
    id: str = field(default_factory=lambda: f"SV-{uuid.uuid4().hex[:8].upper()}")
    beneficiaryName: str | None = None
    beneficiaryId: str | None = None
    visitType: str = "OTHER"
    weightKg: float | None = None
    bp: str | None = None
    hb: float | None = None
    vaccination: str | None = None
    supplements: list[str] = field(default_factory=list)
    nextVisit: str | None = None
    notes: str | None = None
    dangerSigns: list[dict[str, Any]] = field(default_factory=list)
    followUps: list[str] = field(default_factory=list)
    transcript: str = ""
    corrections: list[dict[str, Any]] = field(default_factory=list)
    createdAt: str = field(default_factory=_now)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def empty_record() -> VisitRecord:
    return VisitRecord()


def missing_fields(record: VisitRecord) -> list[str]:
    required = ("beneficiaryName", "visitType", "weightKg", "nextVisit")
    return [f for f in required if not getattr(record, f)]


def follow_up_lines(record: VisitRecord) -> list[str]:
    """Deterministic follow-up text derived from the record, never free-form."""
    lines: list[str] = []
    when = record.nextVisit or "date not captured"
    if record.visitType == "IMMUNISATION":
        lines.append(f"Next immunisation due: {when}")
    elif record.visitType == "ANC":
        lines.append(f"Next ANC checkup: {when}")
        lines.append("Check BP and weight at next visit")
    elif record.visitType == "PNC":
        lines.append(f"Next postnatal check: {when}")
    elif record.visitType == "NEWBORN":
        lines.append(f"Next newborn follow-up: {when}")
    else:
        lines.append(f"Next visit: {when}")

    if record.vaccination:
        lines.append(f"Record vaccination: {record.vaccination}")
    if record.dangerSigns:
        lines.append("DANGER FLAG OPEN - confirm PHC referral was completed")
    if record.visitType == "ANC" and not record.hb:
        lines.append("Hb not recorded - capture at next contact")
    return lines


def parse_date_hint(value: str | None, today: date | None = None) -> str | None:
    """Best-effort parse of 'agle mahine 15 ko' style dates into ISO."""
    if not value:
        return None
    normalized = value.strip()
    try:
        return date.fromisoformat(normalized).isoformat()
    except ValueError:
        pass
    import re

    iso_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", normalized)
    if iso_match:
        try:
            return date.fromisoformat(iso_match.group(1)).isoformat()
        except ValueError:
            return None
    today = today or date.today()
    text = value.lower().strip()
    if re.search(r"\bday after tomorrow\b|परसों", text):
        return (today + timedelta(days=2)).isoformat()
    if re.search(r"\btomorrow\b|कल", text):
        return (today + timedelta(days=1)).isoformat()
    if re.search(r"\btoday\b|आज", text):
        return today.isoformat()
    if re.search(r"\bnext week\b|अगले हफ्ते|अगले सप्ताह", text):
        return (today + timedelta(days=7)).isoformat()
    day_match = None
    m = re.search(r"(\d{1,2})", text)
    if m:
        day_match = int(m.group(1))
    if not day_match:
        return None
    if day_match < 1 or day_match > 31:
        return None

    if "agle mahine" in text or "next month" in text or "अगले महीने" in text:
        year = today.year + (1 if today.month == 12 else 0)
        month = 1 if today.month == 12 else today.month + 1
    elif "is mahine" in text or "this month" in text:
        year, month = today.year, today.month
    else:
        year, month = today.year, today.month
        if day_match < today.day:
            month = month + 1 if month < 12 else 1
            year = year + (1 if month == 1 else 0)
    try:
        return date(year, month, day_match).isoformat()
    except ValueError:
        return None
