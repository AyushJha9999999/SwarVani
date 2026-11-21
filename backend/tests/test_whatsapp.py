from __future__ import annotations

import hashlib
import hmac
import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app import db
from app.config import settings
from app.main import app
from app.whatsapp import apply_webhook, quick_reply_payload, verify_signature


class WhatsAppFollowUpTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_db_path = settings.db_path
        object.__setattr__(settings, "db_path", Path(self.temp_dir.name) / "test.db")
        db.init_db()
        db.save_record(
            {
                "id": "SV-TEST1234",
                "beneficiaryName": "Sita",
                "visitType": "ANC",
                "nextVisit": "2026-12-15",
                "followUps": ["Next ANC checkup: 2026-12-15"],
                "dangerSigns": [],
            }
        )

    def tearDown(self) -> None:
        object.__setattr__(settings, "db_path", self.original_db_path)
        self.temp_dir.cleanup()

    def test_quick_reply_updates_follow_up_board(self) -> None:
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "messages": [
                                    {
                                        "id": "wamid.test",
                                        "interactive": {
                                            "button_reply": {
                                                "id": quick_reply_payload("SV-TEST1234", "confirmed"),
                                                "title": "Confirm",
                                            }
                                        },
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        }
        self.assertEqual(
            apply_webhook(payload),
            [{"recordId": "SV-TEST1234", "status": "confirmed"}],
        )
        follow_up = db.follow_ups()[0]
        self.assertEqual(follow_up["whatsappStatus"], "confirmed")
        self.assertEqual(follow_up["whatsappLastReply"], "Confirm")
        updates = db.whatsapp_updates()
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0]["beneficiaryName"], "Sita")
        self.assertEqual(updates[0]["status"], "confirmed")
        self.assertEqual(db.whatsapp_status_summary()["confirmed"], 1)

        # Meta can retry a webhook; the message ID keeps the update feed idempotent.
        apply_webhook(payload)
        self.assertEqual(len(db.whatsapp_updates()), 1)

    def test_new_follow_up_defaults_to_no_response(self) -> None:
        self.assertEqual(db.follow_ups()[0]["whatsappStatus"], "no_response")

    def test_webhook_signature_validation(self) -> None:
        body = json.dumps({"object": "whatsapp_business_account"}).encode()
        secret = "test-secret"
        signature = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_signature(body, signature, secret))
        self.assertFalse(verify_signature(body, "sha256=wrong", secret))

    def test_signed_webhook_endpoint_updates_dashboard_feed(self) -> None:
        payload = {
            "entry": [{"changes": [{"value": {"messages": [{
                "id": "wamid.endpoint-test",
                "interactive": {"button_reply": {
                    "id": quick_reply_payload("SV-TEST1234", "asha_callback_requested"),
                    "title": "Request ASHA call",
                }},
            }]}}]}],
        }
        body = json.dumps(payload).encode()
        secret = "endpoint-secret"
        signature = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        original_secret = settings.whatsapp_app_secret
        try:
            object.__setattr__(settings, "whatsapp_app_secret", secret)
            with TestClient(app) as client:
                response = client.post(
                    "/api/whatsapp/webhook",
                    content=body,
                    headers={"Content-Type": "application/json", "X-Hub-Signature-256": signature},
                )
                self.assertEqual(response.status_code, 200)
                updates = client.get("/api/whatsapp/updates").json()
        finally:
            object.__setattr__(settings, "whatsapp_app_secret", original_secret)
        self.assertEqual(updates["updates"][0]["status"], "asha_callback_requested")
        self.assertEqual(updates["summary"]["asha_callback_requested"], 1)


if __name__ == "__main__":
    unittest.main()
