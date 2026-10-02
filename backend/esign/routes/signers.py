"""
signers.py - PUBLIC endpoints for signers (no auth required).
Uses the signing_token in the URL for identity.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from db import get_db_connection
from mailer import send_otp
from utils.generate_token import generate_otp
from utils.audit_logger import log_audit

router = APIRouter()

OTP_EXPIRY_MINUTES = 10
MAX_OTP_ATTEMPTS = 5  # (extend later with attempt tracking)


# ==========================================
# MODELS
# ==========================================

class VerifyOtpRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


# ==========================================
# ROUTE 1: GET SIGNER + DOCUMENT INFO
# ==========================================

@router.get("/sign/{token}")
def get_signer_view(token: str, request: Request):
    """
    Called when a signer opens their signing link.
    Returns document + signer info so the frontend can render the sign page.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                s.id, s.email, s.name, s.status, s.otp_verified_at,
                d.id AS document_id, d.name AS document_name,
                d.custom_message, d.file_url, d.status AS document_status,
                d.signature_page, d.signature_x, d.signature_y
            FROM signers s
            JOIN documents d ON d.id = s.document_id
            WHERE s.signing_token = %s
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid or expired signing link.")

        if row["document_status"] in ("declined", "expired"):
            raise HTTPException(status_code=410, detail=f"This document has been {row['document_status']}.")

        # Mark as viewed if first time
        if row["status"] == "pending":
            cur.execute(
                "UPDATE signers SET status = 'viewed' WHERE id = %s",
                (row["id"],),
            )
            conn.commit()
            log_audit(
                document_id=str(row["document_id"]),
                signer_id=str(row["id"]),
                event_type="viewed",
                ip_address=request.client.host,
            )

        return {
            "signer_id": str(row["id"]),
            "signer_name": row["name"],
            "signer_email": row["email"],
            "signer_status": row["status"] if row["status"] != "pending" else "viewed",
            "otp_verified": bool(row["otp_verified_at"]),
            "document_name": row["document_name"],
            "custom_message": row["custom_message"],
            "signature_placement": {
                "page": row["signature_page"],
                "x": row["signature_x"],
                "y": row["signature_y"],
            },
        }
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 2: SEND OTP TO SIGNER
# ==========================================

@router.post("/sign/{token}/send-otp")
def send_otp_to_signer(token: str, request: Request):
    """Generate and email a 6-digit OTP to the signer."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT s.id, s.email, s.name, s.document_id, d.name AS document_name
            FROM signers s JOIN documents d ON d.id = s.document_id
            WHERE s.signing_token = %s
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid signing link.")

        otp = generate_otp()
        expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

        cur.execute(
            """
            UPDATE signers
            SET otp_code = %s, otp_expires_at = %s
            WHERE id = %s
            """,
            (otp, expires, row["id"]),
        )
        conn.commit()

        # Send OTP email
        ok = send_otp(
            to=row["email"],
            signer_name=row["name"],
            document_name=row["document_name"],
            otp_code=otp,
            expiry_minutes=OTP_EXPIRY_MINUTES,
        )

        log_audit(
            document_id=str(row["document_id"]),
            signer_id=str(row["id"]),
            event_type="otp_sent",
            ip_address=request.client.host,
        )

        return {
            "message": f"OTP sent to {row['email']}",
            "expires_in_minutes": OTP_EXPIRY_MINUTES,
        }

    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 3: VERIFY OTP
# ==========================================

@router.post("/sign/{token}/verify-otp")
def verify_otp(token: str, payload: VerifyOtpRequest, request: Request):
    """Check the OTP entered by the signer."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, document_id, otp_code, otp_expires_at
            FROM signers WHERE signing_token = %s
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid signing link.")

        if not row["otp_code"]:
            raise HTTPException(status_code=400, detail="Please request an OTP first.")

        # Timezone-aware comparison
        expires_at = row["otp_expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

        if payload.code.strip() != row["otp_code"]:
            raise HTTPException(status_code=400, detail="Incorrect OTP.")

        # Mark verified & clear the code
        cur.execute(
            """
            UPDATE signers
            SET otp_verified_at = NOW(), status = 'otp_verified', otp_code = NULL
            WHERE id = %s
            """,
            (row["id"],),
        )
        conn.commit()

        log_audit(
            document_id=str(row["document_id"]),
            signer_id=str(row["id"]),
            event_type="otp_verified",
            ip_address=request.client.host,
        )

        return {"verified": True, "message": "Identity verified."}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Verification failed: {e}")
    finally:
        cur.close()
        conn.close()