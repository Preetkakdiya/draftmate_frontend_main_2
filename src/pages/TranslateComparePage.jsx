import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Loader2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

const getCurrentUserId = () => {
    try {
        const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
        return userProfile.id || userProfile.email || localStorage.getItem('user_id') || null;
    } catch {
        return localStorage.getItem('user_id');
    }
};

const fetchTranslationJobDetails = async (jobId) => {
    if (jobId === 'mock') {
        return {
            job_id: 'MOCK_123',
            id: '123',
            file_name: 'Sample_Legal_Document.pdf',
            source_language: 'English',
            target_language: 'Hindi',
            status: 'completed'
        };
    }
    const userId = getCurrentUserId();
    return api.getTranslationJob(jobId, userId);
};

const TranslateComparePage = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();

    // Split-view and UI state
    const [leftWidth, setLeftWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [synchronizedScrolling, setSynchronizedScrolling] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);

    // Blob URL states for document rendering
    const [sourceBlobUrl, setSourceBlobUrl] = useState(null);
    const [translatedBlobUrl, setTranslatedBlobUrl] = useState(null);
    const [isLoadingSource, setIsLoadingSource] = useState(true);
    const [isLoadingTranslated, setIsLoadingTranslated] = useState(true);
    const [sourceError, setSourceError] = useState(false);
    const [translatedError, setTranslatedError] = useState(false);

    // DOM Refs for panels, iframes and sync control
    const leftPanelRef = useRef(null);
    const rightPanelRef = useRef(null);
    const leftIframeRef = useRef(null);
    const rightIframeRef = useRef(null);
    const isSyncing = useRef(false);

    const { data: jobDetails, isLoading, isError, refetch } = useQuery({
        queryKey: ['translationJob', jobId],
        queryFn: () => fetchTranslationJobDetails(jobId),
        enabled: !!jobId,
        refetchOnWindowFocus: false
    });

    const userId = getCurrentUserId();

    // Fetch document blobs with authentication headers
    useEffect(() => {
        if (!jobId || jobId === 'mock') {
            if (jobId === 'mock') {
                setIsLoadingSource(false);
                setIsLoadingTranslated(false);
            }
            return;
        }

        let isMounted = true;
        let createdSourceBlob = null;
        let createdTranslatedBlob = null;

        setIsLoadingSource(true);
        setIsLoadingTranslated(true);
        setSourceError(false);
        setTranslatedError(false);

        const headers = userId ? { 'X-User-Id': userId } : {};

        // Fetch Original Source Document
        const sourceUrl = api.getTranslationSourceUrl(jobId);
        fetch(sourceUrl, { headers })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Source fetch failed: ${res.status}`);
                const blob = await res.blob();
                if (isMounted) {
                    createdSourceBlob = URL.createObjectURL(blob);
                    setSourceBlobUrl(createdSourceBlob);
                    setIsLoadingSource(false);
                }
            })
            .catch((err) => {
                console.error('Failed to load source document blob:', err);
                if (isMounted) {
                    setSourceError(true);
                    setIsLoadingSource(false);
                }
            });

        // Fetch Translated Document
        const downloadUrl = api.getTranslationDownloadUrl(jobId) + '?raw=1';
        fetch(downloadUrl, { headers })
            .then(async (res) => {
                if (!res.ok) throw new Error(`Translated fetch failed: ${res.status}`);
                const blob = await res.blob();
                if (isMounted) {
                    createdTranslatedBlob = URL.createObjectURL(blob);
                    setTranslatedBlobUrl(createdTranslatedBlob);
                    setIsLoadingTranslated(false);
                }
            })
            .catch((err) => {
                console.error('Failed to load translated document blob:', err);
                if (isMounted) {
                    setTranslatedError(true);
                    setIsLoadingTranslated(false);
                }
            });

        return () => {
            isMounted = false;
            if (createdSourceBlob) URL.revokeObjectURL(createdSourceBlob);
            if (createdTranslatedBlob) URL.revokeObjectURL(createdTranslatedBlob);
        };
    }, [jobId, userId]);

    // Download helpers
    const downloadFile = async (type) => {
        try {
            const url = type === 'source' 
                ? api.getTranslationSourceUrl(jobId) 
                : api.getTranslationDownloadUrl(jobId) + '?raw=1';
            const defaultName = type === 'source'
                ? (jobDetails?.file_name || 'original_document.pdf')
                : (`Translated_${jobDetails?.target_language || 'HI'}_${jobDetails?.file_name || 'document.pdf'}`);
            
            const res = await fetch(url, { headers: userId ? { 'X-User-Id': userId } : {} });
            if (!res.ok) throw new Error(`Download failed: ${res.status}`);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = defaultName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(objectUrl); document.body.removeChild(a); }, 200);
            toast.success(`Downloading ${type === 'source' ? 'original' : 'translated'} document...`);
        } catch (err) {
            toast.error('Download failed. Please try again.');
        }
    };

    // Handlers
    const handleBack = () => navigate('/dashboard/translate');
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));
    const handleResetZoom = () => setZoomLevel(100);

    // Draggable Divider Handlers
    const startResizing = () => setIsDragging(true);
    const stopResizing = () => setIsDragging(false);

    useEffect(() => {
        const onResize = (e) => {
            if (!isDragging) return;
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const newLeftWidth = (clientX / window.innerWidth) * 100;
            if (newLeftWidth > 20 && newLeftWidth < 80) {
                setLeftWidth(newLeftWidth);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', onResize);
            window.addEventListener('mouseup', stopResizing);
            window.addEventListener('touchmove', onResize);
            window.addEventListener('touchend', stopResizing);
            document.body.classList.add('cursor-col-resize', 'select-none');
        } else {
            window.removeEventListener('mousemove', onResize);
            window.removeEventListener('mouseup', stopResizing);
            window.removeEventListener('touchmove', onResize);
            window.removeEventListener('touchend', stopResizing);
            document.body.classList.remove('cursor-col-resize', 'select-none');
        }
        return () => {
            window.removeEventListener('mousemove', onResize);
            window.removeEventListener('mouseup', stopResizing);
            window.removeEventListener('touchmove', onResize);
            window.removeEventListener('touchend', stopResizing);
            document.body.classList.remove('cursor-col-resize', 'select-none');
        };
    }, [isDragging]);

    // Synchronized Scrolling Implementation
    useEffect(() => {
        if (!synchronizedScrolling) return;

        const leftIframe = leftIframeRef.current;
        const rightIframe = rightIframeRef.current;
        const leftOuter = leftPanelRef.current;
        const rightOuter = rightPanelRef.current;

        const getWinDoc = (iframe) => {
            try {
                const win = iframe?.contentWindow;
                const doc = iframe?.contentDocument || win?.document;
                const targetEl = doc?.scrollingElement || doc?.documentElement || doc?.body;
                return { win, doc, targetEl };
            } catch (e) {
                return { win: null, doc: null, targetEl: null };
            }
        };

        const syncScroll = (sourceIsLeft) => {
            if (isSyncing.current) return;
            isSyncing.current = true;

            const srcIframe = sourceIsLeft ? leftIframe : rightIframe;
            const tgtIframe = sourceIsLeft ? rightIframe : leftIframe;
            const srcOuter = sourceIsLeft ? leftOuter : rightOuter;
            const tgtOuter = sourceIsLeft ? rightOuter : leftOuter;

            const { targetEl: srcEl } = getWinDoc(srcIframe);
            const { targetEl: tgtEl } = getWinDoc(tgtIframe);

            if (srcEl && tgtEl) {
                const maxSrc = srcEl.scrollHeight - srcEl.clientHeight;
                const maxTgt = tgtEl.scrollHeight - tgtEl.clientHeight;
                if (maxSrc > 0 && maxTgt > 0) {
                    const ratio = srcEl.scrollTop / maxSrc;
                    tgtEl.scrollTop = ratio * maxTgt;
                }
            }

            if (srcOuter && tgtOuter) {
                const maxSrcOut = srcOuter.scrollHeight - srcOuter.clientHeight;
                const maxTgtOut = tgtOuter.scrollHeight - tgtOuter.clientHeight;
                if (maxSrcOut > 0 && maxTgtOut > 0) {
                    tgtOuter.scrollTop = (srcOuter.scrollTop / maxSrcOut) * maxTgtOut;
                }
            }

            requestAnimationFrame(() => {
                isSyncing.current = false;
            });
        };

        let cleanupFns = [];

        const attachListeners = () => {
            cleanupFns.forEach(fn => fn());
            cleanupFns = [];

            const leftWin = getWinDoc(leftIframe).win;
            const rightWin = getWinDoc(rightIframe).win;

            const onLeft = () => syncScroll(true);
            const onRight = () => syncScroll(false);

            if (leftWin) {
                try {
                    leftWin.addEventListener('scroll', onLeft, { passive: true });
                    cleanupFns.push(() => leftWin.removeEventListener('scroll', onLeft));
                } catch(e){}
            }
            if (rightWin) {
                try {
                    rightWin.addEventListener('scroll', onRight, { passive: true });
                    cleanupFns.push(() => rightWin.removeEventListener('scroll', onRight));
                } catch(e){}
            }
            if (leftOuter) {
                leftOuter.addEventListener('scroll', onLeft, { passive: true });
                cleanupFns.push(() => leftOuter.removeEventListener('scroll', onLeft));
            }
            if (rightOuter) {
                rightOuter.addEventListener('scroll', onRight, { passive: true });
                cleanupFns.push(() => rightOuter.removeEventListener('scroll', onRight));
            }
        };

        attachListeners();

        const onLeftLoad = () => attachListeners();
        const onRightLoad = () => attachListeners();

        leftIframe?.addEventListener('load', onLeftLoad);
        rightIframe?.addEventListener('load', onRightLoad);

        return () => {
            cleanupFns.forEach(fn => fn());
            leftIframe?.removeEventListener('load', onLeftLoad);
            rightIframe?.removeEventListener('load', onRightLoad);
        };
    }, [synchronizedScrolling, isLoadingSource, isLoadingTranslated]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-900 text-slate-200">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-xl font-semibold tracking-wide animate-pulse">
                    Preparing document comparison workspace...
                </p>
            </div>
        );
    }

    if (isError || !jobDetails) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-900 text-red-400 p-6">
                <div className="max-w-md text-center space-y-4">
                    <AlertCircle className="h-12 w-12 mx-auto text-rose-500" />
                    <h1 className="text-2xl font-bold text-white">Retrieval Error</h1>
                    <p className="text-slate-400 text-sm">The translation job data could not be loaded. It may still be processing or has been removed.</p>
                    <div className="flex justify-center gap-3 pt-2">
                        <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all">
                            <RefreshCw size={16} /> Retry
                        </button>
                        <button onClick={handleBack} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm border border-slate-700 transition-all">
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-200">
            {/* Sticky Top Header Bar */}
            <header className="flex-shrink-0 bg-slate-900 border-b border-slate-800 px-6 py-3.5 shadow-lg flex flex-wrap items-center justify-between gap-4 z-10">
                <div className="flex items-center space-x-4 min-w-0">
                    <button
                        onClick={handleBack}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors duration-200"
                        title="Back to Translations"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold text-white truncate">
                            Document Comparison
                        </h1>
                        <p className="text-xs text-slate-400 truncate" title={jobDetails.file_name}>
                            File: {jobDetails.file_name || `Job #${jobDetails.job_id || jobId}`}
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2 text-xs">
                        <span className="bg-slate-800 text-indigo-400 border border-slate-700/80 px-2.5 py-1 rounded-lg font-semibold">
                            {jobDetails.source_language || 'Auto'} → {jobDetails.target_language || 'Target'}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-semibold capitalize">
                            {jobDetails.status || 'Completed'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {/* File Downloads */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => downloadFile('source')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                            title="Download Original File"
                        >
                            <Download size={14} />
                            <span className="hidden sm:inline">Original</span>
                        </button>
                        <button
                            onClick={() => downloadFile('translated')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                            title="Download Translated File"
                        >
                            <Download size={14} />
                            <span className="hidden sm:inline">Translation</span>
                        </button>
                    </div>

                    {/* Synchronized Scrolling Toggle */}
                    <label className="hidden sm:flex items-center cursor-pointer select-none">
                        <span className="mr-2 text-xs font-medium text-slate-300">Sync Scroll</span>
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={synchronizedScrolling}
                                onChange={() => setSynchronizedScrolling(!synchronizedScrolling)}
                            />
                            <div className={`block w-9 h-5 rounded-full transition-colors ${synchronizedScrolling ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                            <div
                                className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                                    synchronizedScrolling ? 'transform translate-x-4' : ''
                                }`}
                            ></div>
                        </div>
                    </label>

                    {/* Zoom Controls */}
                    <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700/80 rounded-lg p-1">
                        <button
                            onClick={handleZoomOut}
                            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={15} />
                        </button>
                        <span className="text-xs font-semibold text-slate-200 w-9 text-center">{zoomLevel}%</span>
                        <button
                            onClick={handleZoomIn}
                            className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={15} />
                        </button>
                        <button
                            onClick={handleResetZoom}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors ml-1 border-l border-slate-700"
                            title="Reset Zoom"
                        >
                            <Maximize size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Dual-Pane Split Container */}
            <div className="flex-grow flex overflow-hidden relative bg-slate-950">
                {/* Left Panel (Source Document) */}
                <div 
                    style={{ width: `${leftWidth}%` }}
                    className="h-full flex flex-col border-r border-slate-800 min-w-0"
                >
                    <div className="flex-shrink-0 bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Original ({jobDetails.source_language || 'Source'})
                        </span>
                        {sourceBlobUrl && (
                            <button onClick={() => downloadFile('source')} className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium">
                                Download
                            </button>
                        )}
                    </div>
                    
                    <div ref={leftPanelRef} className="flex-grow overflow-auto p-4 bg-slate-950 relative">
                        {isLoadingSource ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <p className="text-sm font-medium">Loading original document...</p>
                            </div>
                        ) : sourceError ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
                                <AlertCircle className="h-10 w-10 text-amber-400" />
                                <p className="text-sm font-semibold text-slate-200">Unable to display original document inline</p>
                                <p className="text-xs text-slate-400 max-w-xs">The document may require downloading to view in your preferred application.</p>
                                <button
                                    onClick={() => downloadFile('source')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
                                >
                                    <Download size={14} /> Download Original Document
                                </button>
                            </div>
                        ) : (
                            <iframe 
                                ref={leftIframeRef}
                                src={sourceBlobUrl} 
                                title="Original Source Document" 
                                className="w-full h-full border-none bg-white rounded-xl shadow-2xl transition-transform duration-300"
                                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                            />
                        )}
                    </div>
                </div>

                {/* Vertical Drag Bar Divider */}
                <div 
                    onMouseDown={startResizing}
                    className={`w-2 h-full cursor-col-resize z-20 transition-colors flex items-center justify-center ${
                        isDragging ? 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800 hover:bg-indigo-500/80'
                    }`}
                >
                    <div className="w-0.5 h-8 bg-slate-600 rounded-full" />
                </div>

                {/* Right Panel (Translated Document) */}
                <div 
                    style={{ width: `${100 - leftWidth}%` }}
                    className="h-full flex flex-col min-w-0"
                >
                    <div className="flex-shrink-0 bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                            Translation ({jobDetails.target_language || 'Target'})
                        </span>
                        {translatedBlobUrl && (
                            <button onClick={() => downloadFile('translated')} className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium">
                                Download
                            </button>
                        )}
                    </div>

                    <div ref={rightPanelRef} className="flex-grow overflow-auto p-4 bg-slate-950 relative">
                        {isLoadingTranslated ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                                <p className="text-sm font-medium">Loading translated document...</p>
                            </div>
                        ) : translatedError ? (
                            <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
                                <AlertCircle className="h-10 w-10 text-amber-400" />
                                <p className="text-sm font-semibold text-slate-200">Unable to display translated document inline</p>
                                <p className="text-xs text-slate-400 max-w-xs">Click below to download the completed translated file.</p>
                                <button
                                    onClick={() => downloadFile('translated')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
                                >
                                    <Download size={14} /> Download Translated Document
                                </button>
                            </div>
                        ) : (
                            <iframe 
                                ref={rightIframeRef}
                                src={translatedBlobUrl} 
                                title="Translated Document" 
                                className="w-full h-full border-none bg-white rounded-xl shadow-2xl transition-transform duration-300"
                                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranslateComparePage;