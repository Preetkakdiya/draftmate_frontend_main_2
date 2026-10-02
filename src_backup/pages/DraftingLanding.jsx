import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DraftingModal from '../components/DraftingModal';
import axios from 'axios';
import { API_CONFIG } from '../services/endpoints';
import { toast } from 'sonner';
import { 
  Plus, UploadCloud, FolderClosed, Users, FileSignature, 
  Sparkles, Search, CheckCircle, PencilRuler, HelpCircle,
  ArrowRight, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/draftmate_logo.png';
import AiDisclaimerNotice from '../components/AiDisclaimerNotice';
import './DraftingLanding.css';

const DRAFTING_FEATURES = [
    {
        id: 'collab',
        icon: Users,
        title: 'Real-Time Multi-User Collaboration',
        desc: 'Invite partners, clients, or co-counsel to the document. Write, edit, and track changes together in perfect real-time sync.',
        accent: '#4F46E5', // Indigo
        accentLight: 'rgba(79, 70, 229, 0.1)',
    },
    {
        id: 'msword',
        icon: FileSignature,
        title: 'Familiar MS Word Compatibility',
        desc: 'No learning curve. Enjoy full rich-text editing capabilities, standard legal shortcuts, and perfect document integrity with zero formatting losses.',
        accent: '#2563EB', // Blue
        accentLight: 'rgba(37, 99, 235, 0.1)',
    },
    {
        id: 'ai-enhance',
        icon: Sparkles,
        title: 'Contextual Inline AI Enhancer',
        desc: 'Highlight any clause to rewrite, expand, or change the legal tone. Use follow-up AI prompts to polish specific paragraphs on the fly.',
        accent: '#9333EA', // Purple
        accentLight: 'rgba(147, 51, 234, 0.1)',
    },
    {
        id: 'research',
        icon: Search,
        title: 'Legal Research Assistant',
        desc: 'Stop jumping between tabs. A built-in sidebar lets you pull up case law, statutes, and precedents directly next to your live workspace canvas.',
        accent: '#D97706', // Amber
        accentLight: 'rgba(217, 119, 6, 0.1)',
    },
    {
        id: 'format',
        icon: CheckCircle,
        title: 'One-Click Auto-Formatting',
        desc: 'Select text and instantly structure it into standard jurisdiction legal templates. Includes clear descriptions of applied format changes.',
        accent: '#059669', // Emerald
        accentLight: 'rgba(5, 150, 105, 0.1)',
    },
    {
        id: 'generate',
        icon: PencilRuler,
        title: 'From-Scratch AI Generation',
        desc: 'Stuck on a blank page? Feed the AI your core arguments and facts to automatically generate highly technical, structured legal drafts in seconds.',
        accent: '#E11D48', // Rose
        accentLight: 'rgba(225, 29, 72, 0.1)',
    }
];

const CYCLE_MS = 6000; // 6 seconds per feature

const DynamicFeaturesTyper = () => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef(null);
    const startRef = useRef(Date.now());
  
    const startCycle = React.useCallback((fromIdx) => {
      if (timerRef.current) clearInterval(timerRef.current);
      startRef.current = Date.now();
      setProgress(0);
  
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startRef.current;
        const pct = Math.min((elapsed / CYCLE_MS) * 100, 100);
        setProgress(pct);
  
        if (elapsed >= CYCLE_MS) {
          const next = (fromIdx + 1) % DRAFTING_FEATURES.length;
          setActiveIdx(next);
          startCycle(next);
        }
      }, 16);
    }, []);
  
    useEffect(() => {
      startCycle(0);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startCycle]);

    const activeFeature = DRAFTING_FEATURES[activeIdx];

    return (
        <section className="dynamic-features-section">
            <div className="dynamic-features-header">
                <h2 className="section-title">Inside the <span>Drafting Suite</span></h2>
            </div>
            
            <div className="dynamic-typer-container">
                {/* Left side: Navigation / Timeline */}
                <div className="dynamic-features-list">
                    {DRAFTING_FEATURES.map((feature, i) => {
                        const isActive = activeIdx === i;
                        return (
                            <div 
                                key={feature.id} 
                                className={`feature-list-item ${isActive ? 'active' : ''}`}
                                onClick={() => { setActiveIdx(i); startCycle(i); }}
                                style={{
                                    '--feature-accent': feature.accent,
                                    '--feature-accent-light': feature.accentLight
                                }}
                            >
                                <div className="feature-list-icon">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <div className="feature-list-title">{feature.title}</div>
                                {isActive && (
                                    <div className="feature-progress-bar">
                                        <motion.div 
                                            className="feature-progress-fill"
                                            initial={{ width: '0%' }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ ease: "linear" }}
                                            style={{ background: feature.accent }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right side: Dynamic Content Box */}
                <div className="dynamic-feature-display">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeFeature.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="dynamic-feature-card"
                            style={{
                                '--feature-accent': activeFeature.accent,
                                '--feature-accent-light': activeFeature.accentLight
                            }}
                        >
                            <div className="dynamic-card-icon">
                                <activeFeature.icon className="h-8 w-8" />
                            </div>
                            <h3 className="dynamic-card-title">{activeFeature.title}</h3>
                            <p className="dynamic-card-desc">{activeFeature.desc}</p>
                            
                            {/* Decorative elements */}
                            <div className="dynamic-card-glow" />
                            <div className="dynamic-card-pattern" />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
};

const ensureDocxFilename = (filename, fallback = 'Untitled Draft') => {
    const raw = String(filename || fallback).trim() || fallback;
    if (raw.toLowerCase().endsWith('.docx') || raw.toLowerCase().endsWith('.pdf')) {
        return raw;
    }
    return `${raw}.docx`;
};


// Short rotating phrases — much more aesthetic than typing a wall of text
const ROTATING_PHRASES = [
    "Real-time multi-user collaboration",
    "Inline AI clause enhancement",
    "Instant legal research sidebar",
    "MS Word-compatible engine",
    "Co-author briefs with your team",
];

const RotatingPhrase = () => {
    const [index, setIndex] = useState(0);
    const [display, setDisplay] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const current = ROTATING_PHRASES[index];
        let timeout;

        if (!isDeleting && display === current) {
            // Pause at full phrase
            timeout = setTimeout(() => setIsDeleting(true), 5200);
        } else if (isDeleting && display === "") {
            setIsDeleting(false);
            setIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
        } else {
            timeout = setTimeout(() => {
                const next = isDeleting
                    ? current.slice(0, display.length - 1)
                    : current.slice(0, display.length + 1);
                setDisplay(next);
            }, isDeleting ? 18 : 32);
        }

        return () => clearTimeout(timeout);
    }, [display, isDeleting, index]);

    return (
        <span className="rotating-phrase">
            {display}
            <span className="blinking-cursor" />
        </span>
    );
};

const DraftingLanding = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [initialDraftingPrompt, setInitialDraftingPrompt] = useState('');
    const fileInputRef = useRef(null);

    const saveDeskDraftRecord = (record) => {
        const savedDrafts = JSON.parse(localStorage.getItem('my_drafts') || '[]');
        const nextRecord = {
            ...record,
            id: record.id || record.documentKey || Date.now().toString(),
            name: record.name || record.filename || record.title || 'Untitled Draft',
            filename: ensureDocxFilename(record.filename || record.name || record.title || 'Untitled Draft'),
            documentKey: record.documentKey || record.id || '',
            lastModified: record.lastModified || new Date().toISOString(),
            status: record.status || 'In progress',
            trackingParams: record.trackingParams || {
                source: 'drafting_landing_upload',
                documentKey: record.documentKey || record.id || '',
                filename: ensureDocxFilename(record.filename || record.name || record.title || 'Untitled Draft'),
                updatedAt: record.lastModified || new Date().toISOString(),
                folderId: record.folderId ?? null,
            },
        };

        const updatedDrafts = [
            ...savedDrafts.filter((draft) => String(draft.id) !== String(nextRecord.id)),
            nextRecord,
        ];

        localStorage.setItem('my_drafts', JSON.stringify(updatedDrafts));
        window.dispatchEvent(new Event('my_drafts_updated'));
    };

    useEffect(() => {
        if (location.state?.openDrafting) {
            setInitialDraftingPrompt(location.state.prompt || '');
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleCreateNewClick = () => {
        setInitialDraftingPrompt('');
        setIsModalOpen(true);
    };

    const handleCreateEmptyClick = async () => {
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            toast.error('Please sign in again before creating a document.');
            return;
        }

        const loadingToast = toast.loading('Creating empty document...');

        try {
            const url = `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/create`;
            const response = await axios.post(url, {}, {
                headers: {
                    Authorization: `Bearer ${sessionId}`
                }
            });
            const data = response.data;
            const fileName = data?.filename || data?.document?.title || 'Untitled Draft.docx';
            const documentKey = data?.documentKey || data?.document?.key || '';
            const onlyofficeConfig = data?.onlyofficeConfig || data;

            saveDeskDraftRecord({
                id: documentKey,
                name: fileName,
                filename: fileName,
                documentKey,
                onlyofficeConfig,
                variablesDetected: data?.variablesDetected || [],
                status: 'In progress',
                source: 'empty_document',
                trackingParams: {
                    source: 'empty_document',
                    documentKey,
                    filename: fileName,
                    createdAt: new Date().toISOString(),
                },
            });

            toast.dismiss(loadingToast);
            toast.success('Empty document created successfully!');

            navigate('/dashboard/workspace', {
                state: {
                    documentKey,
                    filename: fileName,
                    onlyofficeConfig,
                    variablesDetected: data?.variablesDetected || [],
                    trackingParams: {
                        source: 'empty_document',
                        documentKey,
                        filename: fileName,
                    }
                }
            });
        } catch (error) {
            console.error('Failed to create empty document:', error);
            toast.dismiss(loadingToast);
            toast.error('Failed to initialize empty document. Please try again.');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        let sessionId = localStorage.getItem('session_id') || localStorage.getItem('token') || localStorage.getItem('user_id');
        if (!sessionId) {
            sessionId = 'user_session_' + Date.now();
            localStorage.setItem('session_id', sessionId);
        }

        setIsUploading(true);
        const uploadToast = toast.loading(`Uploading ${files.length} document${files.length > 1 ? 's' : ''}...`);
        
        const uploadedRecords = [];

        try {
            const url = `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/upload`;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (files.length > 1) {
                    toast.loading(`Uploading (${i + 1}/${files.length}): "${file.name}"...`, { id: uploadToast });
                }

                const formData = new FormData();
                formData.append('file', file);
                formData.append('session_id', sessionId);

                const response = await axios.post(url, formData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${sessionId}`
                    },
                });
                const data = response.data;

                const record = {
                    id: data.draftId || data.documentKey,
                    draftId: data.draftId,
                    name: data.filename,
                    filename: data.filename,
                    documentKey: data.documentKey,
                    onlyofficeConfig: data,
                    variablesDetected: data.variablesDetected || [],
                    status: 'In progress',
                    source: 'drafting_landing_upload',
                    trackingParams: {
                        source: 'drafting_landing_upload',
                        draftId: data.draftId,
                        documentKey: data.documentKey,
                        filename: data.filename,
                        uploadedAt: new Date().toISOString(),
                    },
                };

                saveDeskDraftRecord(record);
                uploadedRecords.push(record);
            }

            toast.dismiss(uploadToast);
            if (uploadedRecords.length > 1) {
                toast.success(`${uploadedRecords.length} documents uploaded & saved to My Drafts!`);
            } else {
                toast.success("Document uploaded successfully!");
            }

            const firstDoc = uploadedRecords[0];
            navigate('/dashboard/workspace', {
                state: {
                    draftId: firstDoc.draftId,
                    documentKey: firstDoc.documentKey,
                    filename: firstDoc.filename,
                    onlyofficeConfig: firstDoc.onlyofficeConfig,
                    variablesDetected: firstDoc.variablesDetected || [],
                    uploadedDrafts: uploadedRecords,
                    trackingParams: firstDoc.trackingParams,
                }
            });
        } catch (error) {
            console.error('Upload failed:', error);
            if (error.response?.status === 401) {
                const freshSession = 'user_session_' + Date.now();
                localStorage.setItem('session_id', freshSession);
                try {
                    const url = `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/upload`;
                    const retryRecords = [];
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('session_id', freshSession);

                        const response = await axios.post(url, formData, {
                            headers: { 
                                'Content-Type': 'multipart/form-data',
                                'Authorization': `Bearer ${freshSession}`
                            },
                        });
                        const data = response.data;
                        const record = {
                            id: data.documentKey,
                            name: data.filename,
                            filename: data.filename,
                            documentKey: data.documentKey,
                            onlyofficeConfig: data,
                            variablesDetected: data.variablesDetected || [],
                            status: 'In progress',
                            source: 'drafting_landing_upload',
                            trackingParams: {
                                source: 'drafting_landing_upload',
                                documentKey: data.documentKey,
                                filename: data.filename,
                                uploadedAt: new Date().toISOString(),
                            },
                        };
                        saveDeskDraftRecord(record);
                        retryRecords.push(record);
                    }
                    toast.dismiss(uploadToast);
                    toast.success("Document uploaded successfully!");
                    const firstDoc = retryRecords[0];
                    navigate('/dashboard/workspace', {
                        state: {
                            documentKey: firstDoc.documentKey,
                            filename: firstDoc.filename,
                            onlyofficeConfig: firstDoc.onlyofficeConfig,
                            variablesDetected: firstDoc.variablesDetected || [],
                            uploadedDrafts: retryRecords,
                            trackingParams: firstDoc.trackingParams,
                        }
                    });
                    return;
                } catch (retryErr) {
                    console.error('Retry failed:', retryErr);
                }
            }
            toast.dismiss(uploadToast);
            const serverMsg = error.response?.data?.detail || error.response?.data?.message || error.message;
            toast.error(`Upload failed: ${serverMsg || 'Please try again.'}`);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="drafting-landing-container">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".pdf,.docx,.doc,.rtf,.txt"
                multiple
                style={{ display: 'none' }} 
            />

            {/* 🚀 Hero Section */}
            <header className="drafting-hero">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="hero-badge"
                >
                    <img src={logo} alt="DraftMate" className="h-4 w-4 object-contain" />
                    <span>DraftMate Intelligence</span>
                </motion.div>

                <h1 className="hero-title">
                    <motion.span
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.25 }}
                        className="title-line"
                    >
                        Draft, Research, and Collaborate—
                    </motion.span>
                    <motion.span
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.38 }}
                        className="title-highlight"
                    >
                        All in One Intelligent Workspace.
                    </motion.span>
                </h1>

                {/* Dynamic short phrase — not the long paragraph */}
                <motion.p
                    className="hero-rotator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                >
                    Supercharged with <RotatingPhrase />
                </motion.p>

                {/* Static, instantly readable description */}
                {/* <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.65 }}
                    className="hero-quote-container"
                >
                    <p className="hero-quote">
                        A powerful, MS Word-compatible drafting engine supercharged with
                        real-time multi-user collaboration, inline AI assistance, and
                        instant legal research. Co-author briefs from scratch or optimize
                        existing documents simultaneously with your team.
                    </p>
                </motion.div> */}
            </header>

            {/* 📥 Workspace Entry Points (Launchpad) */}
            <section className="launchpad-grid">
                {/* Card 1: Create New */}
                <motion.div 
                    className="launchpad-card create-new" 
                    onClick={handleCreateNewClick}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="card-icon-wrapper">
                        <Plus className="h-6 w-6" />
                    </div>
                    <div className="card-badge">DRAFTMATE-SPECIAL</div>
                    <h3 className="card-title">AI Legal Drafting</h3>
                    <p className="card-desc">
                        Start drafting with Draftmate AI, and do legal research side-by-side with Lex-Bot: Your AI Legal Assistant.
                    </p>
                    <div className="card-glow" />
                </motion.div>

                {/* Card 2: Start Empty Document */}
                <motion.div 
                    className="launchpad-card empty-doc" 
                    onClick={handleCreateEmptyClick}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="card-icon-wrapper">
                        <FolderClosed className="h-6 w-6" />
                    </div>
                    <div className="card-badge">FROM SCRATCH</div>
                    <h3 className="card-title">Create Your Own Draft</h3>
                    <p className="card-desc">
                        Create an empty workspace without AI intake and Do AI Research Side-by-Side.
                    </p>
                    <div className="card-glow" />
                </motion.div>

                {/* Card 3: Upload */}
                <motion.div 
                    className="launchpad-card existing-doc" 
                    onClick={handleUploadClick}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <div className="card-icon-wrapper">
                        <UploadCloud className="h-6 w-6" />
                    </div>
                    <div className="card-badge">WORD COMPATIBLE</div>
                    <h3 className="card-title">Upload Your Draft</h3>
                    <p className="card-desc">
                        Upload your Draft in PDF or Document format to seamlessly continue your work in word compatible editor.
                    </p>
                    <div className="card-glow" />
                </motion.div>
            </section>

            {/* 🕒 AI Chronology Builder Banner */}
            <section className="chronology-banner-section">
                <div className="chronology-banner">
                    <div className="chronology-banner-bg" />
                    <div className="chronology-banner-content">
                        <div className="chronology-badge">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>NEW FEATURE</span>
                        </div>
                        <h2 className="chronology-title">AI Legal Chronology Builder</h2>
                        <p className="chronology-desc">
                            Upload case documents (PDF, DOCX, TXT) and automatically compile a normalized, fact-checked timeline of events with page-level source citations.
                        </p>
                        <button className="chronology-btn" onClick={() => navigate('/dashboard/chronology')}>
                            Build Case Chronology <ArrowRight className="h-4 w-4 ml-1.5" />
                        </button>
                    </div>
                    <div className="chronology-banner-visual">
                        <div className="timeline-mockup">
                            <div className="timeline-item">
                                <div className="timeline-dot primary"></div>
                                <div className="timeline-text">15 Jun 2023 - Terminated</div>
                            </div>
                            <div className="timeline-item">
                                <div className="timeline-dot secondary"></div>
                                <div className="timeline-text">18 Jun 2023 - Notice Sent</div>
                            </div>
                            <div className="timeline-item warning">
                                <div className="timeline-dot warning"></div>
                                <div className="timeline-text"><Clock className="h-3.5 w-3.5 inline mr-1"/> Date Conflict Detected</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ✨ Dynamic Features Typer */}
            <DynamicFeaturesTyper />

            <AiDisclaimerNotice className="mt-8 mb-4" />

            {/* AI Generator Modal */}
            {isModalOpen && (
                <DraftingModal 
                    onClose={() => setIsModalOpen(false)} 
                    initialPrompt={initialDraftingPrompt} 
                    initialEntryMode="dashboard"
                    onDraftCreated={saveDeskDraftRecord}
                />
            )}
        </div>
    );
};

export default DraftingLanding;
