import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, CheckCircle2, Clock, XCircle, Send,
  Bell, Download, User, Mail, Trash2, Copy, Shield,
  Calendar, Activity, MoreVertical, ExternalLink, Sparkles
} from 'lucide-react';
import { esignService } from '../../services/esignService';

const STATUS_STYLES = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Draft' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', label: 'Sent' },
  viewed: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500', label: 'Viewed' },
  signed: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Signed' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Completed' },
  declined: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', label: 'Voided' },
  expired: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Expired' },
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Pending' },
  otp_verified: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', label: 'Verified' },
};

const EVENT_LABELS = {
  sent: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Envelope sent' },
  viewed: { icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Document viewed' },
  otp_sent: { icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50', label: 'OTP sent' },
  otp_verified: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Identity verified' },
  signed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Document signed' },
  completed: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Envelope completed' },
  declined: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Envelope voided' },
  reminder_sent: { icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Reminder sent' },
};

export default function EnvelopeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmVoid, setShowConfirmVoid] = useState(false);

  useEffect(() => {
    loadData();
    // Refresh every 20 seconds if not completed
    const interval = setInterval(() => {
      if (data?.document?.status !== 'completed') loadData();
    }, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [id]);

  const loadData = async () => {
    try {
      const result = await esignService.getDocument(id);
      setData(result);
    } catch (err) {
      toast.error('Failed to load envelope');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReminder = async () => {
    setActionLoading(true);
    try {
      const result = await esignService.sendReminder(id);
      toast.success(result.message);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reminder');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    setActionLoading(true);
    try {
      await esignService.voidDocument(id);
      toast.success('Envelope voided');
      navigate('/dashboard/esignature');
    } catch (err) {
      toast.error('Failed to void envelope');
    } finally {
      setActionLoading(false);
      setShowConfirmVoid(false);
    }
  };

  const handleDownload = () => {
    const url = esignService.getDownloadUrl(id);
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 bg-slate-100 rounded" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
          <div className="h-64 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { document: doc, signers, audit } = data;
  const docStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.draft;
  const signedCount = signers.filter(s => s.status === 'signed').length;
  const progress = signers.length > 0 ? (signedCount / signers.length) * 100 : 0;
  const canRemind = ['sent', 'viewed'].includes(doc.status);
  const canVoid = ['draft', 'sent', 'viewed'].includes(doc.status);
  const canDownload = doc.status === 'completed';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard/esignature')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to envelopes
      </button>

      {/* ── HEADER CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_4px_24px_rgba(15,28,46,0.04)] p-8 mb-6 relative overflow-hidden"
      >
        {/* Decorative gradient */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-100/60 to-indigo-100/40 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${docStyle.bg} ${docStyle.text} text-[10px] font-bold uppercase tracking-widest`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${docStyle.dot}`} />
                  {docStyle.label}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#0F1C2E] mb-1">{doc.name}</h1>
              {doc.custom_message && (
                <p className="text-sm text-slate-500 font-medium italic max-w-lg">"{doc.custom_message}"</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRemind && (
              <button
                onClick={handleReminder}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-blue-300 transition-all text-sm disabled:opacity-50"
              >
                <Bell className="w-4 h-4" />
                Send reminder
              </button>
            )}
            {canDownload && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 text-sm"
              >
                <Download className="w-4 h-4" />
                Download signed PDF
              </button>
            )}
            {canVoid && (
              <button
                onClick={() => setShowConfirmVoid(true)}
                className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 rounded-xl transition-all"
                title="Void envelope"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {signers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Signing Progress</span>
              <span className="text-sm font-black text-[#0F1C2E]">
                {signedCount} of {signers.length} signed
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
              />
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── SIGNERS LIST ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white rounded-[24px] border border-slate-200/60 shadow-[0_4px_24px_rgba(15,28,46,0.04)] overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <h2 className="font-black text-[#0F1C2E]">Signers</h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                {signers.length}
              </span>
            </div>
          </div>
          <div className="p-2">
            {signers.map((s, idx) => {
              const sStyle = STATUS_STYLES[s.status] || STATUS_STYLES.pending;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-slate-600">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#0F1C2E] truncate">{s.name}</div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {s.email}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${sStyle.bg} ${sStyle.text} text-[10px] font-bold uppercase tracking-widest`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sStyle.dot} ${s.status === 'sent' || s.status === 'viewed' ? 'animate-pulse' : ''}`} />
                      {sStyle.label}
                    </span>
                    {s.signed_at && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(s.signed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── AUDIT TRAIL ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_4px_24px_rgba(15,28,46,0.04)] overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <h2 className="font-black text-[#0F1C2E]">Audit Trail</h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
            {audit.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-medium">No events yet</p>
            ) : (
              <div className="space-y-3">
                {audit.map((event, idx) => {
                  const evStyle = EVENT_LABELS[event.event_type] || {
                    icon: Activity, color: 'text-slate-600', bg: 'bg-slate-50', label: event.event_type
                  };
                  const EventIcon = evStyle.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg ${evStyle.bg} ${evStyle.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <EventIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#0F1C2E]">{evStyle.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {new Date(event.created_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                          {event.ip_address && ` · IP: ${event.ip_address}`}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── VOID CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showConfirmVoid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-2xl border border-slate-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-[#0F1C2E] mb-2">Void this envelope?</h3>
              <p className="text-sm text-slate-500 font-medium mb-6">
                This will cancel the envelope and notify all pending signers. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmVoid(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoid}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all text-sm disabled:opacity-50"
                >
                  {actionLoading ? 'Voiding…' : 'Yes, void envelope'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}