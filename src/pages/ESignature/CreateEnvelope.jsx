import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Upload, FileText, Plus, Trash2, Send,
  Check, User, Mail, MessageSquare, Sparkles, ArrowRight
} from 'lucide-react';
import { esignService } from '../../services/esignService';

export default function CreateEnvelope() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Step 2
  const [signers, setSigners] = useState([{ name: '', email: '' }]);

  // Result of step 1 upload
  const [envelope, setEnvelope] = useState(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error('File too large. Max 15 MB.');
      return;
    }
    setFile(f);
    if (!docName) setDocName(f.name.replace(/\.pdf$/i, ''));
  };

  const handleUpload = async () => {
    if (!file || !docName.trim()) {
      toast.error('Please select a PDF and give it a name');
      return;
    }
    setLoading(true);
    try {
      const data = await esignService.createDocument({
        file,
        name: docName.trim(),
        customMessage: customMessage.trim() || null,
      });
      toast.success('Document uploaded ✓ Opening editor…');
      // REDIRECT TO EDITOR (skip old Step 2 signers form)
      navigate(`/dashboard/esignature/editor/${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload');
    } finally {
      setLoading(false);
    }
  };

  const addSignerRow = () => setSigners([...signers, { name: '', email: '' }]);
  const removeSignerRow = (i) => setSigners(signers.filter((_, idx) => idx !== i));
  const updateSigner = (i, field, value) => {
    const updated = [...signers];
    updated[i][field] = value;
    setSigners(updated);
  };

  const handleSend = async () => {
    const valid = signers.filter(s => s.name.trim() && s.email.trim());
    if (valid.length === 0) {
      toast.error('Add at least one signer');
      return;
    }
    setLoading(true);
    try {
      for (const s of valid) {
        await esignService.addSigner(envelope.id, {
          name: s.name.trim(),
          email: s.email.trim(),
        });
      }
      const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      const senderName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email?.split('@')[0] || 'A DraftMate User';
      await esignService.sendEnvelope(envelope.id, senderName);
      toast.success(`Envelope sent to ${valid.length} signer(s) 🚀`);
      navigate(`/dashboard/esignature/${envelope.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send envelope');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/esignature')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to envelopes
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#0F1C2E] mb-2">Create new envelope</h1>
        <p className="text-sm text-slate-500 font-medium">
          Upload a document, add signers, and send for electronic signature.
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Upload' },
            { n: 2, label: 'Editor' },
          ].map(({ n, label }, idx, arr) => (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-2 ${step >= n ? '' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm transition-all ${step > n ? 'bg-emerald-500 text-white' :
                    step === n ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' :
                      'bg-slate-100 text-slate-400'
                  }`}>
                  {step > n ? <Check className="w-4 h-4" /> : n}
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest ${step >= n ? 'text-[#0F1C2E]' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {idx < arr.length - 1 && <div className={`flex-1 h-0.5 rounded-full transition-colors ${step > n ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1 — Upload */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_4px_24px_rgba(15,28,46,0.04)] p-8 space-y-6"
          >
            {/* Document name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Document name
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Client Retainer Agreement"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] text-sm font-medium text-[#0F1C2E] transition-all"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Upload PDF
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    const ev = { target: { files: [f] } };
                    handleFileSelect(ev);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${file
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-[#0F1C2E]">{file.name}</div>
                      <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="font-bold text-[#0F1C2E] mb-1">Drop your PDF here or click to browse</div>
                    <div className="text-xs text-slate-500 font-medium">Max file size: 15 MB</div>
                  </>
                )}
              </div>
            </div>

            {/* Custom message */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Message to signer <span className="text-slate-400 normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal note that will appear in the signing email…"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] text-sm font-medium text-[#0F1C2E] resize-none transition-all"
              />
            </div>

            {/* Compliance banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 font-medium">
                This document will be executed with an electronic signature under
                <strong className="text-blue-700"> Section 5 of the Information Technology Act, 2000</strong>.
                Not for Wills, POA, Trust deeds, Sale deeds, or Negotiable instruments.
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || !docName.trim() || loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none"
            >
              {loading ? 'Uploading…' : (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}