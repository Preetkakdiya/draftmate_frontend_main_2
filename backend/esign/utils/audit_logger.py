"""
audit_logger.py - Writes to the audit_events table.
Every important action creates a row for legal audit trails.
"""
import json
from typing import Optional
from db import get_db_connection


VALID_EVENT_TYPES = {
    "sent", "viewed", "otp_sent", "otp_verified",
    "signed", "completed", "declined", "reminder_sent"
}


def log_audit(
    document_id: str,
    event_type: str,
    signer_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> bool:
    """
    Records an audit event. Never raises — logs failure silently
    so an audit log problem cannot break the signing flow itself.
    """
    if event_type not in VALID_EVENT_TYPES:
        print(f"[AUDIT] ⚠️ Invalid event_type: {event_type}")
        return False

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO audit_events
                (document_id, signer_id, event_type, ip_address, metadata)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                document_id,
                signer_id,
                event_type,
                ip_address,
                json.dumps(metadata) if metadata else None,
            ),
        )
        conn.commit()
        print(f"[AUDIT] ✅ {event_type} logged for document {document_id[:8]}…")
        return True

    except Exception as e:
        print(f"[AUDIT] ❌ Failed to log {event_type}: {e}")
        if conn:
            conn.rollback()
        return False

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()