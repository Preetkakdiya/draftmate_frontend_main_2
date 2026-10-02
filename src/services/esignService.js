import axios from 'axios';
import { API_CONFIG } from './endpoints';

const BASE_URL = API_CONFIG.ESIGN.BASE_URL;
const ENDPOINTS = API_CONFIG.ESIGN.ENDPOINTS;

// Attach session_id automatically (matches your existing api.js pattern)
const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('session_id')}`,
});

export const esignService = {
  // ==========================================
  // SENDER APIs (require auth)
  // ==========================================

  /**
   * List all envelopes for the logged-in user.
   */
  listDocuments: async () => {
    const res = await axios.get(`${BASE_URL}${ENDPOINTS.LIST_DOCUMENTS}`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  /**
   * Get full envelope details (document + signers + audit trail).
   */
  getDocument: async (documentId) => {
    const res = await axios.get(`${BASE_URL}${ENDPOINTS.GET_DOCUMENT(documentId)}`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  /**
   * Upload PDF and create a draft envelope.
   */
  createDocument: async ({ file, name, customMessage, signaturePage = 1, signatureX = 400, signatureY = 100 }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (customMessage) formData.append('custom_message', customMessage);
    formData.append('signature_page', signaturePage);
    formData.append('signature_x', signatureX);
    formData.append('signature_y', signatureY);

    const res = await axios.post(`${BASE_URL}${ENDPOINTS.CREATE_DOCUMENT}`, formData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Add a signer to a draft envelope.
   */
  addSigner: async (documentId, { email, name }) => {
    const res = await axios.post(
      `${BASE_URL}${ENDPOINTS.ADD_SIGNER(documentId)}`,
      { email, name },
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  /**
   * Send envelope — triggers signing emails to all signers.
   */
  sendEnvelope: async (documentId, senderName = 'A DraftMate User') => {
    const res = await axios.post(
      `${BASE_URL}${ENDPOINTS.SEND_ENVELOPE(documentId)}`,
      { sender_name: senderName },
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  /**
   * Resend signing link to pending signers.
   */
  sendReminder: async (documentId) => {
    const res = await axios.post(
      `${BASE_URL}${ENDPOINTS.SEND_REMINDER(documentId)}`,
      {},
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  /**
   * Void (cancel) an envelope.
   */
  voidDocument: async (documentId) => {
    const res = await axios.delete(`${BASE_URL}${ENDPOINTS.VOID_DOCUMENT(documentId)}`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  /**
   * Get signed PDF download URL.
   */
  getDownloadUrl: (documentId) =>
    `${BASE_URL}${ENDPOINTS.DOWNLOAD_SIGNED(documentId)}`,

  // ==========================================
  // PUBLIC SIGNER APIs (no auth needed)
  // ==========================================

  getSignerView: async (token) => {
    const res = await axios.get(`${BASE_URL}${ENDPOINTS.GET_SIGNER_VIEW(token)}`);
    return res.data;
  },

  sendOtp: async (token) => {
    const res = await axios.post(`${BASE_URL}${ENDPOINTS.SEND_OTP(token)}`);
    return res.data;
  },

  verifyOtp: async (token, code) => {
    const res = await axios.post(`${BASE_URL}${ENDPOINTS.VERIFY_OTP(token)}`, { code });
    return res.data;
  },

  submitSignature: async (token, { signatureMethod, signatureDataUrl, itActConsent }) => {
    const res = await axios.post(`${BASE_URL}${ENDPOINTS.SUBMIT_SIGNATURE(token)}`, {
      signature_method: signatureMethod,
      signature_data_url: signatureDataUrl,
      it_act_consent: itActConsent,
    });
    return res.data;
  },

  // ==========================================
  // NEW: Update envelope settings (before send)
  // ==========================================
  updateDocument: async (documentId, updates) => {
    const res = await axios.patch(
      `${BASE_URL}${ENDPOINTS.GET_DOCUMENT(documentId)}`,
      updates,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  // ==========================================
  // NEW: Update signer
  // ==========================================
  updateSigner: async (signerId, updates) => {
    const res = await axios.patch(
      `${BASE_URL}/api/esign/signers/${signerId}`,
      updates,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  // ==========================================
  // NEW: Remove signer
  // ==========================================
  removeSigner: async (signerId) => {
    const res = await axios.delete(
      `${BASE_URL}/api/esign/signers/${signerId}`,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  // ==========================================
  // NEW: Get raw PDF file for viewer
  // ==========================================
  getPdfUrl: (documentId) => {
    // Serves the original uploaded PDF for viewing in the editor
    return `${BASE_URL}/api/esign/documents/${documentId}/pdf?token=${localStorage.getItem('session_id')}`;
  },

  // ==========================================
  // NEW: Fields API (used in Phase 3)
  // ==========================================
  listFields: async (documentId) => {
    const res = await axios.get(
      `${BASE_URL}/api/esign/documents/${documentId}/fields`,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  bulkSaveFields: async (documentId, fields, replaceExisting = true) => {
    const res = await axios.post(
      `${BASE_URL}/api/esign/documents/${documentId}/fields/bulk`,
      { fields, replace_existing: replaceExisting },
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  createField: async (documentId, field) => {
    const res = await axios.post(
      `${BASE_URL}/api/esign/documents/${documentId}/fields`,
      field,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  updateField: async (fieldId, updates) => {
    const res = await axios.patch(
      `${BASE_URL}/api/esign/fields/${fieldId}`,
      updates,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  deleteField: async (fieldId) => {
    const res = await axios.delete(
      `${BASE_URL}/api/esign/fields/${fieldId}`,
      { headers: getAuthHeader() }
    );
    return res.data;
  },

  clearAllFields: async (documentId) => {
    const res = await axios.delete(
      `${BASE_URL}/api/esign/documents/${documentId}/fields`,
      { headers: getAuthHeader() }
    );
    return res.data;
  },
};