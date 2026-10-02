"""
models.py - Pydantic models for E-Signature API request/response payloads.
Version 2 — supports editor with fields, multi-signer, signing order.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime


# ==========================================
# ENUMS (as Literals for Pydantic v2)
# ==========================================

SignerRole = Literal["signer", "viewer"]
SigningOrder = Literal["parallel", "sequential"]
FieldType = Literal["signature", "initials", "date", "name", "text"]
SignatureMethod = Literal["drawn", "uploaded", "typed", "photo"]


# ==========================================
# DOCUMENT MODELS
# ==========================================

class DocumentCreateResponse(BaseModel):
    """Returned after uploading a PDF and creating an envelope."""
    id: str
    name: str
    status: str
    file_url: str
    signing_order: str = "parallel"
    document_type: Optional[str] = None
    created_at: datetime


class DocumentUpdateRequest(BaseModel):
    """Update envelope settings (before sending)."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    custom_message: Optional[str] = Field(None, max_length=500)
    signing_order: Optional[SigningOrder] = None
    document_type: Optional[str] = None
    expires_at: Optional[datetime] = None


class DocumentListItem(BaseModel):
    """Envelope card shown on the dashboard."""
    id: str
    name: str
    status: str
    total_signers: int
    signed_count: int
    total_fields: int
    signing_order: str
    created_at: datetime
    completed_at: Optional[datetime] = None


class SendEnvelopeRequest(BaseModel):
    """Optional metadata when sending an envelope."""
    sender_name: Optional[str] = "A DraftMate User"


# ==========================================
# SIGNER MODELS
# ==========================================

class SignerAddRequest(BaseModel):
    """Adding a signer to a document."""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: SignerRole = "signer"
    signing_order: int = Field(default=1, ge=1, le=100)
    color: Optional[str] = Field(default="#2563EB", pattern=r'^#[0-9A-Fa-f]{6}$')


class SignerUpdateRequest(BaseModel):
    """Update signer info (before sending)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[SignerRole] = None
    signing_order: Optional[int] = None
    color: Optional[str] = None


class SignerResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    status: str
    signing_order: int
    color: str
    signed_at: Optional[datetime] = None
    signature_method: Optional[str] = None


# ==========================================
# FIELD MODELS (NEW! Editor core)
# ==========================================

class FieldCreateRequest(BaseModel):
    """A single field being placed on the PDF."""
    signer_id: str
    field_type: FieldType
    page_number: int = Field(..., ge=1)
    x_position: float = Field(..., ge=0)
    y_position: float = Field(..., ge=0)
    width: float = Field(default=160, gt=0)
    height: float = Field(default=40, gt=0)
    required: bool = True
    placeholder: Optional[str] = None


class FieldBulkCreateRequest(BaseModel):
    """Save multiple fields at once (called when user clicks Save Draft)."""
    fields: List[FieldCreateRequest]
    replace_existing: bool = False  # If true, deletes existing fields first


class FieldUpdateRequest(BaseModel):
    """Update field position or properties."""
    signer_id: Optional[str] = None
    page_number: Optional[int] = None
    x_position: Optional[float] = None
    y_position: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    required: Optional[bool] = None
    placeholder: Optional[str] = None


class FieldFillRequest(BaseModel):
    """Signer fills a single field."""
    field_id: str
    filled_value: str  # base64 image or plain text depending on field_type


class FieldBulkFillRequest(BaseModel):
    """Signer submits all their fields at once."""
    field_values: List[FieldFillRequest]
    it_act_consent: bool = True


class FieldResponse(BaseModel):
    id: str
    document_id: str
    signer_id: str
    signer_name: Optional[str] = None  # Included when relevant
    signer_color: Optional[str] = None
    field_type: str
    page_number: int
    x_position: float
    y_position: float
    width: float
    height: float
    required: bool
    placeholder: Optional[str] = None
    filled_value: Optional[str] = None
    filled_at: Optional[datetime] = None
    created_at: datetime


# ==========================================
# SIGNING (LEGACY) MODELS — kept for backward compat
# ==========================================

class OTPVerifyRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)


class SignatureSubmitRequest(BaseModel):
    """LEGACY: Old single-signature submission (still supported)."""
    signature_method: SignatureMethod
    signature_data_url: str = Field(..., description="Base64 PNG data URL")
    it_act_consent: bool


class SignerDocumentView(BaseModel):
    """What the signer sees on /sign/:token page."""
    signer_id: str
    signer_name: str
    signer_email: str
    signer_status: str
    signer_color: str
    otp_verified: bool
    can_sign_now: bool  # NEW: false if sequential and other signers ahead
    signing_order: int
    total_signers: int
    document_id: str
    document_name: str
    custom_message: Optional[str] = None
    document_status: str
    fields: List[FieldResponse] = []


# ==========================================
# GENERIC MODELS
# ==========================================

class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str