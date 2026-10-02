"""
fields.py - CRUD endpoints for editor fields on documents.
All endpoints require authenticated sender OR use signing_token for signer routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request

from db import get_db_connection
from auth_dependency import get_current_user_id
from models import (
    FieldCreateRequest, FieldBulkCreateRequest, FieldUpdateRequest,
    FieldResponse, MessageResponse
)
from utils.audit_logger import log_audit

router = APIRouter()


# ==========================================
# HELPERS
# ==========================================

def _verify_document_ownership(cur, document_id: str, user_id: str) -> dict:
    """Fetch document and verify user owns it. Raises 403/404 if not."""
    cur.execute("SELECT * FROM documents WHERE id = %s", (document_id,))
    doc = cur.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if str(doc["sender_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not your document.")
    if doc["status"] not in ("draft",):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify fields on a '{doc['status']}' document."
        )
    return doc


def _verify_signer_belongs_to_document(cur, signer_id: str, document_id: str):
    """Ensure the signer_id actually belongs to this document."""
    cur.execute(
        "SELECT id FROM signers WHERE id = %s AND document_id = %s",
        (signer_id, document_id)
    )
    if not cur.fetchone():
        raise HTTPException(
            status_code=400,
            detail=f"Signer {signer_id} does not belong to this document."
        )


# ==========================================
# ROUTE 1: LIST FIELDS FOR A DOCUMENT
# ==========================================

@router.get("/documents/{document_id}/fields")
def list_fields(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get all fields placed on a document (grouped info)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _verify_document_ownership(cur, document_id, user_id)

        cur.execute(
            """
            SELECT 
                f.*,
                s.name AS signer_name,
                s.color AS signer_color,
                s.email AS signer_email
            FROM fields f
            JOIN signers s ON s.id = f.signer_id
            WHERE f.document_id = %s
            ORDER BY f.page_number ASC, f.y_position DESC
            """,
            (document_id,)
        )
        rows = cur.fetchall()

        return {
            "fields": [
                {
                    "id": str(r["id"]),
                    "document_id": str(r["document_id"]),
                    "signer_id": str(r["signer_id"]),
                    "signer_name": r["signer_name"],
                    "signer_color": r["signer_color"],
                    "signer_email": r["signer_email"],
                    "field_type": r["field_type"],
                    "page_number": r["page_number"],
                    "x_position": r["x_position"],
                    "y_position": r["y_position"],
                    "width": r["width"],
                    "height": r["height"],
                    "required": r["required"],
                    "placeholder": r["placeholder"],
                    "filled_value": r["filled_value"],
                    "filled_at": r["filled_at"].isoformat() if r["filled_at"] else None,
                    "created_at": r["created_at"].isoformat(),
                }
                for r in rows
            ],
            "total": len(rows),
        }
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 2: BULK SAVE FIELDS (main editor save)
# ==========================================

@router.post("/documents/{document_id}/fields/bulk", status_code=201)
def bulk_create_fields(
    document_id: str,
    payload: FieldBulkCreateRequest,
    request: Request = None,
    user_id: str = Depends(get_current_user_id),
):
    """
    Save many fields at once. Called when the editor's "Save Draft" is clicked.
    If replace_existing=True, deletes all current fields first (clean save).
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _verify_document_ownership(cur, document_id, user_id)

        # Verify all signer_ids belong to this document
        signer_ids = {f.signer_id for f in payload.fields}
        for sid in signer_ids:
            _verify_signer_belongs_to_document(cur, sid, document_id)

        # Optional: clear existing fields for a clean save
        if payload.replace_existing:
            cur.execute("DELETE FROM fields WHERE document_id = %s", (document_id,))

        # Insert all new fields
        created = []
        for f in payload.fields:
            cur.execute(
                """
                INSERT INTO fields
                    (document_id, signer_id, field_type, page_number,
                     x_position, y_position, width, height, required, placeholder)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (
                    document_id, f.signer_id, f.field_type, f.page_number,
                    f.x_position, f.y_position, f.width, f.height,
                    f.required, f.placeholder,
                )
            )
            row = cur.fetchone()
            created.append(str(row["id"]))

        conn.commit()

        log_audit(
            document_id=document_id,
            event_type="fields_saved",
            ip_address=request.client.host if request else None,
            metadata={"count": len(created), "replaced": payload.replace_existing},
        )

        return {
            "message": f"Saved {len(created)} field(s) successfully.",
            "field_ids": created,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save fields: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 3: ADD SINGLE FIELD (fine-grained placement)
# ==========================================

@router.post("/documents/{document_id}/fields", status_code=201)
def create_single_field(
    document_id: str,
    field: FieldCreateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Add a single field. Used when user clicks-to-place one field at a time."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _verify_document_ownership(cur, document_id, user_id)
        _verify_signer_belongs_to_document(cur, field.signer_id, document_id)

        cur.execute(
            """
            INSERT INTO fields
                (document_id, signer_id, field_type, page_number,
                 x_position, y_position, width, height, required, placeholder)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                document_id, field.signer_id, field.field_type, field.page_number,
                field.x_position, field.y_position, field.width, field.height,
                field.required, field.placeholder,
            )
        )
        row = cur.fetchone()
        conn.commit()

        return {
            "id": str(row["id"]),
            "document_id": str(row["document_id"]),
            "signer_id": str(row["signer_id"]),
            "field_type": row["field_type"],
            "page_number": row["page_number"],
            "x_position": row["x_position"],
            "y_position": row["y_position"],
            "width": row["width"],
            "height": row["height"],
            "required": row["required"],
            "placeholder": row["placeholder"],
            "created_at": row["created_at"].isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create field: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 4: UPDATE FIELD (drag/resize)
# ==========================================

@router.patch("/fields/{field_id}")
def update_field(
    field_id: str,
    updates: FieldUpdateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Update a field's position, size, or signer assignment (e.g., after drag)."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Fetch field + verify ownership
        cur.execute(
            """
            SELECT f.*, d.sender_id, d.status AS doc_status
            FROM fields f
            JOIN documents d ON d.id = f.document_id
            WHERE f.id = %s
            """,
            (field_id,)
        )
        field = cur.fetchone()
        if not field:
            raise HTTPException(status_code=404, detail="Field not found.")
        if str(field["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your field.")
        if field["doc_status"] != "draft":
            raise HTTPException(status_code=400, detail="Cannot edit sent documents.")

        # Build dynamic UPDATE
        update_fields = []
        values = []
        update_data = updates.model_dump(exclude_unset=True)

        for key, val in update_data.items():
            update_fields.append(f"{key} = %s")
            values.append(val)

        if not update_fields:
            return {"message": "No changes."}

        values.append(field_id)
        query = f"UPDATE fields SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
        cur.execute(query, tuple(values))
        row = cur.fetchone()
        conn.commit()

        return {
            "id": str(row["id"]),
            "signer_id": str(row["signer_id"]),
            "field_type": row["field_type"],
            "page_number": row["page_number"],
            "x_position": row["x_position"],
            "y_position": row["y_position"],
            "width": row["width"],
            "height": row["height"],
            "updated_at": row["updated_at"].isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 5: DELETE FIELD
# ==========================================

@router.delete("/fields/{field_id}")
def delete_field(
    field_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Remove a field from the document."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT f.id, d.sender_id, d.status AS doc_status
            FROM fields f JOIN documents d ON d.id = f.document_id
            WHERE f.id = %s
            """,
            (field_id,)
        )
        field = cur.fetchone()
        if not field:
            raise HTTPException(status_code=404, detail="Field not found.")
        if str(field["sender_id"]) != user_id:
            raise HTTPException(status_code=403, detail="Not your field.")
        if field["doc_status"] != "draft":
            raise HTTPException(status_code=400, detail="Cannot delete from sent documents.")

        cur.execute("DELETE FROM fields WHERE id = %s", (field_id,))
        conn.commit()

        return {"message": "Field deleted."}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete: {e}")
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 6: CLEAR ALL FIELDS FOR A DOCUMENT
# ==========================================

@router.delete("/documents/{document_id}/fields")
def clear_all_fields(
    document_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Nuclear option: remove all fields on a document."""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        _verify_document_ownership(cur, document_id, user_id)
        cur.execute("DELETE FROM fields WHERE document_id = %s", (document_id,))
        deleted = cur.rowcount
        conn.commit()
        return {"message": f"Deleted {deleted} field(s)."}
    finally:
        cur.close()
        conn.close()


# ==========================================
# ROUTE 7: GET FIELDS FOR A SPECIFIC SIGNER (via signing token)
# Used by SignDocument.jsx to show only THIS signer's fields
# ==========================================

@router.get("/sign/{token}/fields")
def get_fields_for_signer(token: str):
    """
    PUBLIC endpoint: signer's own fields (identified by their signing token).
    Returns only fields assigned to this specific signer.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT s.id AS signer_id, s.document_id, s.color
            FROM signers s WHERE s.signing_token = %s
            """,
            (token,)
        )
        signer = cur.fetchone()
        if not signer:
            raise HTTPException(status_code=404, detail="Invalid signing link.")

        cur.execute(
            """
            SELECT f.*, s.name AS signer_name, s.color AS signer_color
            FROM fields f
            JOIN signers s ON s.id = f.signer_id
            WHERE f.signer_id = %s
            ORDER BY f.page_number ASC, f.y_position DESC
            """,
            (signer["signer_id"],)
        )
        rows = cur.fetchall()

        return {
            "fields": [
                {
                    "id": str(r["id"]),
                    "signer_id": str(r["signer_id"]),
                    "signer_name": r["signer_name"],
                    "signer_color": r["signer_color"],
                    "field_type": r["field_type"],
                    "page_number": r["page_number"],
                    "x_position": r["x_position"],
                    "y_position": r["y_position"],
                    "width": r["width"],
                    "height": r["height"],
                    "required": r["required"],
                    "placeholder": r["placeholder"],
                    "filled_value": r["filled_value"],
                    "filled_at": r["filled_at"].isoformat() if r["filled_at"] else None,
                }
                for r in rows
            ],
            "total": len(rows),
        }

    finally:
        cur.close()
        conn.close()    