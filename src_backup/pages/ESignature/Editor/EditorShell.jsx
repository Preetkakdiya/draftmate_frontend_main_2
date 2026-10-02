import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';

import { esignService } from '../../../services/esignService';
import PDFViewer from './PDFViewer';
import PagesPanel from './PagesPanel';
import RecipientsPanel from './RecipientsPanel';
import FieldsPalette from './FieldsPalette';
import EditorToolbar from './EditorToolbar';

export default function EditorShell() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const pdfViewerRef = useRef(null);

  // Document & Signers
  const [document, setDocument] = useState(null);
  const [signers, setSigners] = useState([]);
  const [fields, setFields] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  // Editor controls
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [selectedSignerId, setSelectedSignerId] = useState(null);
  const [activeFieldType, setActiveFieldType] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingEnvelope, setSendingEnvelope] = useState(false);

  // ==========================================
  // LOAD DOCUMENT & FIELDS
  // ==========================================
  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const data = await esignService.getDocument(documentId);
      setDocument(data.document);
      setSigners(data.signers || []);
      setFields(data.fields || []);
      setPdfUrl(esignService.getPdfUrl(documentId));

      if (data.signers?.length > 0) {
        setSelectedSignerId(data.signers[0].id);
      }
    } catch (err) {
      toast.error('Failed to load document');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FIELD PLACEMENT HANDLERS
  // ==========================================
  const handlePlaceField = (newFieldData) => {
    const newField = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      document_id: documentId,
      ...newFieldData,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setActiveFieldType(null); // Reset selection after placement

    const signerName = signers.find((s) => s.id === newFieldData.signer_id)?.name || 'Signer';
    toast.success(`${newFieldData.field_type.toUpperCase()} placed for ${signerName} ✓`);
  };

  const handleUpdateFieldBounds = (fieldId, newX, newY, newW, newH) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
            ...f,
            x_position: newX,
            y_position: newY,
            width: newW,
            height: newH,
          }
          : f
      )
    );
  };

  const handleDeleteField = (fieldId) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
    toast.success('Field removed');
  };

  // ==========================================
  // PAGE NAVIGATION & ZOOM
  // ==========================================
  const handlePdfLoadSuccess = ({ numPages: total }) => setNumPages(total);
  const handleViewerPageChange = (newPage) => {
    // Called when user changes page via scroll/keyboard inside viewer
    setCurrentPage(newPage);
  };

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(numPages || 1, p + 1));

  const handleZoomIn = () => setScale((s) => Math.min(2.0, s + 0.1));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, s - 0.1));
  const handleFitWidth = () => setScale(1.0);

  // ==========================================
  // RECIPIENT HANDLERS
  // ==========================================
  const handleSigningOrderChange = async (newOrder) => {
    try {
      await esignService.updateDocument(documentId, { signing_order: newOrder });
      setDocument({ ...document, signing_order: newOrder });
      toast.success(`Switched to ${newOrder} mode`);
    } catch (err) {
      toast.error('Failed to update signing order');
    }
  };

  const handleAddSigner = async (signerData) => {
    try {
      const created = await esignService.addSigner(documentId, {
        ...signerData,
        signing_order: signers.length + 1,
      });
      setSigners([...signers, created]);
      setSelectedSignerId(created.id);
      toast.success(`${created.name} added`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add recipient');
    }
  };

  const handleRemoveSigner = async (signerId) => {
    try {
      await esignService.removeSigner(signerId);
      setSigners(signers.filter((s) => s.id !== signerId));
      setFields(fields.filter((f) => f.signer_id !== signerId));
      if (selectedSignerId === signerId) {
        setSelectedSignerId(signers[0]?.id || null);
      }
      toast.success('Recipient removed');
    } catch (err) {
      toast.error('Failed to remove recipient');
    }
  };

  const handleUpdateSigner = async (signerId, updates) => {
    try {
      await esignService.updateSigner(signerId, updates);
      setSigners(signers.map((s) => (s.id === signerId ? { ...s, ...updates } : s)));
      toast.success('Recipient updated');
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  // ==========================================
  // SAVE DRAFT (BULK SYNC FIELDS TO NEON DB)
  // ==========================================
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      // 1. Sync metadata
      await esignService.updateDocument(documentId, {
        signing_order: document.signing_order,
        document_type: document.document_type,
      });

      // 2. Sync fields array to NeonDB
      const fieldsToSave = fields.map((f) => ({
        signer_id: f.signer_id,
        field_type: f.field_type,
        page_number: f.page_number,
        x_position: f.x_position,
        y_position: f.y_position,
        width: f.width || 1800,
        height: f.height || 450,
        required: f.required ?? true,
        placeholder: f.placeholder || null,
      }));

      await esignService.bulkSaveFields(documentId, fieldsToSave, true);
      toast.success('Draft & fields saved to cloud ✓');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save fields');
      console.error(err);
    } finally {
      setSavingDraft(false);
    }
  };

  // ==========================================
  // SEND ENVELOPE
  // ==========================================
  const handleSend = async () => {
    if (signers.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }
    if (fields.length === 0) {
      toast.error('Place at least one field on the document before sending');
      return;
    }

    setSendingEnvelope(true);
    try {
      // 1. Bulk save fields first
      const fieldsToSave = fields.map((f) => ({
        signer_id: f.signer_id,
        field_type: f.field_type,
        page_number: f.page_number,
        x_position: f.x_position,
        y_position: f.y_position,
        width: f.width || 1800,
        height: f.height || 450,
        required: f.required ?? true,
        placeholder: f.placeholder || null,
      }));

      await esignService.bulkSaveFields(documentId, fieldsToSave, true);

      // 2. Trigger envelope sending
      const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      const senderName =
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        profile.email?.split('@')[0] ||
        'A DraftMate User';

      await esignService.sendEnvelope(documentId, senderName);
      toast.success('Envelope sent for signature 🚀');
      navigate(`/dashboard/esignature/${documentId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send envelope');
    } finally {
      setSendingEnvelope(false);
    }
  };

  // Group fields per page for left page panel count badges
  const fieldsPerPage = fields.reduce((acc, f) => {
    acc[f.page_number] = (acc[f.page_number] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading editor…</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-slate-200 p-8">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7 text-rose-600" />
        </div>
        <h3 className="font-bold text-[#0F1C2E] mb-1">Document not found</h3>
        <button
          onClick={() => navigate('/dashboard/esignature')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
        >
          Back to envelopes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Top Toolbar */}
      <EditorToolbar
        documentName={document.name}
        documentStatus={document.status}
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitWidth={handleFitWidth}
        currentPage={currentPage}
        numPages={numPages}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        onSaveDraft={handleSaveDraft}
        onSend={handleSend}
        savingDraft={savingDraft}
        sendingEnvelope={sendingEnvelope}
        canSend={signers.length > 0 && fields.length > 0}
      />

      {/* 3-Column Editor Layout */}
      <div className="flex gap-4 min-h-[calc(100vh-220px)]">
        {/* LEFT: Pages Thumbnail Panel */}
        <PagesPanel
          numPages={numPages}
          currentPage={currentPage}
          onPageSelect={setCurrentPage}
          fieldsPerPage={fieldsPerPage}
        />

        {/* CENTER: Canvas / PDF Viewer with Field Overlay */}
        <div className="flex-1 bg-slate-100 rounded-2xl p-6 overflow-auto custom-scrollbar flex items-start justify-center">
          {pdfUrl && (
            <PDFViewer
              ref={pdfViewerRef}
              fileUrl={pdfUrl}
              currentPage={currentPage}
              scale={scale}
              onLoadSuccess={handlePdfLoadSuccess}
              onPageChange={handleViewerPageChange}
              fields={fields}
              signers={signers}
              selectedSignerId={selectedSignerId}
              activeFieldType={activeFieldType}
              onPlaceField={handlePlaceField}
              onUpdateFieldBounds={handleUpdateFieldBounds}
              onDeleteField={handleDeleteField}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
            />
          )}
        </div>

        {/* RIGHT: Recipients + Fields Palette */}
        <div className="w-[320px] shrink-0 space-y-4">
          <RecipientsPanel
            signers={signers}
            signingOrder={document.signing_order}
            onSigningOrderChange={handleSigningOrderChange}
            onAddSigner={handleAddSigner}
            onRemoveSigner={handleRemoveSigner}
            onUpdateSigner={handleUpdateSigner}
            selectedSignerId={selectedSignerId}
            onSelectSigner={setSelectedSignerId}
          />

          <FieldsPalette
            activeFieldType={activeFieldType}
            onSelectFieldType={setActiveFieldType}
            disabled={!selectedSignerId}
          />

          {/* Compliance Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <div className="text-[10px] text-blue-900 font-medium leading-relaxed">
              🇮🇳 Executed under <strong>Section 5, IT Act 2000</strong>.
              Not valid for Wills, POA, Trust Deeds, or Sale Deeds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}