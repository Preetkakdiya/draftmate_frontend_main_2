-- ============================================
-- DraftMate E-Signature Schema v2 (Editor Support)
-- Safe to re-run — uses IF NOT EXISTS everywhere
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. DOCUMENTS TABLE (updated)
-- ==========================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled document',
  file_url TEXT NOT NULL,
  final_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft', 'sent', 'viewed', 'signed', 'completed', 'declined', 'expired')),
  -- LEGACY fields (kept for backward compatibility — will be phased out)
  signature_page INT NOT NULL DEFAULT 1,
  signature_x INT NOT NULL DEFAULT 400,
  signature_y INT NOT NULL DEFAULT 700,
  -- New editor fields
  signing_order TEXT NOT NULL DEFAULT 'parallel' CHECK (signing_order IN ('parallel', 'sequential')),
  document_type TEXT DEFAULT 'other_permitted_document',
  expires_at TIMESTAMPTZ,
  custom_message TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  source_template_id UUID REFERENCES documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Migration: Add new columns to existing tables if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'signing_order') THEN
    ALTER TABLE documents ADD COLUMN signing_order TEXT NOT NULL DEFAULT 'parallel' 
      CHECK (signing_order IN ('parallel', 'sequential'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'document_type') THEN
    ALTER TABLE documents ADD COLUMN document_type TEXT DEFAULT 'other_permitted_document';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'documents' AND column_name = 'expires_at') THEN
    ALTER TABLE documents ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- ==========================================
-- 2. SIGNERS TABLE (updated with signing order)
-- ==========================================
CREATE TABLE IF NOT EXISTS signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'signer' CHECK (role IN ('signer', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN
    ('pending', 'viewed', 'otp_verified', 'signed', 'declined')),
  signing_token TEXT NOT NULL UNIQUE,
  signing_order INT NOT NULL DEFAULT 1,  -- 1, 2, 3... for sequential order
  color TEXT NOT NULL DEFAULT '#2563EB',  -- Hex color for field highlighting

  -- OTP identity gate
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_verified_at TIMESTAMPTZ,

  -- Legacy signature payload (kept for backward compat)
  signature_method TEXT CHECK (signature_method IN
    ('drawn', 'uploaded', 'typed', 'photo')),
  signature_data_url TEXT,
  photo_url TEXT,

  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration: Add role/signing_order/color to existing signers table if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'signers' AND column_name = 'role') THEN
    ALTER TABLE signers ADD COLUMN role TEXT NOT NULL DEFAULT 'signer' 
      CHECK (role IN ('signer', 'viewer'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'signers' AND column_name = 'signing_order') THEN
    ALTER TABLE signers ADD COLUMN signing_order INT NOT NULL DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'signers' AND column_name = 'color') THEN
    ALTER TABLE signers ADD COLUMN color TEXT NOT NULL DEFAULT '#2563EB';
  END IF;
END $$;

-- ==========================================
-- 3. FIELDS TABLE (NEW! Core of the editor)
-- ==========================================
CREATE TABLE IF NOT EXISTS fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES signers(id) ON DELETE CASCADE,
  
  -- Field type
  field_type TEXT NOT NULL CHECK (field_type IN 
    ('signature', 'initials', 'date', 'name', 'text')),
  
  -- Position on PDF (bottom-left origin, PDF coordinate system)
  page_number INT NOT NULL DEFAULT 1,
  x_position FLOAT NOT NULL,
  y_position FLOAT NOT NULL,
  width FLOAT NOT NULL DEFAULT 160,
  height FLOAT NOT NULL DEFAULT 40,
  
  -- Behavior
  required BOOLEAN NOT NULL DEFAULT TRUE,
  placeholder TEXT,  -- e.g., "Sign here", "MM/DD/YYYY"
  
  -- Filled value (populated when signer fills it)
  -- For 'signature'/'initials': base64 data URL of the image
  -- For 'date': ISO date string "2026-01-15"
  -- For 'name'/'text': plain text value
  filled_value TEXT,
  filled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 4. AUDIT EVENTS TABLE (updated event types)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES signers(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,  -- No CHECK constraint — allow flexibility for new events
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 5. INDEXES (for performance)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_signers_token ON signers(signing_token);
CREATE INDEX IF NOT EXISTS idx_signers_document ON signers(document_id);
CREATE INDEX IF NOT EXISTS idx_signers_status ON signers(status);
CREATE INDEX IF NOT EXISTS idx_signers_order ON signers(document_id, signing_order);
CREATE INDEX IF NOT EXISTS idx_audit_document ON audit_events(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_documents_sender ON documents(sender_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_fields_document ON fields(document_id);
CREATE INDEX IF NOT EXISTS idx_fields_signer ON fields(signer_id);
CREATE INDEX IF NOT EXISTS idx_fields_page ON fields(document_id, page_number);

-- ==========================================
-- 6. AUTO-UPDATE updated_at TRIGGER FOR FIELDS
-- ==========================================
CREATE OR REPLACE FUNCTION update_fields_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fields_updated_at ON fields;
CREATE TRIGGER fields_updated_at
  BEFORE UPDATE ON fields
  FOR EACH ROW
  EXECUTE FUNCTION update_fields_timestamp();

-- ==========================================
-- 7. VERIFY
-- ==========================================
SELECT 'Schema v2 applied successfully' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' 
    AND table_name IN ('documents', 'signers', 'fields', 'audit_events')) AS tables_present;