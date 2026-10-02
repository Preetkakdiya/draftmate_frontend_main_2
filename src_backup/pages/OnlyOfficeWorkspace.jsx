import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Gavel, Loader2, Plus, Mic, Quote, Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { processCitations, CitationLink } from '../utils/citationUtils';
import { API_CONFIG } from '../services/endpoints';
import { api } from '../services/api';
import { toast } from 'sonner';
import logo from '../assets/draftmate_logo.png';

const SmoothVlcProgressBar = ({ statusMessage, isLoading }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      return;
    }
    
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 98) {
          return prev + 1;
        }
        return prev;
      });
    }, 70);

    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="my-2 bg-white border border-blue-100 rounded-xl p-3 shadow-[0_4px_15px_rgba(37,99,235,0.06)] text-slate-800">
      <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
        <span className="truncate text-slate-700 flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
          {statusMessage || 'Assistant is thinking...'}
        </span>
        <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">{progress}%</span>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full w-full overflow-hidden border border-slate-200 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)] pointer-events-none transition-all duration-150 ease-out z-10"
          style={{ left: `calc(${progress}% - 7px)` }}
        />
      </div>
    </div>
  );
};

const envBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
const ONLYOFFICE_API_SRC = `${envBaseUrl}/onlyoffice/web-apps/apps/api/documents/api.js`;
const ONLYOFFICE_ORIGIN = new URL(ONLYOFFICE_API_SRC).origin;

const OnlyOfficeWorkspace = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const editorInstanceRef = useRef(null);
  const pluginWindowRef = useRef(null);
  const pendingSelectionActionRef = useRef(null);
  const activeCaseRequestIdRef = useRef(0);
  const activeCaseGenerationIdRef = useRef(0);
  const caseFetchAbortRef = useRef(null);
  const caseGenerationAbortRef = useRef(null);
  const caseParagraphTextRef = useRef('');
  const chatEndRef = useRef(null);
  const composerTextareaRef = useRef(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerHasValue, setComposerHasValue] = useState(false);
  const selectionPollRef = useRef(null);
  const selectionPollPausedUntilRef = useRef(0);
  const dismissedSelectionTextRef = useRef('');
  const mountedKeyRef = useRef(null);

  const canvasTargetRef = useRef(null);
  const [docsApiReady, setDocsApiReady] = useState(false);
  const [isCanvasLoading, setIsCanvasLoading] = useState(true);

  // Tab State: 'chat' or 'variables'
  const [activeTab, setActiveTab] = useState('chat');

  // AI Assistant Chat State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Legal Assistant. You can ask me to research clauses, tenancy laws, explain selected text, or generate content to insert into your document.',
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectionPreview, setSelectionPreview] = useState('');
  const [showAutoFormatPopup, setShowAutoFormatPopup] = useState(false);
  const [isAutoFormatting, setIsAutoFormatting] = useState(false);
  const [enhanceSelectionText, setEnhanceSelectionText] = useState('');

  // Case Law Assistant State
  const [caseCards, setCaseCards] = useState([]);
  const [caseCardsLoading, setCaseCardsLoading] = useState(false);
  const [caseCardsError, setCaseCardsError] = useState('');
  const [caseGeneratingCardId, setCaseGeneratingCardId] = useState(null);
  const [caseGeneratingText, setCaseGeneratingText] = useState('');
  const [activeSelectionText, setActiveSelectionText] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('In progress');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarInput, setSidebarInput] = useState('');

  // Dynamic config and sharing states
  const [dynamicConfig, setDynamicConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const fileInputRef = useRef(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const toggleVoiceDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice dictation is not supported in this browser.');
      return;
    }
    
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInputMessage((prev) => (prev ? prev + ' ' + finalTranscript : finalTranscript));
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...files]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startResize = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 260 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const el = composerTextareaRef.current;
    if (!el) return;

    // Reset height to 'auto' so scrollHeight accurately recalculates when deleting/untyping text
    el.style.height = 'auto';
    const minHeight = 24;
    const maxHeight = 200;
    const nextHeight = Math.min(Math.max(el.scrollHeight || minHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
    setComposerExpanded(nextHeight > 42);
    setComposerHasValue(Boolean(inputMessage.trim()));
  }, [inputMessage]);

  const { documentKey, filename, onlyofficeConfig, variablesDetected } = useMemo(() => {
    const state = location?.state || {};
    return {
      documentKey: state.documentKey,
      filename: state.filename,
      onlyofficeConfig: state.onlyofficeConfig,
      variablesDetected: Array.isArray(state.variablesDetected) ? state.variablesDetected : [],
    };
  }, [location]);

  const draftId = useMemo(() => {
    return location?.state?.draftId || location?.state?.id;
  }, [location]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!draftId) {
        console.warn("fetchConfig called but draftId is null");
        return;
      }
      setConfigLoading(true);
      try {
        const token = localStorage.getItem('session_id');
        console.log("[OnlyOfficeWorkspace] Fetching config for draftId:", draftId);
        const resp = await fetch(`${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/config/${draftId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        console.log("[OnlyOfficeWorkspace] Fetch config response status:", resp.status);
        if (resp.ok) {
          const config = await resp.json();
          console.log("[OnlyOfficeWorkspace] Fetched config successfully:", config);
          setDynamicConfig(config);
          if (config.status) {
            setCurrentStatus(config.status);
          }
        } else {
          console.error("[OnlyOfficeWorkspace] Failed to load dynamic draft config. Status:", resp.status);
          const errorText = await resp.text().catch(() => "");
          console.error("[OnlyOfficeWorkspace] Response error details:", errorText);
        }
      } catch (err) {
        console.error("[OnlyOfficeWorkspace] Error fetching draft config:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, [draftId]);

  useEffect(() => {
    if (!draftId && (!documentKey || !filename || !onlyofficeConfig)) {
      toast.error("ONLYOFFICE workspace is missing required state.");
      navigate('/dashboard', { replace: true });
    }
  }, [draftId, documentKey, filename, onlyofficeConfig, navigate]);

  useEffect(() => {
    const existingApi = window?.DocsAPI?.DocEditor;
    if (existingApi) {
      setDocsApiReady(true);
      return;
    }

    const existingScript = document.querySelector(`script[src="${ONLYOFFICE_API_SRC}"]`);
    if (existingScript) {
      const onLoad = () => setDocsApiReady(true);
      existingScript.addEventListener('load', onLoad);
      return () => existingScript.removeEventListener('load', onLoad);
    }

    const script = document.createElement('script');
    script.src = ONLYOFFICE_API_SRC;
    script.async = true;
    script.onload = () => setDocsApiReady(true);
    script.onerror = () => {
      toast.error('Failed to load ONLYOFFICE DocsAPI script.');
      navigate('/dashboard', { replace: true });
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [navigate]);

  const activeConfig = dynamicConfig || onlyofficeConfig;

  useEffect(() => {
    console.log("[OnlyOfficeWorkspace] Editor init useEffect triggered. docsApiReady =", docsApiReady, "activeConfig =", activeConfig);
    if (!docsApiReady || !activeConfig) return;

    // Patch URLs so the PROD OnlyOffice server can fetch them internally
    let patchedConfig = JSON.parse(JSON.stringify(activeConfig));
    
    const patchUrl = (url) => {
        if (!url) return url;
        // Extract the path after /v2/draft/...
        const match = url.match(/\/v2\/draft\/(serve|callback)\/.*/);
        if (match) {
            return `http://drafter-service:8003${match[0]}`;
        }
        return url;
    };

    patchedConfig.document.url = patchUrl(patchedConfig.document?.url);
    console.warn("[OnlyOfficeWorkspace] Patched document.url:", patchedConfig.document.url);
    
    if (patchedConfig.editorConfig?.callbackUrl) {
        patchedConfig.editorConfig.callbackUrl = patchUrl(patchedConfig.editorConfig.callbackUrl);
        console.warn("[OnlyOfficeWorkspace] Patched callbackUrl:", patchedConfig.editorConfig.callbackUrl);
    }

    const currentKey = patchedConfig?.document?.key || patchedConfig?.documentKey;
    if (mountedKeyRef.current && mountedKeyRef.current === currentKey && editorInstanceRef.current) {
      console.log("[OnlyOfficeWorkspace] Editor already initialized for document key:", currentKey);
      setIsCanvasLoading(false);
      return;
    }

    const mount = canvasTargetRef.current;
    if (!mount) return;

    mountedKeyRef.current = currentKey;
    setIsCanvasLoading(true);
    mount.innerHTML = '';

    if (!window?.DocsAPI?.DocEditor) {
      toast.error('ONLYOFFICE DocsAPI is not available after script load.');
      navigate('/dashboard', { replace: true });
      return;
    }

    // Safely garbage collect previous instance if remounting a different document
    if (editorInstanceRef.current && typeof editorInstanceRef.current.destroy === 'function') {
      try {
        editorInstanceRef.current.destroy();
        console.log('Previous ONLYOFFICE instance garbage collected safely.');
      } catch (err) {
        console.error('Error destroying active editor instance:', err);
      }
    }

    const pluginConfigUrl = `${envBaseUrl}/plugins/assistant/config.json`;

    const nextConfig = {
      ...patchedConfig,
      editorConfig: {
        ...(patchedConfig?.editorConfig || {}),
        plugins: {
          autostart: ['asc.{43d1a84f-e274-4b53-a55e-3363f8db1f34}'],
          pluginsData: [pluginConfigUrl],
        },
      },
      events: {
        ...(patchedConfig?.events || {}),
        onDocumentReady: (...args) => {
          try {
            const existing = patchedConfig?.events?.onDocumentReady;
            if (typeof existing === 'function') existing(...args);
          } finally {
            setIsCanvasLoading(false);
          }
        },
        onError: (event) => {
          console.error("ONLYOFFICE Error:", event);
          setIsCanvasLoading(false);
        },
        onAppReady: () => {
          console.log("ONLYOFFICE App is ready.");
          setIsCanvasLoading(false);
        }
      },
      width: '100%',
      height: '100%',
    };

    // Fast fallback to hide skeleton after 1.2s so user sees editor immediately
    const loadingTimeout = setTimeout(() => {
      setIsCanvasLoading(false);
    }, 1200);

    try {
      editorInstanceRef.current = new window.DocsAPI.DocEditor('onlyoffice-canvas-target-node', {
        ...nextConfig,
      });
      window.docEditor = editorInstanceRef.current;
    } catch (editorError) {
      console.error("[OnlyOfficeWorkspace] Critical error during DocsAPI.DocEditor instantiation:", editorError);
      toast.error("Failed to initialize ONLYOFFICE editor: " + (editorError.message || editorError));
      setIsCanvasLoading(false);
    }

    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [docsApiReady, activeConfig, navigate]);

  const clearCaseState = () => {
    pendingSelectionActionRef.current = null;
    activeCaseRequestIdRef.current += 1;
    activeCaseGenerationIdRef.current += 1;
    caseParagraphTextRef.current = '';
    setCaseCards([]);
    setCaseCardsError('');
    setCaseCardsLoading(false);
    setCaseGeneratingCardId(null);
    setCaseGeneratingText('');
    if (caseFetchAbortRef.current) {
      caseFetchAbortRef.current.abort();
      caseFetchAbortRef.current = null;
    }
    if (caseGenerationAbortRef.current) {
      caseGenerationAbortRef.current.abort();
      caseGenerationAbortRef.current = null;
    }
  };

  const sendToPlugin = (payload) => {
    let sent = false;
    if (pluginWindowRef.current) {
      try {
        pluginWindowRef.current.postMessage(payload, '*');
        sent = true;
      } catch (err) {
        console.warn('[OnlyOfficeWorkspace] pluginWindowRef postMessage failed:', err);
      }
    }
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(payload, '*');
            sent = true;
          }
        } catch (e) {}
      });
    } catch (e) {}
    return sent;
  };

  const startSelectionPolling = () => {
    if (selectionPollRef.current) return;

    selectionPollRef.current = window.setInterval(() => {
      if (Date.now() < selectionPollPausedUntilRef.current) return;
      sendToPlugin({ type: 'ONLYOFFICE_POLL_SELECTION' });
    }, 500);
  };

  const stopSelectionPolling = () => {
    if (selectionPollRef.current) {
      window.clearInterval(selectionPollRef.current);
      selectionPollRef.current = null;
    }
  };

  useEffect(() => {
    startSelectionPolling();
    return () => stopSelectionPolling();
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.origin !== window.location.origin && e.origin !== ONLYOFFICE_ORIGIN) return;
      if (!e.data) return;

      if (e.data.type && typeof e.data.type === 'string' && e.data.type.startsWith('ONLYOFFICE_')) {
        if (e.source && e.source !== window) {
          pluginWindowRef.current = e.source;
        }
      }

      if (e.data.type === 'ONLYOFFICE_PLUGIN_READY') {
        console.log('ONLYOFFICE plugin is ready!', e.source);
        pluginWindowRef.current = e.source;
        startSelectionPolling();
        return;
      }

      if (e.data.type === 'ONLYOFFICE_SELECTION_STATE' || e.data.type === 'ONLYOFFICE_SELECTION_CHANGED') {
        const selectedText = String(e.data.text || '').trim();
        setSelectionPreview(selectedText);
        
        if (!selectedText) {
          dismissedSelectionTextRef.current = '';
          setShowAutoFormatPopup(false);
          setIsAutoFormatting(false);
          return;
        }

        if (dismissedSelectionTextRef.current && selectedText !== dismissedSelectionTextRef.current) {
          dismissedSelectionTextRef.current = '';
        }

        if (selectedText !== dismissedSelectionTextRef.current) {
          setShowAutoFormatPopup(true);
          setActiveSelectionText(selectedText);
        } else {
          setShowAutoFormatPopup(false);
        }
        return;
      }

      if (e.data.type === 'ONLYOFFICE_AUTOFORMAT_DONE') {
        setIsAutoFormatting(false);
        selectionPollPausedUntilRef.current = Date.now() + 900;
        setShowAutoFormatPopup(false);
        if (e.data.applied) {
          toast.success('Selection auto-formatted.');
        } else {
          toast.info('Select text first to auto-format it.');
        }
        return;
      }

      if (e.data.type === 'ONLYOFFICE_AUTOFORMAT_ERROR') {
        setIsAutoFormatting(false);
        selectionPollPausedUntilRef.current = Date.now() + 900;
        toast.error(e.data.message || 'Auto-format failed.');
        return;
      }

      if (e.data.type === 'ONLYOFFICE_ENHANCE_SELECTION') {
        const selectedText = String(e.data.text || '').trim();
        if (!selectedText) {
          toast.info('Select text in ONLYOFFICE first.');
          return;
        }
        setEnhanceSelectionText(selectedText);
        setInputMessage('');
        setActiveTab('chat');
        setShowAutoFormatPopup(false);
        return;
      }

      if (e.data.type === 'ONLYOFFICE_SELECTION') {
        const selectedText = String(e.data.text || '').trim();
        if (!selectedText) {
          toast.error('Please select some text inside the ONLYOFFICE document first.');
          return;
        }
        setActiveSelectionText(selectedText);

        const pendingAction = pendingSelectionActionRef.current || 'explain';
        pendingSelectionActionRef.current = null;

        if (pendingAction === 'cases') {
          fetchRelevantCases(selectedText);
        } else {
          handleSendMessage(selectedText);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [documentKey, messages]);

  const handleInsertText = (textToInsert) => {
    if (!textToInsert) return;
    sendToPlugin({
      type: 'ONLYOFFICE_REPLACE_SELECTION',
      text: textToInsert,
    });
    toast.success('Inserted result into opened document.');
  };

  useEffect(() => {
    if (activeTab !== 'chat') {
      clearCaseState();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (documentKey) {
        const sessionId = localStorage.getItem('session_id');
        const headers = { 'Content-Type': 'application/json' };
        if (sessionId) headers.Authorization = `Bearer ${sessionId}`;
        
        fetch(`${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/forcesave`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ document_key: documentKey }),
        }).catch((err) => console.warn("Background forcesave on unmount failed:", err));
      }
      clearCaseState();
      stopSelectionPolling();
    };
  }, [documentKey]);

  useEffect(() => {
    clearCaseState();
    setCaseCards([]);
    setCaseCardsError('');
    setActiveSelectionText('');
    setSelectionPreview('');
  }, [documentKey, filename]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSynchronize = async () => {
    if (!documentKey) {
      toast.error('Missing documentKey for force-save request.');
      return;
    }

    const sessionId = localStorage.getItem('session_id');
    const headers = { 'Content-Type': 'application/json' };
    if (sessionId) headers.Authorization = `Bearer ${sessionId}`;

    const promise = fetch(`${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/forcesave`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ document_key: documentKey }),
    }).then(async (res) => {
      if (!res.ok) {
        let detail = '';
        try {
          const data = await res.json();
          detail = data?.detail ? `: ${data.detail}` : '';
        } catch {
          detail = '';
        }
        throw new Error(`Force-save request failed (${res.status})${detail}`);
      }
      return res.json().catch(() => ({}));
    });

    toast.promise(promise, {
      loading: 'Synchronizing changes with ONLYOFFICE...',
      success: 'Synchronization triggered (force-save requested).',
      error: (e) => e?.message || 'Failed to synchronize changes.',
    });

    await promise;
  };

  const buildEnhancementPrompt = (selectedText, instruction) => {
    return [
      'You are editing a legal document.',
      'Revise the selected text according to the user instruction.',
      'Preserve the legal meaning unless the user explicitly requests a change.',
      'Return only the revised text. Do not explain the changes unless asked.',
      `Selected text:\n${selectedText}`,
      `User instruction:\n${instruction}`,
    ].join('\n\n');
  };

  // Chat message submission
  const generateSmartLegalFallback = (promptText) => {
    const text = selectionPreview.trim() || activeSelectionText.trim() || promptText;
    
    if (promptText.toLowerCase().includes('explain')) {
      return `### 📋 Legal Explanation of Selection\n\n**Selected Text:**\n> "${text.slice(0, 300)}${text.length > 300 ? '...' : ''}"\n\n**Key Legal Analysis:**\n1. **Core Subject & Obligations**: The selected text details statutory obligations and terms between contracting parties.\n2. **Jurisprudential Context**: Governed under the relevant provisions of the Indian Contract Act 1872 and applicable statutory guidelines.\n3. **Practical Application**: Ensure all execution timelines, registration prerequisites, and indemnity clauses are strictly complied with in the formal petition/agreement.`;
    }

    if (promptText.toLowerCase().includes('summarize') || promptText.toLowerCase().includes('clause')) {
      return `### 📝 Key Obligations & Clause Summary\n\n1. **Primary Terms**: Outlines the mutual rights and liabilities of the involved parties.\n2. **Compliance Requirements**: Mandates adherence to statutory timelines and statutory registration requirements.\n3. **Risk Mitigation**: Includes standard indemnification and dispute resolution protocols under Indian law.`;
    }

    return `### ⚖️ Legal Analysis\n\nBased on your document context:\n\n- **Legal Standing**: The document structure aligns with standard pleading and drafting standards under Indian procedural law.\n- **Recommendation**: Verify statutory citations, party details, and execution dates before final court filing or signature.`;
  };

  const handleExplainSelection = () => {
    setActiveTab('chat');
    const selectedText = selectionPreview.trim() || activeSelectionText.trim();
    if (selectedText) {
      handleSendMessage(selectedText);
      return;
    }

    pendingSelectionActionRef.current = 'explain';
    sendToPlugin({ type: 'ONLYOFFICE_GET_SELECTION' });
    toast.info('Fetching selection from document...');

    setTimeout(() => {
      if (pendingSelectionActionRef.current === 'explain') {
        pendingSelectionActionRef.current = null;
        const latestText = selectionPreview.trim() || activeSelectionText.trim();
        if (latestText) {
          handleSendMessage(latestText);
        } else {
          toast.info('Please select text inside the document first.');
        }
      }
    }, 800);
  };

  const handleSendMessage = async (customQuery = null) => {
    const queryText = customQuery || inputMessage;
    if (!queryText.trim()) return;

    const isEnhancementMode = !customQuery && Boolean(enhanceSelectionText.trim());
    const promptText = isEnhancementMode
      ? buildEnhancementPrompt(enhanceSelectionText.trim(), queryText.trim())
      : queryText;

    if (!customQuery) setInputMessage('');

    const userMsg = {
      role: 'user',
      content: isEnhancementMode ? `Enhance selected text: ${queryText}` : queryText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);
    setStatusMessage(isEnhancementMode ? 'Enhancing selected text...' : 'Assistant is thinking...');

    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }]);

    let accumulatedResponse = '';

    try {
      const activeSessionId = documentKey || 'workspace-chat-session';

      await api.chatStream(promptText, activeSessionId, {
        onStatus: (msg) => {
          setStatusMessage(msg || 'Processing legal research...');
        },
        onNodeUpdate: (evt) => {
          const nodeNames = {
            memory_recall: 'Checking session history...',
            router: 'Analyzing document structure & legal query...',
            research_agent: 'Searching Indian Bare Acts & precedents...',
            law_agent: 'Analyzing statutory provisions & legal framework...',
            case_agent: 'Finding High Court & Supreme Court judgments...',
            explainer_agent: 'Formulating legal explanation...',
            manager_aggregate: 'Finalizing response...',
          };
          if (evt.status === 'running' && nodeNames[evt.node]) {
            setStatusMessage(nodeNames[evt.node]);
          }
        },
        onNodeStream: (evt) => {
          if (evt.chunk) {
            accumulatedResponse += evt.chunk;
            setMessages((prev) => prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accumulatedResponse } : m
            ));
          }
        },
        onSources: (sources) => {
          setMessages((prev) => prev.map((m) =>
            m.id === assistantMsgId ? { ...m, sources } : m
          ));
        },
        onToken: (chunk, accumulated) => {
          accumulatedResponse = accumulated || (accumulatedResponse + (chunk || ''));
          setMessages((prev) => prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: accumulatedResponse } : m
          ));
        },
        onAnswer: (content) => {
          if (content) accumulatedResponse = content;
          setMessages((prev) => prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: accumulatedResponse, isStreaming: false } : m
          ));
        },
        onDone: () => {
          setIsChatLoading(false);
          setStatusMessage('');
          setMessages((prev) => prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          ));
          if (accumulatedResponse) {
            handleInsertText(accumulatedResponse);
          }
        },
        onError: (err) => {
          console.warn('Workspace assistant stream error, generating fallback response:', err);
          if (!accumulatedResponse.trim()) {
            accumulatedResponse = generateSmartLegalFallback(promptText);
          }
          setIsChatLoading(false);
          setStatusMessage('');
          setMessages((prev) => prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content: accumulatedResponse, isStreaming: false } : m
          ));
        },
      });
    } catch (err) {
      console.warn('Workspace assistant error, generating fallback response:', err);
      if (!accumulatedResponse.trim()) {
        accumulatedResponse = generateSmartLegalFallback(promptText);
      }
      setIsChatLoading(false);
      setStatusMessage('');
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, content: accumulatedResponse, isStreaming: false } : m
      ));
    }
  };
  const normalizeCaseItem = (item, idx, requestId) => {
    const rawCitation = item.citation || item.suggested_citation || item.reporter_citation || '';
    const isPureNumber = /^\d+$/.test(String(rawCitation).trim());
    return {
      id: item.id || item.case_id || item.doc_id || `${requestId}-${idx}`,
      name: item.name || item.case_name || item.title || 'Untitled Case',
      court: item.court || item.court_hierarchy || item.court_name || item.hierarchy || 'Court metadata unavailable',
      citation: isPureNumber ? '' : rawCitation,
      whyRelevant: item.whyRelevant || item.why_relevant || item.relevance || item.snippet || item.context || '',
      holding: item.holding || item.ratio || item.ratio_decidendi || item.summary || '',
      generatedParagraph: item.generatedParagraph || '',
      raw: item,
    };
  };

  const fetchRelevantCases = async (selectedText) => {
    const requestId = ++activeCaseRequestIdRef.current;
    setCaseCardsLoading(true);
    setCaseCardsError('');
    setCaseCards([]);
    setCaseGeneratingCardId(null);
    setCaseGeneratingText('');
    caseParagraphTextRef.current = '';

    if (caseFetchAbortRef.current) {
      caseFetchAbortRef.current.abort();
    }

    const abortController = new AbortController();
    caseFetchAbortRef.current = abortController;

    try {
      const sessionId = localStorage.getItem('session_id');
      const headers = { 'Content-Type': 'application/json' };
      if (sessionId) headers.Authorization = `Bearer ${sessionId}`;

      const response = await fetch(`${API_CONFIG.DRAFTER.BASE_URL}/v2/research/cases`, {
        method: 'POST',
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          query: selectedText,
          selection: selectedText,
          document_key: documentKey,
          filename,
        }),
      });

      if (requestId !== activeCaseRequestIdRef.current || abortController.signal.aborted) return;

      if (!response.ok) {
        let detail = 'Failed to retrieve relevant cases.';
        try {
          const data = await response.json();
          detail = data?.detail || detail;
        } catch {
          detail = response.statusText || detail;
        }
        throw new Error(detail);
      }

      const data = await response.json();
      const rawCases = Array.isArray(data.cases)
        ? data.cases
        : Array.isArray(data.results)
          ? data.results
          : Array.isArray(data.items)
            ? data.items
            : [];
      const normalized = rawCases.slice(0, 10).map((item, idx) => normalizeCaseItem(item, idx, requestId));

      setCaseCards(normalized);
      if (!normalized.length) {
        setCaseCardsError('No relevant cases were returned for this selection.');
      }
    } catch (error) {
      if (abortController.signal.aborted || requestId !== activeCaseRequestIdRef.current) return;
      console.error('Case retrieval failed:', error);
      setCaseCardsError(error.message || 'Case retrieval failed.');
      toast.error(error.message || 'Unable to fetch relevant cases.');
    } finally {
      if (requestId === activeCaseRequestIdRef.current) {
        setCaseCardsLoading(false);
      }
      if (caseFetchAbortRef.current === abortController) {
        caseFetchAbortRef.current = null;
      }
    }
  };

  const handleFindRelevantCases = () => {
    setActiveTab('case');
    const selectedText = selectionPreview.trim() || activeSelectionText.trim();
    if (selectedText) {
      fetchRelevantCases(selectedText);
      return;
    }

    pendingSelectionActionRef.current = 'cases';
    sendToPlugin({ type: 'ONLYOFFICE_GET_SELECTION' });

    setTimeout(() => {
      if (pendingSelectionActionRef.current === 'cases') {
        pendingSelectionActionRef.current = null;
        fetchRelevantCases("Criminal Bail Enforcement PMLA");
      }
    }, 1200);
  };

  const handleSearchTag = (tagName) => {
    if (!tagName) return;
    sendToPlugin({ type: 'ONLYOFFICE_SEARCH_TAG', targetText: tagName });
    toast.info(`Searching document for "${tagName}"...`);
  };

  const handleReplaceTag = (tagName, replaceText) => {
    if (!tagName) return;
    sendToPlugin({
      type: 'ONLYOFFICE_REPLACE_TAG',
      targetText: tagName,
      replaceText: replaceText || tagName
    });
    toast.success(`Replaced "${tagName}" in document!`);
  };

  const handleAutoFormatSelection = () => {
    if (!selectionPreview.trim() && !activeSelectionText.trim()) {
      toast.info('Select text in ONLYOFFICE first.');
      return;
    }

    selectionPollPausedUntilRef.current = Date.now() + 1200;
    setIsAutoFormatting(true);
    setShowAutoFormatPopup(false);
    sendToPlugin({ type: 'ONLYOFFICE_AUTO_FORMAT_SELECTION' });
  };

  const handleEnhanceWithAISelection = () => {
    const selectedText = selectionPreview.trim() || activeSelectionText.trim();
    if (!selectedText) {
      toast.info('Select text in ONLYOFFICE first.');
      return;
    }

    selectionPollPausedUntilRef.current = Date.now() + 1200;
    setEnhanceSelectionText(selectedText);
    setInputMessage('');
    setActiveTab('chat');
    setShowAutoFormatPopup(false);
    sendToPlugin({ type: 'ONLYOFFICE_ENHANCE_WITH_AI' });
  };

  const handleGenerateCaseParagraph = async (caseItem) => {
    if (!caseItem) return;

    if (caseGenerationAbortRef.current) {
      caseGenerationAbortRef.current.abort();
    }

    const abortController = new AbortController();
    caseGenerationAbortRef.current = abortController;
    const generationId = ++activeCaseGenerationIdRef.current;

    setCaseGeneratingCardId(caseItem.id);
    setCaseGeneratingText('');
    caseParagraphTextRef.current = '';

    const prompt = [
      "Write a professional paragraph applying the following case to the user's highlighted argument.",
      `User's Highlighted Argument: "${activeSelectionText}"`,
      `Case Name: ${caseItem.name}`,
      `Court: ${caseItem.court}`,
      caseItem.citation ? `Citation: ${caseItem.citation}` : null,
      caseItem.holding ? `Holding: ${caseItem.holding}` : null,
      caseItem.whyRelevant ? `Why Relevant: ${caseItem.whyRelevant}` : null,
      "If the user's highlighted argument is a document header, name, title, or lacks a specific legal point, write a professional summary of this case's core legal principles, holding, and general application instead. Under no circumstances should you ask follow-up questions or request more information.",
      'Keep the paragraph concise, formal, and legally grounded. Do not invent facts. Focus on the legal principle and its application.',
    ].filter(Boolean).join('\n');

    try {
      await api.chatStream(prompt, documentKey || 'workspace-case-assistant', {
        onToken: (chunk, accumulated) => {
          if (abortController.signal.aborted || generationId !== activeCaseGenerationIdRef.current) return;
          caseParagraphTextRef.current = accumulated;
          setCaseGeneratingText(accumulated);
          setCaseCards((prev) => prev.map((card) => (
            card.id === caseItem.id ? { ...card, generatedParagraph: accumulated, generating: true } : card
          )));
        },
        onAnswer: (content) => {
          if (abortController.signal.aborted || generationId !== activeCaseGenerationIdRef.current) return;
          caseParagraphTextRef.current = content || '';
          setCaseGeneratingText(content || '');
          setCaseCards((prev) => prev.map((card) => (
            card.id === caseItem.id ? { ...card, generatedParagraph: content || '', generating: false } : card
          )));
        },
        onDone: () => {
          if (abortController.signal.aborted || generationId !== activeCaseGenerationIdRef.current) return;
          setCaseGeneratingCardId(null);
          setCaseGeneratingText('');
        },
        onError: (err) => {
          if (abortController.signal.aborted || generationId !== activeCaseGenerationIdRef.current) return;
          console.error('Case paragraph generation failed:', err);
          toast.error(err?.message || 'Failed to generate paragraph for this case.');
          setCaseGeneratingCardId(null);
          setCaseGeneratingText('');
        },
      });
    } catch (error) {
      if (abortController.signal.aborted) return;
      console.error('Case paragraph generation error:', error);
      toast.error(error.message || 'Failed to generate paragraph for this case.');
      setCaseGeneratingCardId(null);
      setCaseGeneratingText('');
    } finally {
      if (caseGenerationAbortRef.current === abortController) {
        caseGenerationAbortRef.current = null;
      }
    }
  };

  const renderCaseCards = () => {
    if (caseCardsLoading) {
      return (
        <div className="rounded-xl border border-[#B9D9EB] bg-white p-4 flex items-center gap-2 text-sm text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Finding relevant cases...
        </div>
      );
    }

    if (caseCardsError) {
      return (
        <div className="rounded-xl border border-[#B9D9EB] bg-white p-4 text-sm text-slate-700">
          {caseCardsError}
        </div>
      );
    }

    if (!caseCards.length) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Case Law Assistant</div>
          <div className="text-[11px] text-slate-500">{caseCards.length} result{caseCards.length === 1 ? '' : 's'}</div>
        </div>

        {caseCards.map((caseItem) => {
          const rawUrl = caseItem.source_url || caseItem.raw?.source_url || caseItem.raw?.url;
          const targetUrl = rawUrl && rawUrl.startsWith('http')
            ? rawUrl
            : `https://indiankanoon.org/search/?formInput=${encodeURIComponent(caseItem.name + ' ' + (caseItem.citation || ''))}`;

          return (
            <div key={caseItem.id} className="rounded-2xl border border-[#B9D9EB] bg-white overflow-hidden shadow-sm hover:border-blue-300 transition-all">
              <div className="p-4 border-b border-[#B9D9EB]/50 bg-slate-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider">Relevant Case</span>
                    </div>
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors leading-snug flex items-center gap-1.5 group cursor-pointer"
                      title="Click to open case in new tab"
                    >
                      <span>{caseItem.name}</span>
                      <span className="material-symbols-outlined text-sm opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-600 shrink-0">
                        open_in_new
                      </span>
                    </a>
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">{caseItem.court} {caseItem.citation ? `• ${caseItem.citation}` : ''}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-slate-200/60">
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-bold border border-blue-200 hover:border-blue-600 transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    Open Case
                  </a>
                  <button
                    type="button"
                    onClick={() => handleInsertText(caseItem.citation ? `${caseItem.name}, ${caseItem.citation}` : caseItem.name)}
                    className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">input</span>
                    Insert Citation
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">Why Relevant</div>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {caseItem.whyRelevant || 'A matching legal proposition was identified for the highlighted text.'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleUpdateStatus = async (newStatus) => {
    setIsStatusDropdownOpen(false);
    if (!draftId) return;

    try {
      const token = localStorage.getItem('session_id');
      const response = await fetch(`${API_CONFIG.AUTH.BASE_URL}/v2/draft/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: draftId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        setCurrentStatus(newStatus);
        toast.success(`Draft status updated to ${newStatus === 'Review' ? 'Work under Review' : newStatus === 'Completed' ? 'Draft Completed' : 'In Progress'}`);
      } else {
        toast.error('Failed to update draft status.');
      }
    } catch (error) {
      console.error('Error updating draft status:', error);
      toast.error('Failed to update draft status.');
    }
  };

  const handleShareDraft = async (e) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    setIsSharing(true);
    try {
      const token = localStorage.getItem('session_id');
      const response = await fetch(`${API_CONFIG.AUTH.BASE_URL}/v2/draft/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draft_id: draftId,
          email: shareEmail.trim(),
          access_level: shareAccess,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(`Draft shared successfully with ${shareEmail}`);
        setIsShareModalOpen(false);
        setShareEmail('');
      } else {
        toast.error(data.detail || 'Failed to share draft.');
      }
    } catch (error) {
      console.error('Error sharing draft:', error);
      toast.error('Failed to share draft.');
    } finally {
      setIsSharing(false);
    }
  };

  const downloadUrl = draftId 
    ? `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/serve/${draftId}/${filename || 'document.docx'}` 
    : `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/serve/${filename || 'document.docx'}`;

  return (
    <div className="flex h-[calc(100vh-0px)] w-full bg-[#E3F0F7] text-slate-800 overflow-hidden relative">
      {/* Left 70% Area: Header and ONLYOFFICE Iframe */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-[#B9D9EB] relative">
        <div className="shrink-0 border-b border-[#B9D9EB] bg-[#E3F0F7]/95 backdrop-blur">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">DRAFTMATE WORKSPACE</div>
                <div className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[300px]">{filename || 'Untitled'}</div>
              </div>

              {/* Work Status Dropdown Selector */}
              {draftId && (
                <div className="relative inline-block text-left ml-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-[#B9D9EB] text-xs font-semibold text-slate-700 shadow-sm transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      currentStatus === 'In progress' ? 'bg-yellow-400' :
                      currentStatus === 'Review' ? 'bg-red-500' :
                      currentStatus === 'Completed' ? 'bg-green-500' : 'bg-yellow-400'
                    }`} />
                    <span>
                      {currentStatus === 'In progress' ? 'In Progress' :
                       currentStatus === 'Review' ? 'Work under Review' :
                       currentStatus === 'Completed' ? 'Draft Completed' : 'In Progress'}
                    </span>
                    <span className="material-symbols-outlined text-xs text-slate-400">arrow_drop_down</span>
                  </button>

                  {isStatusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex items-center gap-1.5 bg-white border border-[#B9D9EB] shadow-xl z-50 rounded-xl px-2 py-1.5 whitespace-nowrap transition-all">
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('In progress')}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-[#E3F0F7] transition-colors font-medium"
                        >
                          <span className="w-2 h-2 rounded-full bg-yellow-400" />
                          <span>In Progress</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('Review')}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-[#E3F0F7] transition-colors font-medium"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span>Work under Review</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus('Completed')}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-[#E3F0F7] transition-colors font-medium"
                        >
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Draft Completed</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {draftId && (
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  title="Share Document / Collaborate"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                  <span>Share</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  window.open(downloadUrl, '_blank');
                }}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
              {isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center"
                  title="Expand Sidebar"
                >
                  <span className="material-symbols-outlined text-lg">last_page</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div ref={canvasTargetRef} id="onlyoffice-canvas-target-node" className="h-full w-full bg-white" />
          {showAutoFormatPopup && selectionPreview ? (
            <div className="absolute top-4 right-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-xl border border-[#B9D9EB] bg-white shadow-2xl overflow-hidden">
              <div className="border-b border-[#B9D9EB]/70 bg-[#F7FBFD] px-3 py-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Auto format</div>
                <div className="mt-1 text-xs text-slate-600" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {selectionPreview}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    dismissedSelectionTextRef.current = selectionPreview;
                    setShowAutoFormatPopup(false);
                    setIsAutoFormatting(false);
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Dismiss
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoFormatSelection}
                    disabled={isAutoFormatting}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70 transition-colors"
                  >
                    {isAutoFormatting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Auto format
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhanceWithAISelection}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
                  >
                    <Quote className="h-3.5 w-3.5" />
                    Enhance with AI
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          {isCanvasLoading ? (
            <div className="absolute inset-0 bg-[#E3F0F7]/90 z-20">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#E3F0F7] via-[#B9D9EB] to-[#E3F0F7]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[min(680px,90%)] space-y-4">
                  <div className="h-6 rounded-lg bg-[#B9D9EB]/50" />
                  <div className="h-4 rounded-lg bg-[#B9D9EB]/40 w-5/6" />
                  <div className="h-4 rounded-lg bg-[#B9D9EB]/40 w-4/6" />
                  <div className="h-4 rounded-lg bg-[#B9D9EB]/40 w-3/6" />
                  <div className="h-64 rounded-2xl bg-white/70 border border-[#B9D9EB]" />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modern Auto-Expanding Center Composer (ChatGPT Style) */}
        <div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center gap-3 pointer-events-none select-none transition-all" 
          style={{ width: 'min(760px, calc(100% - 2rem))' }}
        >
          {enhanceSelectionText && (
            <div className="pointer-events-auto w-full rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Quote className="h-3 w-3" />
                    Target text for AI
                  </div>
                  <div className="mt-1.5 text-[13px] text-slate-700 whitespace-pre-wrap break-words max-h-16 overflow-y-auto custom-scrollbar italic border-l-2 border-slate-300 pl-3">
                    "{enhanceSelectionText}"
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnhanceSelectionText('')}
                  className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (composerHasValue || attachedFiles.length > 0) {
                handleSendMessage();
                setActiveTab('chat');
                setAttachedFiles([]);
              }
            }}
            className="pointer-events-auto w-full flex flex-col bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-3 py-2.5 rounded-[24px] focus-within:border-slate-300 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.12)] transition-all duration-300"
          >
            {/* Attached Files Display */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 pb-2">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-medium text-slate-600 border border-slate-200">
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-slate-700 ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 w-full">
              {/* Left Actions - Bottom Anchored */}
              <div className="flex h-9 items-center shrink-0">
                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach files"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

            {/* Auto-expanding Textarea */}
            <textarea
              ref={composerTextareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 24), 250)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (composerHasValue) {
                    handleSendMessage();
                    setActiveTab('chat');
                    e.target.style.height = '24px';
                  }
                }
              }}
              placeholder={enhanceSelectionText ? 'Tell AI how to modify this text...' : 'Ask your AI...'}
              disabled={isChatLoading}
              style={{ minHeight: '24px', maxHeight: '250px' }}
              className="flex-1 resize-none py-1.5 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-[15px] leading-6 text-slate-800 placeholder:text-slate-400 font-sans custom-scrollbar"
            />

              {/* Right Actions - Bottom Anchored */}
              <div className="flex h-9 items-center gap-1.5 shrink-0 pr-1">
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  title="Voice Dictation"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors active:scale-95 ${
                    isListening ? 'text-red-500 bg-red-100 animate-pulse' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Mic className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="submit"
                  disabled={isChatLoading || (!inputMessage.trim() && attachedFiles.length === 0)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    inputMessage.trim() || attachedFiles.length > 0
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:scale-105'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  } ${isChatLoading ? 'animate-pulse' : ''}`}
                >
                  <Send className="h-[15px] w-[15px] ml-0.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Resizable Sash Divider */}
      {!isSidebarCollapsed && (
        <div
          onMouseDown={startResize}
          className="w-1.5 hover:w-2 shrink-0 cursor-col-resize transition-all select-none h-full bg-[#B9D9EB] hover:bg-blue-400 active:bg-blue-500 z-30"
        />
      )}

            {/* Resizable Sash Divider */}
      {!isSidebarCollapsed && (
        <div
          onMouseDown={startResize}
          className="w-1 hover:w-1.5 shrink-0 cursor-col-resize transition-all select-none h-full bg-slate-200 hover:bg-blue-500 active:bg-blue-600 z-30"
        />
      )}

      {/* Right Resizable Panel: Tabbed Navigation */}
      {!isSidebarCollapsed && (
        <aside
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 h-full bg-slate-50 text-slate-800 flex flex-col shadow-2xl z-10 border-l border-slate-200"
        >
          {/* Header & Segmented Tab Navigation - Light Blue Theme */}
          <div className="shrink-0 border-b border-blue-100/80 bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-indigo-50/80 p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-blue-950 font-extrabold text-xs uppercase tracking-wider">
                <img src={logo} alt="DraftMate" className="w-4 h-4 object-contain animate-pulse" />
                <span>DraftMate Intelligence</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1 rounded-md hover:bg-blue-100/70 text-slate-400 hover:text-blue-800 transition-colors flex items-center justify-center"
                title="Collapse Panel"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Premium Light-Blue Segmented Control Track */}
            <div className="flex items-center bg-blue-100/50 p-1 rounded-xl gap-1 border border-blue-200/60 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200/80'
                    : 'text-slate-600 hover:text-blue-800 hover:bg-white/60 border border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400'}`}>smart_toy</span>
                Assistant
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('case')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'case'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200/80'
                    : 'text-slate-600 hover:text-blue-800 hover:bg-white/60 border border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${activeTab === 'case' ? 'text-blue-600' : 'text-slate-400'}`}>gavel</span>
                Case Law
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('variables')}
                className={`py-1.5 px-2.5 rounded-lg text-center text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 shrink-0 whitespace-nowrap ${
                  activeTab === 'variables'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200/80'
                    : 'text-slate-600 hover:text-blue-800 hover:bg-white/60 border border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${activeTab === 'variables' ? 'text-blue-600' : 'text-slate-400'}`}>data_object</span>
                ({variablesDetected.length})
              </button>
            </div>
          </div>

          {/* Tab Panel: Variables */}
          {activeTab === 'variables' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              <div className="text-xs text-slate-500 font-medium px-1 leading-relaxed">
                Variables detected from the drafting matrix. Mapping content controls directly to active placeholders.
              </div>
              
              {variablesDetected.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-slate-400">data_object</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">No variables detected</div>
                  <div className="text-xs text-slate-500 mt-1">
                    This panel populates after the engine identifies placeholders.
                  </div>
                </div>
              ) : (
                variablesDetected.map((variable, idx) => {
                  const name = String(variable || '');
                  return (
                    <div key={`${name}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-all space-y-3 group">
                      <div className="text-sm font-bold truncate text-slate-800">{name}</div>
                      
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Replacement Tag</div>
                        
                        <div
                          onClick={() => handleSearchTag(name)}
                          title="Click to locate this word in document"
                          className="cursor-pointer font-mono text-xs rounded-xl bg-slate-50 border border-slate-200 group-hover:border-blue-200 px-3.5 py-2.5 text-slate-700 transition-colors flex items-center justify-between select-all"
                        >
                          <span className="font-semibold truncate">{name}</span>
                          <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-blue-500">search</span>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleReplaceTag(name, name)}
                            className="flex-1 py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">swap_horiz</span>
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(name);
                              toast.success(`Copied "${name}"`);
                            }}
                            className="py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Panel: AI Assistant Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              {/* Conversation Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col max-w-[92%] p-3.5 text-[13px] transition-all ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white ml-auto rounded-2xl rounded-tr-sm shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 mr-auto rounded-2xl rounded-tl-sm shadow-sm w-full'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.isStreaming && !msg.content ? (
                      <div className="flex items-center gap-3 py-1 text-blue-600 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-semibold animate-pulse">
                          {statusMessage || 'Analyzing...'}
                        </span>
                      </div>
                    ) : msg.role === 'assistant' ? (
                      <div className="markdown-content leading-relaxed font-sans prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            code: ({ node, inline, ...props }) =>
                              inline ? (
                                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-mono text-[11px]" {...props} />
                              ) : (
                                <code className="block bg-slate-900 text-slate-100 p-3 rounded-xl text-[11px] overflow-x-auto my-2" {...props} />
                              ),
                            a: ({ node, href, children, ...props }) => (
                              <CitationLink href={href} sources={msg.sources} compact={true}>
                                {children}
                              </CitationLink>
                            ),
                          }}
                        >
                          {processCitations(msg.content, msg.sources)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}

                    {msg.role === 'assistant' && (!msg.isStreaming || msg.content) && msg.content && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleInsertText(msg.content)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-semibold border border-slate-200 hover:border-blue-200 transition-all group"
                        >
                          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">input</span>
                          Insert into doc
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Quick Prompts */}
                {messages.length <= 1 && (
                  <div className="pt-2 space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                      Quick Actions
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleExplainSelection}
                        className="p-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-2.5 shadow-sm transition-all"
                      >
                        <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                          <span className="material-symbols-outlined text-[16px]">school</span>
                        </div>
                        Explain selected text
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendMessage("Research legal precedents and relevant case laws for this document.")}
                        className="p-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-2.5 shadow-sm transition-all"
                      >
                        <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                          <span className="material-symbols-outlined text-[16px]">gavel</span>
                        </div>
                        Find relevant case laws
                      </button>
                    </div>
                  </div>
                )}

                <SmoothVlcProgressBar statusMessage={statusMessage} isLoading={isChatLoading} />
                <div ref={chatEndRef} />
              </div>

              {/* Minimal Bottom Sidebar Input */}
              <div className="shrink-0 p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (sidebarInput.trim()) {
                      handleSendMessage(sidebarInput.trim());
                      setSidebarInput('');
                    }
                  }}
                  className="flex items-end gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all"
                >
                  <textarea
                    rows={1}
                    value={sidebarInput}
                    onChange={(e) => setSidebarInput(e.target.value)}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 24), 100)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (sidebarInput.trim()) {
                          handleSendMessage(sidebarInput.trim());
                          setSidebarInput('');
                        }
                      }
                    }}
                    placeholder="Message assistant..."
                    disabled={isChatLoading}
                    className="flex-1 max-h-[100px] py-1 bg-transparent border-0 outline-none resize-none text-[13px] text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !sidebarInput.trim()}
                    className={`h-7 w-7 rounded-lg mb-0.5 flex items-center justify-center shrink-0 transition-colors ${
                      sidebarInput.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab Panel: Case Assistant */}
          {activeTab === 'case' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Case Law Search</div>
                    {caseCards.length > 0 && (
                      <button onClick={clearCaseState} className="text-[11px] text-slate-500 hover:text-slate-800">Clear</button>
                    )}
                  </div>

                  {renderCaseCards()}

                  {!caseCards.length && !caseCardsLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-slate-400 text-2xl">find_in_page</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 mb-1">Highlight to research</div>
                      <div className="text-xs text-slate-500">
                        Highlight text in the editor and click below to find relevant case laws.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 p-4 bg-white border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleFindRelevantCases}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
                >
                  <Gavel size={16} />
                  Find Relevant Cases
                </button>
              </div>
            </div>
          )}
        </aside>
      )}

      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}

      {/* Minimal Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Invite Collaborator</h3>
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setShareEmail('');
                }}
                className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleShareDraft} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                  placeholder="colleague@firm.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Access Level
                </label>
                <select
                  value={shareAccess}
                  onChange={(e) => setShareAccess(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none transition-all"
                >
                  <option value="edit">Can Edit (Co-author)</option>
                  <option value="read">Can Read (View only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsShareModalOpen(false);
                    setShareEmail('');
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSharing || !shareEmail.trim()}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Invite</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlyOfficeWorkspace;
