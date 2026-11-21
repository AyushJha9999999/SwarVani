"""Headless smoke test for the safety layer and session flow.

    cd backend && python -m scripts.smoke

No server, no keys, no database writes are required.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import danger_signs  # noqa: E402
from app.pipeline import VisitSession  # noqa: E402

NOTE = (
    "Sunita Devi ka ANC checkup kiya, weight 52 kilo, TT injection de diya, "
    "IFA goli di hai, agle mahine 15 ko aana hai."
)
CORRECTION = "nahi, weight 2.8 kilo"


def check(label: str, ok: bool) -> None:
    print(f"{'PASS' if ok else 'FAIL'}  {label}")
    if not ok:
        raise SystemExit(1)


async def main() -> None:
    # 1. Rule engine: positive, negated, and code-mix coverage.
    hits = danger_signs.scan("bacche ko bukhar hai aur saans tez chal rahi hai")
    keys = {h.key for h in hits}
    check("detects fever + fast breathing", {"fever", "fast_breathing"} <= keys)
    check("ignores negated symptom", danger_signs.scan("bukhar nahi hai") == [])
    check("matches Devanagari", any(h.key == "convulsions" for h in danger_signs.scan("झटके आ रहे हैं")))
    check("uncertain match still flags", any(not h.confident for h in danger_signs.scan("temperature 38 degree")))

    # 2. Extraction + read-back + save.
    session = VisitSession()
    await session.handle({"type": "start"})
    events = await session.handle({"type": "utterance", "text": NOTE})
    record = next(e["record"] for e in events if e["type"] == "record")
    check("extracts name", record["beneficiaryName"] == "Sunita Devi")
    check("extracts ANC visit", record["visitType"] == "ANC")
    check("extracts weight", record["weightKg"] == 52)
    check("extracts TT", record["vaccination"] == "TT")
    check("extracts IFA", "IFA" in record["supplements"])
    check("extracts next visit", bool(record["nextVisit"]))
    check("read-back is emitted", any(e["type"] == "agent" and e.get("kind") == "readback" for e in events))
    check("no danger flag on clean note", record["dangerSigns"] == [])

    # 3. Field-level correction changes only the weight.
    corrected = await session.handle({"type": "correct", "text": CORRECTION})
    updated = next(e["record"] for e in corrected if e["type"] == "record")
    check("correction updates weight", updated["weightKg"] == 2.8)
    check("correction keeps name", updated["beneficiaryName"] == "Sunita Devi")
    check("correction keeps vaccination", updated["vaccination"] == "TT")

    saved = await session.handle({"type": "confirm"})
    check("saves record", any(e["type"] == "saved" for e in saved))

    # 4. Danger sign on a second session escalates before the read-back.
    danger_session = VisitSession()
    await danger_session.handle({"type": "start"})
    danger_events = await danger_session.handle({"type": "utterance", "text": "naye bachche ko jhatke aa rahe hain"})
    kinds = [e["type"] for e in danger_events]
    check("danger event precedes read-back", "danger" in kinds and kinds.index("danger") < kinds.index("agent"))
    check("referral is template text", "PHC" in next(e["message"] for e in danger_events if e["type"] == "danger"))

    print("\nAll smoke checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
