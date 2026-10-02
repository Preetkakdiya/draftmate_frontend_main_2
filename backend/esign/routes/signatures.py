"""
signatures.py - Signer submits signature, PDF gets stamped from fields table, document completes.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Literal

from db import get_db_connection
from storage_manager import storage
from utils.stamp_pdf import stamp_signature_on_pdf
from utils.audit_logger import log_audit
from mailer import send_completion_notice

router = APIRouter()


class SubmitSignatureRequest(BaseModel):
    signature_method: Literal["drawn", "uploaded", "typed", "photo"]
    signature_data_url: str = Field(..., description="Base64 PNG")
    it_act_consent: bool = Field(..., description="Signer accepted IT Act 2000 Section 5")


def _stamp_all_signed_signers(cur, doc_id: str, original_pdf_bytes: bytes) -> bytes:
    """
    Rebuild signed PDF from the ORIGINAL + every signer who already has status=signed
    and a signature_data_url, using THEIR rows in the fields table.

    This is the source of truth (editor bulk-save), not documents.signature_*.
    """
    cur.execute(
        """
        SELECT
            s.id AS signer_id,
            s.name AS signer_name,
            s.signature_data_url,
            f.page_number,
            f.x_position,
            f.y_position,
            f.width,
            f.height,
            f.field_type
        FROM signers s
        JOIN fields f ON f.signer_id = s.id AND f.document_id = s.document_id
        WHERE s.document_id = %s
          AND s.status = 'signed'
          AND s.signature_data_url IS NOT NULL
          AND f.field_type = 'signature'
        ORDER BY f.page_number ASC, f.y_position ASC
        """,
        (doc_id,),
    )
    rows = cur.fetchall()

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No signature fields found for signed recipients. Place signature fields in the editor first.",
        )

    pdf_bytes = original_pdf_bytes
    for r in rows:
        print(
            f"✍️  [STAMP] signer={r['signer_name']} page={r['page_number']} "
            f"x={r['x_position']} y={r['y_position']} "
            f"w={r['width']} h={r['height']}"
        )
        pdf_bytes = stamp_signature_on_pdf(
            original_pdf_bytes=pdf_bytes,
            signature_data_url=r["signature_data_url"],
            page_number=int(r["page_number"]),
            x=float(r["x_position"]),
            y=float(r["y_position"]),
            width=float(r["width"] or 1800),
            height=float(r["height"] or 450),
        )

    return pdf_bytes


@router.post("/sign/{token}/submit")
def submit_signature(token: str, payload: SubmitSignatureRequest, request: Request):
    """
    Final step: signer submits signature.
    1. Store signature on the signer row
    2. Mark signer as signed
    3. Re-stamp ORIGINAL PDF with ALL signed signers' fields (from fields table)
    4. When everyone has signed → mark document completed
    """
    if not payload.it_act_consent:
        raise HTTPException(
            status_code=400,
            detail="You must accept the IT Act 2000 Section 5 consent to sign.",
        )

    if not payload.signature_data_url or "," not in payload.signature_data_url:
        raise HTTPException(status_code=400, detail="Invalid signature image data.")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Fetch signer + document (NO legacy signature_page/x/y)
        cur.execute(
            """
            SELECT
                s.id AS signer_id,
                s.name AS signer_name,
                s.email AS signer_email,
                s.status AS signer_status,
                d.id AS doc_id,
                d.name AS doc_name,
                d.file_url,
                d.status AS doc_status
            FROM signers s
            JOIN documents d ON d.id = s.document_id
            WHERE s.signing_token = %s
            """,
            (token,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invalid signing link.")

        if row["signer_status"] == "signed":
            raise HTTPException(status_code=400, detail="Already signed.")
        if row["signer_status"] != "otp_verified":
            raise HTTPException(
                status_code=400,
                detail="Please verify your identity with OTP before signing.",
            )
        if row["doc_status"] not in ("sent", "partially_signed", "completed", "draft"):
            # allow sent/partially_signed primarily
            pass

        # Ensure THIS signer has at least one signature field in the editor
        cur.execute(
            """
            SELECT id FROM fields
            WHERE document_id = %s AND signer_id = %s AND field_type = 'signature'
            LIMIT 1
            """,
            (row["doc_id"], row["signer_id"]),
        )
        if not cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail="No signature field was assigned to you on this document.",
            )

        # 1. Load original PDF (always stamp from original + all signed so far)
        try:
            original_pdf_bytes = storage.read_file(row["file_url"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not load original PDF: {e}")

        # 2. Mark this signer signed + store their signature image FIRST
        #    so _stamp_all_signed_signers includes them
        cur.execute(
            """
            UPDATE signers
            SET status = 'signed',
                signed_at = NOW(),
                signature_method = %s,
                signature_data_url = %s
            WHERE id = %s
            """,
            (payload.signature_method, payload.signature_data_url, row["signer_id"]),
        )

        # 3. Stamp ALL signature fields for ALL signers who are now 'signed'
        try:
            signed_pdf_bytes = _stamp_all_signed_signers(
                cur, str(row["doc_id"]), original_pdf_bytes
            )
        except HTTPException:
            raise
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"PDF stamping failed: {e}")

        # 4. Save signed PDF bytes
        signed_url = storage.save_signed(signed_pdf_bytes, str(row["doc_id"]))

        # 5. Pending signers?
        cur.execute(
            """
            SELECT COUNT(*) AS pending
            FROM signers
            WHERE document_id = %s AND status != 'signed'
            """,
            (row["doc_id"],),
        )
        pending = cur.fetchone()["pending"]

        if pending == 0:
            # All signers done — only use statuses allowed by documents_status_check
            cur.execute(
                """
                UPDATE documents
                SET status = 'completed',
                    completed_at = NOW(),
                    final_file_url = %s
                WHERE id = %s
                """,
                (signed_url, row["doc_id"]),
            )
            log_audit(
                document_id=str(row["doc_id"]),
                event_type="completed",
                ip_address=request.client.host,
            )
        else:
            # Still waiting on others.
            # DO NOT set status='partially_signed' — it violates documents_status_check.
            # Keep status as 'sent' (or whatever it already is) and store intermediate PDF.
            cur.execute(
                """
                UPDATE documents
                SET final_file_url = %s
                WHERE id = %s
                """,
                (signed_url, row["doc_id"]),
            )

        conn.commit()

        log_audit(
            document_id=str(row["doc_id"]),
            signer_id=str(row["signer_id"]),
            event_type="signed",
            ip_address=request.client.host,
            metadata={"signature_method": payload.signature_method},
        )

        download_link = f"{request.base_url}api/esign/download/{row['doc_id']}"
        send_completion_notice(
            to=row["signer_email"],
            signer_name=row["signer_name"],
            document_name=row["doc_name"],
            download_link=download_link,
        )

        return {
            "message": "Document signed successfully.",
            "download_url": f"/api/esign/download/{row['doc_id']}",
            "document_completed": pending == 0,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Signing failed: {e}")
    finally:
        cur.close()
        conn.close()


@router.get("/download/{document_id}")
def download_signed_pdf(document_id: str):
    """Download the final signed PDF once completed (or partially_signed if you allow)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT name, final_file_url, status FROM documents WHERE id = %s",
            (document_id,),
        )
        doc = cur.fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")
        if not doc["final_file_url"] or doc["status"] != "completed":
            raise HTTPException(status_code=404, detail="Signed PDF not ready yet.")

        try:
            pdf_bytes = storage.read_file(doc["final_file_url"])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not read signed PDF: {e}")

        safe_name = doc["name"].replace(" ", "_")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}_signed.pdf"'
            },
        )
    finally:
        cur.close()
        conn.close()