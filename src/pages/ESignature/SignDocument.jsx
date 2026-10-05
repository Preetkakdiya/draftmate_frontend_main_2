import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import {
    ShieldCheck, CheckCircle2, Download, FileText, Shield,
    PenTool, Upload, Type, Camera, RotateCcw, ArrowRight,
    Lock, Sparkles, AlertCircle, Loader2
} from 'lucide-react';
import { esignService } from '../../services/esignService';

const STAGES = {
    LOADING: 'loading',
    OTP: 'otp',
    SIGN: 'sign',
    DONE: 'done',
    ERROR: 'error',
};

const METHODS = [
    { id: 'drawn', label: 'Draw', icon: PenTool, description: 'Sign with your mouse or finger' },
    { id: 'uploaded', label: 'Upload', icon: Upload, description: 'Upload an image of your signature' },
    { id: 'typed', label: 'Type', icon: Type, description: 'Type your name in cursive font' },
];

export default function SignDocument() {
    const { token } = useParams();
    const [stage, setStage] = useState(STAGES.LOADING);
    const [signer, setSigner] = useState(null);
    const [error, setError] = useState(null);

    // OTP
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpResendTimer, setOtpResendTimer] = useState(0);
    const otpRefs = useRef([]);

    // Signature capture
    const [method, setMethod] = useState('drawn');
    const [signatureData, setSignatureData] = useState(null);
    const [typedName, setTypedName] = useState('');
    const [consentChecked, setConsentChecked] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState('');
    const padRef = useRef(null);
    const fileInputRef = useRef(null);

    // Load signer info on mount
    useEffect(() => {
        loadSignerInfo();
        // eslint-disable-next-line
    }, [token]);

    // OTP resend cooldown
    useEffect(() => {
        if (otpResendTimer > 0) {
            const t = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [otpResendTimer]);

    const loadSignerInfo = async () => {
        try {
            const data = await esignService.getSignerView(token);
            setSigner(data);
            if (data.otp_verified) {
                setStage(STAGES.SIGN);
            } else {
                // Auto-send OTP on first load
                await esignService.sendOtp(token);
                setOtpResendTimer(30);
                setStage(STAGES.OTP);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid or expired signing link.');
            setStage(STAGES.ERROR);
        }
    };

    // ==========================================
    // OTP HANDLING
    // ==========================================

    const handleOtpChange = (idx, value) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[idx] = value;
        setOtp(newOtp);
        if (value && idx < 5) {
            otpRefs.current[idx + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            otpRefs.current[idx - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    const verifyOtp = async () => {
        const code = otp.join('');
        if (code.length !== 6) {
            toast.error('Please enter all 6 digits');
            return;
        }
        setOtpLoading(true);
        try {
            await esignService.verifyOtp(token, code);
            toast.success('Identity verified ✓');
            setStage(STAGES.SIGN);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Incorrect code');
            setOtp(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        } finally {
            setOtpLoading(false);
        }
    };

    const resendOtp = async () => {
        try {
            await esignService.sendOtp(token);
            toast.success('New code sent to your email');
            setOtpResendTimer(30);
        } catch (err) {
            toast.error('Failed to resend');
        }
    };

    // ==========================================
    // SIGNATURE CAPTURE
    // ==========================================

    //   const handleDrawEnd = () => {
    //     if (padRef.current && !padRef.current.isEmpty()) {
    //       setSignatureData(padRef.current.getTrimmedCanvas().toDataURL('image/png'));
    //     }
    //   };

    const handleDrawEnd = () => {
        if (padRef.current && !padRef.current.isEmpty()) {
            // Use toDataURL() directly - avoids broken trim-canvas dependency
            // in newer React + Vite setups
            try {
                // Try to get trimmed canvas first (works if trim-canvas loads correctly)
                const canvas = padRef.current.getCanvas();
                setSignatureData(canvas.toDataURL('image/png'));
            } catch (err) {
                console.warn('Signature capture failed:', err);
            }
        }
    };
    const clearDraw = () => {
        padRef.current?.clear();
        setSignatureData(null);
    };

    const handleUpload = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            toast.error('Please upload an image');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setSignatureData(reader.result);
        reader.readAsDataURL(f);
    };

    const generateTypedSig = useCallback(() => {
        if (!typedName.trim()) {
            toast.error('Enter your name');
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'transparent';
        ctx.fillStyle = '#0F1C2E';
        ctx.font = 'italic 56px "Brush Script MT", "Segoe Script", cursive';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, 20, canvas.height / 2);
        setSignatureData(canvas.toDataURL('image/png'));
    }, [typedName]);

    const switchMethod = (m) => {
        setMethod(m);
        setSignatureData(null);
        if (m === 'typed' && signer?.signer_name && !typedName) {
            setTypedName(signer.signer_name);
        }
    };

    const submitSignature = async () => {
        if (!signatureData) {
            toast.error('Please provide a signature');
            return;
        }
        if (!consentChecked) {
            toast.error('You must accept the IT Act 2000 Section 5 consent');
            return;
        }
        setSubmitLoading(true);
        try {
            const result = await esignService.submitSignature(token, {
                signatureMethod: method,
                signatureDataUrl: signatureData,
                itActConsent: true,
            });
            setDownloadUrl(result.download_url);
            setStage(STAGES.DONE);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit signature');
        } finally {
            setSubmitLoading(false);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center p-4 md:p-8 font-sans">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-2xl relative z-10">
                {/* Brand header */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <PenTool className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-lg font-black text-[#0F1C2E]">DraftMate</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Sign</span>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── LOADING ── */}
                    {stage === STAGES.LOADING && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-[24px] p-12 shadow-xl border border-slate-200/60 text-center"
                        >
                            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
                            <p className="text-sm text-slate-500 font-medium">Loading document…</p>
                        </motion.div>
                    )}

                    {/* ── ERROR ── */}
                    {stage === STAGES.ERROR && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[24px] p-10 shadow-xl border border-slate-200/60 text-center"
                        >
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-rose-600" />
                            </div>
                            <h2 className="text-xl font-black text-[#0F1C2E] mb-2">Link Invalid</h2>
                            <p className="text-sm text-slate-500 font-medium">{error}</p>
                        </motion.div>
                    )}

                    {/* ── OTP STAGE ── */}
                    {stage === STAGES.OTP && (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white rounded-[24px] p-8 md:p-10 shadow-xl border border-slate-200/60"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <ShieldCheck className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-2xl font-black text-[#0F1C2E] mb-2">Verify your identity</h1>
                                <p className="text-sm text-slate-500 font-medium">
                                    We've sent a 6-digit code to <br />
                                    <span className="text-[#0F1C2E] font-bold">{signer?.signer_email}</span>
                                </p>
                            </div>

                            {/* OTP inputs */}
                            <div className="flex justify-center gap-2 md:gap-3 mb-6" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className="w-11 h-14 md:w-14 md:h-16 text-center text-2xl font-black text-[#0F1C2E] border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] transition-all"
                                    />
                                ))}
                            </div>

                            <button
                                onClick={verifyOtp}
                                disabled={otpLoading || otp.join('').length !== 6}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none"
                            >
                                {otpLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                                    </>
                                ) : (
                                    <>
                                        Verify & Continue <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <div className="text-center mt-4">
                                {otpResendTimer > 0 ? (
                                    <p className="text-xs text-slate-400 font-medium">
                                        Resend code in {otpResendTimer}s
                                    </p>
                                ) : (
                                    <button
                                        onClick={resendOtp}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-bold transition-colors"
                                    >
                                        Didn't receive it? Resend code
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── SIGN STAGE ── */}
                    {stage === STAGES.SIGN && (
                        <motion.div
                            key="sign"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {/* Document info card */}
                            <div className="bg-white rounded-[20px] p-5 shadow-xl border border-slate-200/60">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                            Signing as {signer?.signer_name}
                                        </div>
                                        <h2 className="font-black text-[#0F1C2E] mb-1">{signer?.document_name}</h2>
                                        {signer?.custom_message && (
                                            <p className="text-xs text-slate-500 font-medium italic">"{signer.custom_message}"</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold shrink-0">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Verified
                                    </div>
                                </div>
                            </div>

                            {/* Signature capture card */}
                            <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-xl border border-slate-200/60">
                                <h3 className="font-black text-[#0F1C2E] mb-1">Add your signature</h3>
                                <p className="text-xs text-slate-500 font-medium mb-4">Choose a method to sign this document</p>

                                {/* Method tabs */}
                                <div className="grid grid-cols-3 gap-2 mb-6">
                                    {METHODS.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => switchMethod(m.id)}
                                            className={`p-3 rounded-xl border-2 transition-all ${method === m.id
                                                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            <m.icon className={`w-4 h-4 mx-auto mb-1 ${method === m.id ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <div className={`text-xs font-bold ${method === m.id ? 'text-blue-700' : 'text-slate-500'}`}>
                                                {m.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Method: Draw */}
                                {method === 'drawn' && (
                                    <div>
                                        <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 relative overflow-hidden" style={{ height: 180 }}>
                                            <SignatureCanvas
                                                ref={padRef}
                                                penColor="#0F1C2E"
                                                canvasProps={{ className: 'w-full h-full' }}
                                                onEnd={handleDrawEnd}
                                            />
                                            {!signatureData && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <span className="text-xs text-slate-300 font-medium">Draw your signature above</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={clearDraw}
                                            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-bold transition-colors"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Clear
                                        </button>
                                    </div>
                                )}

                                {/* Method: Upload */}
                                {method === 'uploaded' && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
                                    >
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                                        {signatureData ? (
                                            <img src={signatureData} alt="Signature" className="max-h-32 mx-auto" />
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                                <div className="text-sm font-bold text-[#0F1C2E]">Click to upload signature image</div>
                                                <div className="text-xs text-slate-500 mt-1">PNG, JPG (transparent background works best)</div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Method: Typed */}
                                {method === 'typed' && (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={typedName}
                                            onChange={(e) => setTypedName(e.target.value)}
                                            placeholder="Type your full name"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] text-sm font-medium text-[#0F1C2E] transition-all"
                                        />
                                        <button
                                            onClick={generateTypedSig}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Generate signature
                                        </button>
                                        {signatureData && (
                                            <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 text-center">
                                                <img src={signatureData} alt="Typed signature" className="max-h-24 mx-auto" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* IT Act Consent */}
                                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={consentChecked}
                                            onChange={(e) => setConsentChecked(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                                        />
                                        <span className="text-xs text-slate-700 font-medium leading-relaxed">
                                            I agree to sign this document electronically under
                                            <strong className="text-blue-700"> Section 5 of the Information Technology Act, 2000</strong>.
                                            I understand this signature is legally binding.
                                        </span>
                                    </label>
                                </div>

                                <button
                                    onClick={submitSignature}
                                    disabled={!signatureData || !consentChecked || submitLoading}
                                    className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none"
                                >
                                    {submitLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" /> Submit signature
                                        </>
                                    )}
                                </button>

                                <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                    <Lock className="w-3 h-3" />
                                    256-bit encrypted · Court-admissible audit trail
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── DONE STAGE ── */}
                    {stage === STAGES.DONE && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white rounded-[24px] p-10 shadow-xl border border-slate-200/60 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring' }}
                                className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30"
                            >
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </motion.div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest mb-3">
                                <Sparkles className="w-3 h-3" /> Signed successfully
                            </div>
                            <h2 className="text-2xl font-black text-[#0F1C2E] mb-2">Thank you, {signer?.signer_name}!</h2>
                            <p className="text-sm text-slate-500 font-medium mb-6 max-w-md mx-auto">
                                Your signature has been securely recorded and a signed copy has been sent to your email at
                                <strong className="text-[#0F1C2E]"> {signer?.signer_email}</strong>.
                            </p>
                            {downloadUrl && (
                                <a
                                    href={`${import.meta.env.VITE_ESIGN_URL || ''}${downloadUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F1C2E] hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
                                >
                                    <Download className="w-4 h-4" /> Download signed PDF
                                </a>
                            )}
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
                                    <Shield className="w-3 h-3" />
                                    Legally valid under Section 5, IT Act 2000
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}