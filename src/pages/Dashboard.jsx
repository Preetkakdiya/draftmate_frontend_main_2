import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CalendarWidget from '../components/CalendarWidget';
import DraftingModal from '../components/DraftingModal';
import ProfileCompletionCard from '../components/ProfileCompletionCard';
import SubscriptionModal from '../components/SubscriptionModal';
import { API_CONFIG } from '../services/endpoints';

const ActionButton = ({ onClick }) => (
    <button onClick={onClick} className="text-slate-400 hover:text-primary transition-colors">
        <span className="material-symbols-outlined text-lg">edit</span>
    </button>
);

const buildStatusColor = (status) => {
    if (status === 'Started') return 'gray';
    if (status === 'Review') return 'blue';
    if (status === 'Completed') return 'green';
    if (status === 'Overdue') return 'red';
    return 'yellow';
};

const ensureDocxFilename = (filename, fallback = 'Untitled Draft') => {
    const raw = String(filename || fallback).trim() || fallback;
    if (raw.toLowerCase().endsWith('.docx') || raw.toLowerCase().endsWith('.pdf')) {
        return raw;
    }
    return `${raw}.docx`;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [isDraftingModalOpen, setIsDraftingModalOpen] = useState(false);
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);
    const [activeView, setActiveView] = useState('overview');

    // Dynamic User Data
    const [userProfile, setUserProfile] = useState(() => {
        const saved = localStorage.getItem('user_profile');
        return saved ? JSON.parse(saved) : { name: 'Attorney Davis' };
    });

    const [currentDate, setCurrentDate] = useState(new Date());

    // Dashboard draft state
    const [allDrafts, setAllDrafts] = useState([]);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        document.title = 'Dashboard | DraftMate';

        const handleProfileUpdate = () => {
            const saved = localStorage.getItem('user_profile');
            if (saved) setUserProfile(JSON.parse(saved));
        };

        const handleDraftUpdate = () => {
            try {
                const savedDrafts = JSON.parse(localStorage.getItem('my_drafts') || '[]');
                const sortedDrafts = [...savedDrafts].sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));

                const processedDrafts = sortedDrafts.map((draft) => {
                    const status = draft.status || 'In progress';
                    const trackingParams = draft.trackingParams || {
                        documentKey: draft.documentKey || draft.id || '',
                        filename: ensureDocxFilename(draft.filename || draft.name || draft.title || 'Untitled Draft'),
                        source: draft.source || 'local_draft',
                        folderId: draft.folderId ?? null,
                    };

                    return {
                        id: draft.id,
                        title: draft.name || draft.title || trackingParams.filename || 'Untitled Draft',
                        filename: ensureDocxFilename(draft.filename || draft.name || draft.title || trackingParams.filename || 'Untitled Draft'),
                        documentKey: draft.documentKey || draft.id || trackingParams.documentKey || '',
                        modified: new Date(draft.lastModified || Date.now()).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        status,
                        statusColor: buildStatusColor(status),
                        content: draft.content,
                        placeholders: draft.placeholders,
                        rawName: draft.name || draft.title,
                        onlyofficeConfig: draft.onlyofficeConfig || draft.workspaceConfig || null,
                        variablesDetected: draft.variablesDetected || [],
                        trackingParams,
                    };
                });

                setAllDrafts(processedDrafts);
            } catch (error) {
                console.error('Failed to load drafts for dashboard', error);
                setAllDrafts([]);
            }
        };

        handleDraftUpdate();
        window.addEventListener('user_profile_updated', handleProfileUpdate);
        window.addEventListener('storage', handleDraftUpdate);
        window.addEventListener('my_drafts_updated', handleDraftUpdate);

        // Update date every minute to ensure correctness
        const interval = setInterval(() => setCurrentDate(new Date()), 60000);

        return () => {
            window.removeEventListener('user_profile_updated', handleProfileUpdate);
            window.removeEventListener('storage', handleDraftUpdate);
            window.removeEventListener('my_drafts_updated', handleDraftUpdate);
            clearInterval(interval);
        };
    }, []);

    const dateStr = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const visibleDrafts = showAll ? allDrafts : allDrafts.slice(0, 5);

    const renderStatusBadge = (status, color) => {
        const colorClasses = {
            yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500',
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            gray: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.blue}`}>
                {status}
            </span>
        );
    };

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
                source: record.source || 'dashboard',
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

    const buildWorkspaceConfig = (draft) => {
        if (draft.onlyofficeConfig) return draft.onlyofficeConfig;

        const documentKey = draft.documentKey || draft.id || '';
        const filename = ensureDocxFilename(draft.filename || draft.title || draft.rawName || 'Untitled Draft');

        return {
            document: {
                fileType: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx',
                key: documentKey,
                title: filename,
                url: `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/serve/${encodeURIComponent(filename)}`,
                permissions: { edit: true, download: true, print: true },
            },
            documentType: 'word',
            editorConfig: {
                callbackUrl: `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/callback`,
                mode: 'edit',
                customization: { forcesave: true, chat: false },
            },
        };
    };

    const handleEditDraft = (draft) => {
        navigate('/dashboard/editor', {
            state: {
                htmlContent: draft.content,
                placeholders: draft.placeholders || [],
                uploadDetails: `Draft: ${draft.rawName}`,
                isEmpty: false,
                isSavedDraft: true,
                id: draft.id,
                documentKey: draft.documentKey || draft.id,
                filename: draft.filename || draft.title || draft.rawName,
                onlyofficeConfig: draft.onlyofficeConfig || null,
                variablesDetected: draft.variablesDetected || [],
            },
        });
    };

    const handleWorkspaceDraftOpen = (draft) => {
        const filename = ensureDocxFilename(draft.filename || draft.title || draft.rawName || 'Untitled Draft');
        const documentKey = draft.documentKey || draft.id || filename;
        const onlyofficeConfig = buildWorkspaceConfig({
            ...draft,
            filename,
            documentKey,
        });

        navigate('/dashboard/workspace', {
            state: {
                documentKey,
                filename,
                onlyofficeConfig,
                variablesDetected: draft.variablesDetected || [],
                trackingParams: draft.trackingParams || {
                    documentKey,
                    filename,
                    source: draft.trackingParams?.source || 'my_desk',
                    folderId: draft.trackingParams?.folderId ?? null,
                },
            },
        });
    };

    const handleCreateNewDraft = () => {
        setIsDraftingModalOpen(true);
    };

    const handleExistingDocumentClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const ext = `.${(file.name.split('.').pop() || '').toLowerCase()}`;
        if (!['.docx', '.pdf'].includes(ext)) {
            toast.error('Only .docx and .pdf files are supported.');
            event.target.value = '';
            return;
        }

        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            toast.error('Please sign in again before uploading a document.');
            event.target.value = '';
            return;
        }

        setIsUploadingDocument(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('session_id', sessionId);

            const response = await fetch(`${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionId}`,
                },
                body: formData,
            });

            if (!response.ok) {
                let detail = 'Failed to upload document.';
                try {
                    const errorData = await response.json();
                    detail = errorData?.detail || detail;
                } catch {
                    detail = response.statusText || detail;
                }
                throw new Error(detail);
            }

            const data = await response.json();

            saveDeskDraftRecord({
                id: data.documentKey,
                name: data.filename,
                filename: data.filename,
                documentKey: data.documentKey,
                onlyofficeConfig: data,
                variablesDetected: data.variablesDetected || [],
                status: 'In progress',
                source: 'dashboard_upload',
                trackingParams: {
                    source: 'dashboard_upload',
                    documentKey: data.documentKey,
                    filename: data.filename,
                    uploadedAt: new Date().toISOString(),
                },
            });

            navigate('/dashboard/workspace', {
                state: {
                    documentKey: data.documentKey,
                    filename: data.filename,
                    onlyofficeConfig: data,
                    variablesDetected: data.variablesDetected || [],
                    trackingParams: {
                        source: 'dashboard_upload',
                        documentKey: data.documentKey,
                        filename: data.filename,
                    },
                },
            });
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(error.message || 'Failed to upload and open document.');
        } finally {
            setIsUploadingDocument(false);
            event.target.value = '';
        }
    };

    const visibleDeskDrafts = allDrafts;

    return (
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative bg-background-light dark:bg-background-dark font-display">
            {isUploadingDocument && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#151f2e] p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 border border-slate-200 dark:border-slate-800">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-lg font-medium text-slate-800 dark:text-white">Uploading document...</p>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
            />

            {/* Header is handled in MainLayout, but structure here assumes full page content area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
                <div className="max-w-[1400px] mx-auto space-y-8">
                    {/* Welcome Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Hello, {userProfile.firstName || userProfile.name || (userProfile.email ? userProfile.email.split('@')[0] : 'User')}!
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-1">
                                Here is your daily overview for <span className="font-medium text-slate-700 dark:text-slate-300">{dateStr}</span>.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-white dark:bg-[#151f2e] rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Online Status</span>
                            </div>
                        </div>
                    </div>

                    {/* Entry Flow */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={handleCreateNewDraft}
                            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f2e] p-5 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all text-left"
                        >
                            <span className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-2xl">edit_document</span>
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Draft</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Start a new document with AI guidance or an empty workspace.
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={handleExistingDocumentClick}
                            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f2e] p-5 shadow-sm hover:shadow-lg hover:border-primary/50 transition-all text-left"
                        >
                            <span className="w-12 h-12 rounded-lg flex items-center justify-center bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-2xl">upload_file</span>
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Work on Existing Document</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Upload a `.docx` or `.pdf` file and continue in the workspace.
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveView(activeView === 'desk' ? 'overview' : 'desk')}
                            className={`group flex flex-col items-start gap-3 rounded-xl border p-5 shadow-sm hover:shadow-lg transition-all text-left ${activeView === 'desk'
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f2e] hover:border-primary/50'
                            }`}
                        >
                            <span className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${activeView === 'desk'
                                ? 'bg-primary text-white'
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white'
                            }`}>
                                <span className="material-symbols-outlined text-2xl">desk</span>
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Desk</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    View active files, their status, and tracking parameters.
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <div className="xl:col-span-2 space-y-6">
                            <ProfileCompletionCard />

                            {activeView === 'desk' ? (
                                <div className="bg-white dark:bg-[#151f2e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Desk</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                All active files from local storage, including their tracking metadata.
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium text-primary">
                                            {visibleDeskDrafts.length} files
                                        </span>
                                    </div>

                                    <div className="max-h-[640px] overflow-y-auto">
                                        {visibleDeskDrafts.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-400">folder_open</span>
                                                </div>
                                                <h4 className="text-base font-semibold text-slate-900 dark:text-white">No active files yet</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                    Create or upload a draft to see it here.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {visibleDeskDrafts.map((draft) => (
                                                    <button
                                                        key={draft.id}
                                                        type="button"
                                                        onClick={() => handleWorkspaceDraftOpen(draft)}
                                                        className="w-full text-left px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                                    {draft.title}
                                                                </h4>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                    {draft.filename}
                                                                </p>
                                                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                                                                        <span className="material-symbols-outlined text-[14px]">badge</span>
                                                                        {draft.documentKey || 'No key'}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                                                                        <span className="material-symbols-outlined text-[14px]">update</span>
                                                                        {draft.modified}
                                                                    </span>
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                                                                        <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                                                                        {draft.trackingParams?.source || 'local_draft'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                                {renderStatusBadge(draft.status, draft.statusColor)}
                                                                <span className="text-xs text-primary font-medium">Open in Workspace</span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#151f2e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Descriptions</h3>
                                        <button
                                            onClick={() => setShowAll(!showAll)}
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            {showAll ? 'Show Less' : 'View All'}
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium" scope="col">Document Title</th>
                                                    <th className="px-6 py-3 font-medium" scope="col">Last Modified</th>
                                                    <th className="px-6 py-3 font-medium" scope="col">Status</th>
                                                    <th className="px-6 py-3 font-medium text-right" scope="col">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {visibleDrafts.map((item, index) => (
                                                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.title}</td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{item.modified}</td>
                                                        <td className="px-6 py-4">
                                                            {renderStatusBadge(item.status, item.statusColor)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <ActionButton onClick={() => handleEditDraft(item)} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Calendar & Agenda */}
                        <div className="xl:col-span-1 space-y-6">
                            <CalendarWidget />
                        </div>
                    </div>
                </div>
            </div>

            {isDraftingModalOpen && (
                <DraftingModal
                    onClose={() => setIsDraftingModalOpen(false)}
                    initialEntryMode="dashboard"
                    onDraftCreated={saveDeskDraftRecord}
                />
            )}

            <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)} />
        </div>
    );
};

export default Dashboard;
