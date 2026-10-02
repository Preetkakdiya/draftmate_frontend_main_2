"""
documents.py - Envelope (document + signers) management endpoints.
Version 2 — supports signing order, signer colors, field-aware responses.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, Response
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from db import get_db_connection
from auth_dependency import get_current_user_id
from storage_manager import storage
from mailer import send_signing_request, send_reminder
from utils.generate_token import generate_signing_token
from utils.audit_logger import log_audit
from models import (
    SignerAddRequest, SignerUpdateRequest, SendEnvelopeRequest,
    DocumentUpdateRequest
)

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
MAX_PDF_SIZE_MB = 15

# Preset color palette for signers (cycled)
SIGNER_COLORS = [
    "#2563EB",  # Blue
    "#8B5CF6",  # Purple  
    "#10B981",  # Emerald
    "#F59E0B",  # Amber
    "#EF4444",  # Red
    "#EC4899",  # Pink
    "#14B8A6",  # Teal
    "#F97316",  # Orange
]


def _next_signer_color(cur, document_id: str) -> str:
    """Pick the next available color for a new signer."""
    cur.execute(
        "SELECT COUNT(*) AS c FROM signers WHERE document_id = %s",
        (document_id,)
    )
    count = cur.fetchone()["c"]
    return SIGNER_COLORS[count % len(SIGNER_COLORS)]


# ==========================================
# ROUTE 1: UPLOAD PDF & CREATE ENVELOPE
# ==========================================

@router.post("/documents", status_code=201)
async def create_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    custom_message: Optional[str] = Form(None),
    signing_order: Optional[str] = Form("parallel"),
    document_type: Optional[str] = Form("other_permitted_document"),
    user_id: str = Depends(get_current_user_id),
):
    """Upload PDF and create a draft envelope."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_PDF_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max {MAX_PDF_SIZE_MB} MB.",
        )

    if signing_order not in ("parallel", "sequential"):
        raise HTTPException(status_code=400, detail="signing_order must be 'parallel' or 'sequential'.")

    file_url = storage.save_original(file_bytes, file.filename)

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO documents
                (sender_id, name, file_url, custom_message,
                 signing_order, document_type)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, name, status, file_url, signing_order, document_type, created_at
            """,
            (user_id, name, file_url, custom_message, signing_order, document_type),
        )
        doc = cur.fetchone()
        conn.commit()

        return {
            "id": str(doc["id"]),
            "name": doc["name"],
            "status": doc["status"],
            "file_url": doc["file_url"],
            "signing_order": doc["signing_order"],
            "document_type": doc["document_type"],
            "created_at": doc["created_at"].isoformat(),
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create document: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 2: UPDATE ENVELOPE SETTINGS
# ==========================================

@router.patch("/documents/{document_id}")
def update_document(
    document_id: str,
    updates: DocumentUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Update envelope settings (before send)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT sender_id, status FROM documents WHERE id = %s", (document_id,))
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your document.")
        if doc["status"] != "draft":
            raise HTTPException(status_code=400, detail=f"Cannot edit '{doc['status']}' document.")

        update_data = updates.model_dump(exclude_unset=True)
        if not update_data:
            return {"message": "No changes."}

        set_parts = [f"{k} = %s" for k in update_data.keys()]
        values = list(update_data.values()) + [document_id]

        cur.execute(f"UPDATE documents SET {', '.join(set_parts)} WHERE id = %s", tuple(values))
        conn.commit()

        return {"message": "Document updated."}
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 3: ADD SIGNER TO DOCUMENT
# ==========================================

@router.post("/documents/{document_id}/signers", status_code=201)
def add_signer(
    document_id: str,
    signer: SignerAddRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Add a signer to a draft envelope."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT sender_id, status FROM documents WHERE id = %s", (document_id,))
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your document.")
        if doc["status"] != "draft":
            raise HTTPException(status_code=400, detail=f"Cannot add signers to '{doc['status']}' doc.")

        token = generate_signing_token()
        color = signer.color if signer.color != "#2563EB" else _next_signer_color(cur, document_id)

        cur.execute(
            """
            INSERT INTO signers 
                (document_id, email, name, role, signing_order, color, signing_token)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (document_id, signer.email.lower(), signer.name, signer.role,
             signer.signing_order, color, token),
        )
        row = cur.fetchone()
        conn.commit()

        return {
            "id": str(row["id"]),
            "email": row["email"],
            "name": row["name"],
            "role": row["role"],
            "status": row["status"],
            "signing_order": row["signing_order"],
            "color": row["color"],
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add signer: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 4: UPDATE SIGNER
# ==========================================

@router.patch("/signers/{signer_id}")
def update_signer(
    signer_id: str,
    updates: SignerUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Update signer name/email/role/order/color (before send)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT s.*, d.sender_id, d.status AS doc_status
            FROM signers s JOIN documents d ON d.id = s.document_id
            WHERE s.id = %s
            """,
            (signer_id,)
        )
        signer = cur.fetchone()
        if not signer:
            raise HTTPException(status_code=404, detail="Signer not found.")
        if str(signer["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your signer.")
        if signer["doc_status"] != "draft":
            raise HTTPException(status_code=400, detail="Cannot edit signers on sent document.")

        update_data = updates.model_dump(exclude_unset=True)
        if not update_data:
            return {"message": "No changes."}

        set_parts = [f"{k} = %s" for k in update_data.keys()]
        values = list(update_data.values()) + [signer_id]

        cur.execute(f"UPDATE signers SET {', '.join(set_parts)} WHERE id = %s", tuple(values))
        conn.commit()

        return {"message": "Signer updated."}
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 5: REMOVE SIGNER
# ==========================================

@router.delete("/signers/{signer_id}")
def delete_signer(
    signer_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Remove a signer (also deletes their fields)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT s.id, d.sender_id, d.status AS doc_status
            FROM signers s JOIN documents d ON d.id = s.document_id
            WHERE s.id = %s
            """,
            (signer_id,)
        )
        signer = cur.fetchone()
        if not signer:
            raise HTTPException(status_code=404, detail="Signer not found.")
        if str(signer["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your signer.")
        if signer["doc_status"] != "draft":
            raise HTTPException(status_code=400, detail="Cannot remove signer from sent document.")

        # CASCADE will delete their fields
        cur.execute("DELETE FROM signers WHERE id = %s", (signer_id,))
        conn.commit()

        return {"message": "Signer removed."}
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 6: SEND ENVELOPE
# ==========================================

@router.post("/documents/{document_id}/send")
def send_envelope(
    document_id: str,
    sender_info: SendEnvelopeRequest = SendEnvelopeRequest(),
    request: Request = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Finalize the envelope. In PARALLEL mode: all signers get emails simultaneously.
    In SEQUENTIAL mode: only signer #1 gets email (others notified when their turn comes).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id, sender_id, name, custom_message, status, signing_order FROM documents WHERE id = %s",
            (document_id,)
        )
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your document.")
        if doc["status"] != "draft":
            raise HTTPException(status_code=400, detail=f"Document already {doc['status']}.")

        # Fetch signers ordered by signing_order
        cur.execute(
            """
            SELECT * FROM signers 
            WHERE document_id = %s AND role = 'signer'
            ORDER BY signing_order ASC, created_at ASC
            """,
            (document_id,)
        )
        signers = cur.fetchall()
        if not signers:
            raise HTTPException(status_code=400, detail="Add at least one signer first.")

        # Verify at least one field exists (guardrail)
        cur.execute("SELECT COUNT(*) AS c FROM fields WHERE document_id = %s", (document_id,))
        field_count = cur.fetchone()["c"]
        if field_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Add at least one field (signature/date/text) before sending."
            )

        # Determine who gets emails
        if doc["signing_order"] == "sequential":
            signers_to_email = [signers[0]]  # Only first signer
        else:
            signers_to_email = signers  # Everyone

        # Update document status FIRST
        cur.execute("UPDATE documents SET status = 'sent' WHERE id = %s", (document_id,))
        conn.commit()

        # Send emails
        sent_count = 0
        for s in signers_to_email:
            signing_link = f"{FRONTEND_URL}/sign/{s['signing_token']}"
            ok = send_signing_request(
                to=s["email"],
                signer_name=s["name"],
                document_name=doc["name"],
                sender_name=sender_info.sender_name,
                signing_link=signing_link,
                custom_message=doc["custom_message"],
            )
            if ok:
                sent_count += 1

            log_audit(
                document_id=document_id,
                signer_id=str(s["id"]),
                event_type="sent",
                ip_address=request.client.host if request else None,
                metadata={"signing_order_mode": doc["signing_order"]},
            )

        # Also log viewers (they don't get emails yet — could add later)
        cur.execute(
            "SELECT id, email, name FROM signers WHERE document_id = %s AND role = 'viewer'",
            (document_id,)
        )
        viewers = cur.fetchall()

        return {
            "message": f"Envelope sent to {sent_count} signer(s) in {doc['signing_order']} mode.",
            "total_signers": len(signers),
            "total_viewers": len(viewers),
            "signing_mode": doc["signing_order"],
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send envelope: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 7: LIST ALL ENVELOPES FOR USER
# ==========================================

@router.get("/documents")
def list_documents(user_id: str = Depends(get_current_user_id)):
    """List all envelopes created by the logged-in user."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT
                d.id, d.name, d.status, d.signing_order, d.document_type,
                d.created_at, d.completed_at,
                (SELECT COUNT(*) FROM signers s WHERE s.document_id = d.id AND s.role = 'signer') AS total_signers,
                (SELECT COUNT(*) FROM signers s WHERE s.document_id = d.id AND s.status = 'signed') AS signed_count,
                (SELECT COUNT(*) FROM fields f WHERE f.document_id = d.id) AS total_fields
            FROM documents d
            WHERE d.sender_id = %s
            ORDER BY d.created_at DESC
            """,
            (user_id,)
        )
        rows = cur.fetchall()

        return {
            "documents": [
                {
                    "id": str(r["id"]),
                    "name": r["name"],
                    "status": r["status"],
                    "signing_order": r["signing_order"],
                    "document_type": r["document_type"],
                    "total_signers": r["total_signers"],
                    "signed_count": r["signed_count"],
                    "total_fields": r["total_fields"],
                    "created_at": r["created_at"].isoformat(),
                    "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
                }
                for r in rows
            ]
        }
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 8: GET ENVELOPE DETAIL
# ==========================================

@router.get("/documents/{document_id}")
def get_document_detail(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Full envelope info: document + signers + fields + audit trail."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM documents WHERE id = %s", (document_id,))
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your document.")

        cur.execute(
            """
            SELECT id, email, name, role, status, signing_order, color, 
                   signed_at, signature_method
            FROM signers WHERE document_id = %s 
            ORDER BY signing_order ASC, created_at ASC
            """,
            (document_id,)
        )
        signers = cur.fetchall()

        cur.execute(
            """
            SELECT f.*, s.name AS signer_name, s.color AS signer_color
            FROM fields f JOIN signers s ON s.id = f.signer_id
            WHERE f.document_id = %s
            ORDER BY f.page_number ASC, f.y_position DESC
            """,
            (document_id,)
        )
        fields = cur.fetchall()

        cur.execute(
            """
            SELECT event_type, ip_address, metadata, created_at
            FROM audit_events WHERE document_id = %s ORDER BY created_at DESC
            """,
            (document_id,)
        )
        audit = cur.fetchall()

        return {
            "document": {
                "id": str(doc["id"]),
                "name": doc["name"],
                "status": doc["status"],
                "signing_order": doc["signing_order"],
                "document_type": doc["document_type"],
                "custom_message": doc["custom_message"],
                "created_at": doc["created_at"].isoformat(),
                "completed_at": doc["completed_at"].isoformat() if doc["completed_at"] else None,
                "final_file_url": doc["final_file_url"],
            },
            "signers": [
                {
                    "id": str(s["id"]),
                    "email": s["email"],
                    "name": s["name"],
                    "role": s["role"],
                    "status": s["status"],
                    "signing_order": s["signing_order"],
                    "color": s["color"],
                    "signed_at": s["signed_at"].isoformat() if s["signed_at"] else None,
                    "signature_method": s["signature_method"],
                }
                for s in signers
            ],
            "fields": [
                {
                    "id": str(f["id"]),
                    "signer_id": str(f["signer_id"]),
                    "signer_name": f["signer_name"],
                    "signer_color": f["signer_color"],
                    "field_type": f["field_type"],
                    "page_number": f["page_number"],
                    "x_position": f["x_position"],
                    "y_position": f["y_position"],
                    "width": f["width"],
                    "height": f["height"],
                    "required": f["required"],
                    "filled_value": f["filled_value"],
                    "filled_at": f["filled_at"].isoformat() if f["filled_at"] else None,
                }
                for f in fields
            ],
            "audit": [
                {
                    "event_type": a["event_type"],
                    "ip_address": a["ip_address"],
                    "metadata": a["metadata"],
                    "created_at": a["created_at"].isoformat(),
                }
                for a in audit
            ],
        }
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 9: SEND REMINDERS
# ==========================================

@router.post("/documents/{document_id}/remind")
def send_reminders(
    document_id: str,
    request: Request = None,
    user_id: str = Depends(get_current_user_id),
):
    """Resend signing link to all pending signers (respects sequential mode)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT sender_id, name, signing_order FROM documents WHERE id = %s",
            (document_id,)
        )
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your document.")

        # In sequential mode: only remind the CURRENT signer
        if doc["signing_order"] == "sequential":
            cur.execute(
                """
                SELECT * FROM signers 
                WHERE document_id = %s AND role = 'signer' AND status NOT IN ('signed', 'declined')
                ORDER BY signing_order ASC LIMIT 1
                """,
                (document_id,)
            )
            pending = cur.fetchall()
        else:
            cur.execute(
                """
                SELECT * FROM signers
                WHERE document_id = %s AND role = 'signer' AND status NOT IN ('signed', 'declined')
                """,
                (document_id,)
            )
            pending = cur.fetchall()

        if not pending:
            raise HTTPException(status_code=400, detail="No pending signers to remind.")

        count = 0
        for s in pending:
            link = f"{FRONTEND_URL}/sign/{s['signing_token']}"
            if send_reminder(
                to=s["email"],
                signer_name=s["name"],
                document_name=doc["name"],
                signing_link=link,
            ):
                count += 1
            log_audit(
                document_id=document_id,
                signer_id=str(s["id"]),
                event_type="reminder_sent",
                ip_address=request.client.host if request else None,
            )

        return {"message": f"Reminder sent to {count} signer(s)."}
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 10: VOID DOCUMENT
# ==========================================

@router.delete("/documents/{document_id}")
def void_document(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Void an envelope (soft-delete)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT sender_id FROM documents WHERE id = %s", (document_id,))
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your document.")

        cur.execute("UPDATE documents SET status = 'declined' WHERE id = %s", (document_id,))
        conn.commit()
        log_audit(document_id=document_id, event_type="declined")

        return {"message": "Envelope voided."}
    finally:
        cur.close()
        conn.close()

# ==========================================
# ROUTE 11: SERVE ORIGINAL PDF (for editor)
# ==========================================

@router.get("/documents/{document_id}/pdf")
def serve_original_pdf(
    document_id: str,
    token: Optional[str] = None,
):
    """
    Serves the original uploaded PDF for viewing in the editor.
    Accepts session_id via query param `?token=...` since <embed> tags
    can't set Authorization headers.
    """
    # Manual auth check via token query param
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    # Verify session via login_db (or bypass in DEV mode)
    from auth_dependency import DEV_MODE, AUTH_SERVICE_URL
    import requests as http_requests

    user_id = None
    if DEV_MODE:
        user_id = token  # In dev, session_id IS the user_id
    else:
        try:
            resp = http_requests.get(
                f"{AUTH_SERVICE_URL}/verify_session/{token}",
                timeout=5
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            user_id = resp.json().get("user_id")
        except http_requests.RequestException:
            raise HTTPException(status_code=503, detail="Auth service unreachable")

    # Fetch document
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT sender_id, file_url, name FROM documents WHERE id = %s",
            (document_id,)
        )
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if str(doc["sender_id"]) != str(user_id):
            raise HTTPException(status_code=403, detail="Not your document.")

        # Read + serve the PDF
        try:
            pdf_bytes = storage.read_file(doc["file_url"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not read PDF: {e}")

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{doc["name"]}.pdf"',
                "Cache-Control": "private, max-age=300",
            },
        )
    finally:
        cur.close()
        conn.close()