import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_CONFIG } from '../services/endpoints';

const AiContentNoticeModal = ({ isOpen, onAccept }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!isChecked) return;
    
    setIsSubmitting(true);
    const consentVal = isChecked ? 'yes' : 'no';
    try {
      const consentData = {
        accepted: isChecked,
        ai_consent: consentVal,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      // 1. Save consent locally
      localStorage.setItem('draftmate_ai_consent_accepted', 'true');
      localStorage.setItem('draftmate_ai_consent_value', consentVal);
      localStorage.setItem('draftmate_ai_consent_details', JSON.stringify(consentData));

      try {
        const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
        profile.ai_consent = consentVal;
        localStorage.setItem('user_profile', JSON.stringify(profile));
      } catch (e) {}

      // 2. Persist in PostgreSQL users table via auth service
      const sessionId = localStorage.getItem('session_id') || localStorage.getItem('token');
      const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      const userId = userProfile.id || userProfile.user_id || localStorage.getItem('user_id');

      if (sessionId || userId) {
        try {
          const consentUrl = `${API_CONFIG.AUTH.BASE_URL}/v2/user/consent`;
          await fetch(consentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionId || ''}`
            },
            body: JSON.stringify({
              user_id: userId || null,
              consent: consentVal
            })
          });
        } catch (apiErr) {
          console.warn('Backend consent sync warning (saved locally):', apiErr);
        }
      }

      window.dispatchEvent(new Event('draftmate_consent_updated'));
      toast.success('AI Content Notice & User Consent Acknowledged.');
      if (onAccept) onAccept(consentData);
    } catch (err) {
      console.error('Error saving consent:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl rounded-2xl bg-white shadow-[0_25px_70px_rgba(15,23,42,0.35)] border border-amber-200/80 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 flex items-center gap-3 text-white shadow-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              AI Content Notice
            </h2>
            <p className="text-xs text-amber-100 font-medium">
              Mandatory Legal Disclaimer & User Acknowledgment
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Important Warning Alert Box */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950 shadow-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed font-medium space-y-1">
              <span className="font-bold text-amber-900 block text-xs uppercase tracking-wider">
                ⚠️ Important Notice
              </span>
              <p className="text-slate-800 text-[13px] leading-snug">
                DraftMate AI may generate incorrect, incomplete, or misleading information. AI-generated content is not guaranteed to be accurate and should not be treated as legal advice. Always verify the generated content against the original documents, facts, and applicable law before relying on it.
              </p>
            </div>
          </div>

          {/* User Consent Checkbox Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:border-blue-200">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shrink-0 cursor-pointer accent-blue-600"
              />
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  User Consent <span className="text-red-500 font-bold">*</span>
                </span>
                <p className="text-slate-700 text-xs leading-relaxed font-normal">
                  I understand and acknowledge that DraftMate AI uses artificial intelligence to analyze and generate content from the information I provide. I understand that AI-generated results may contain errors and that I am responsible for reviewing and verifying the output before using it.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Consent required to proceed</span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isChecked || isSubmitting}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-md ${
              isChecked
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60 shadow-none'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>{isSubmitting ? 'Saving...' : 'Accept & Proceed'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiContentNoticeModal;
