"""Deterministic danger-sign matcher.

This module is the safety layer. It is deliberately *not* an LLM: every
transcript (and every voice correction) is scanned here, before extraction,
so the referral alert can never depend on the model noticing a sign.

The prototype phrase list is grounded in the public NHM/MoHFW materials cited
in README.md. These keyword rules are a safety prompt, not a clinical protocol.

Policy:
  * A clear phrase match  -> confirm=True, spoken referral alert.
  * A weak/partial match  -> confirm=False, still flagged (uncertain match is
    treated as a flag, per the product requirement).
  * Negated phrases ("bukhar nahi hai") are ignored.
"""

from __future__ import annotations

import re
import json
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent / "data" / "danger_signs.json"

# Words that turn a symptom into its absence. Checked within a short window
# *before* the matched phrase.
NEGATIONS = (
    "nahi",
    "nahin",
    "nai",
    "no",
    "not",
    "without",
    "denies",
    "नहीं",
    "नही",
)


@dataclass(frozen=True)
class DangerSign:
    key: str
    label_en: str
    label_hi: str
    action_hi: str
    phrases: tuple[str, ...]
    fuzzy: tuple[str, ...] = ()
    who: str = "newborn"
    source: str = ""


_catalog = json.loads(DATA_PATH.read_text(encoding="utf-8"))
SOURCE = str(_catalog["source"])
DANGER_SIGNS: tuple[DangerSign, ...] = tuple(
    DangerSign(
        key=item["key"],
        label_en=item["label_en"],
        label_hi=item["label_hi"],
        action_hi=item["action_hi"],
        phrases=tuple(item.get("phrases", [])),
        fuzzy=tuple(item.get("fuzzy", [])),
        who=item.get("who", "newborn"),
        source=item.get("source", SOURCE),
    )
    for item in _catalog["signs"]
)

DANGER_BY_KEY = {sign.key: sign for sign in DANGER_SIGNS}


@dataclass
class Match:
    key: str
    label_en: str
    label_hi: str
    action_hi: str
    matched_phrase: str
    confident: bool
    source: str = SOURCE

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "labelEn": self.label_en,
            "labelHi": self.label_hi,
            "actionHi": self.action_hi,
            "matched": self.matched_phrase,
            "confident": self.confident,
            "source": self.source,
        }


def normalize(text: str) -> str:
    """Lowercase, strip punctuation/diacritics, collapse whitespace."""
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^\w\s\u0900-\u097F]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return f" {text.strip()} "


def _negated(normalized: str, phrase: str) -> bool:
    """True when the phrase is denied, before or after it.

    Hindi negates after the noun ("bukhar nahi hai") while English often
    negates before ("no fever"), so both sides are checked -- but only within
    a very short window, so an unrelated "nahi" in the next clause does not
    erase a real sign.
    """
    # Evaluate each occurrence independently; negation in a separate clause
    # must not suppress a later positive mention. Internal negation belongs
    # to the sign itself (e.g. "not feeding" / "doodh nahi").
    occurrences = list(re.finditer(r"(?<!\S)" + re.escape(phrase) + r"(?!\S)", normalized))
    if not occurrences:
        return False
    for match in occurrences:
        before = normalized[:match.start()].split()[-3:]
        after = normalized[match.end():].split()[:3]
        if not any(normalize(token).strip() in {normalize(n).strip() for n in NEGATIONS} for token in before + after):
            return False
    return True


def scan(text: str) -> list[Match]:
    """Return every danger sign mentioned in `text` (deduplicated by key)."""
    if not text or not text.strip():
        return []
    # Preserve clause boundaries before normalization removes punctuation.
    clauses = re.split(r"[,;.!।?]|\b(?:but|and|aur|lekin)\b|(?:लेकिन|और|परंतु)", text, flags=re.I)
    norms = [normalize(clause) for clause in clauses if clause.strip()]
    found: dict[str, Match] = {}

    for sign in DANGER_SIGNS:
        if sign.key in found:
            continue
        for phrase in sign.phrases:
            normalized_phrase = normalize(phrase).strip()
            needle = f" {normalized_phrase} "
            if any(needle in norm and not _negated(norm, normalized_phrase) for norm in norms):
                found[sign.key] = Match(
                    key=sign.key,
                    label_en=sign.label_en,
                    label_hi=sign.label_hi,
                    action_hi=sign.action_hi,
                    matched_phrase=phrase,
                    confident=True,
                )
                break
        if sign.key in found:
            continue
        # Weak matches are still flags: an uncertain sign is never dropped.
        for phrase in sign.fuzzy:
            normalized_phrase = normalize(phrase).strip()
            needle = f" {normalized_phrase} "
            if any(needle in norm and not _negated(norm, normalized_phrase) for norm in norms):
                found[sign.key] = Match(
                    key=sign.key,
                    label_en=sign.label_en,
                    label_hi=sign.label_hi,
                    action_hi=sign.action_hi,
                    matched_phrase=phrase,
                    confident=False,
                )
                break

    return list(found.values())


def referral_message(matches: list[Match]) -> str:
    """Fixed, template-only referral line. Never generated text."""
    if not matches:
        return ""
    labels = ", ".join(m.label_hi for m in matches)
    actions = []
    for m in matches:
        if m.action_hi not in actions:
            actions.append(m.action_hi)
    return (
        f"Dhyan dijiye. {labels}. "
        f"{' '.join(actions)}. "
        "Yeh salah guideline par based hai, dawa nahi."
    )
