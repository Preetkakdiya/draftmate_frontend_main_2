import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_CONFIG } from '../services/endpoints';

/**
 * SharedDocumentViewer — Public page, no auth required.
 * Route: /shared/:docId
 * Fetches the document as a PDF from the backend public endpoint
 * and displays it in an embedded PDF viewer.
 */
export default function SharedDocumentViewer() {
  const { docId } = useParams();
  const [searchParams] = useSearchParams();
  const docName = searchParams.get('name') || 'Legal Document';

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendPdfUrl = `${API_CONFIG.DRAFTER.BASE_URL}/v2/draft/public_pdf/${encodeURIComponent(docId)}`;

  useEffect(() => {
    if (!docId) { setError('Invalid document link.'); setLoading(false); return; }
    // Verify the link is reachable with a HEAD request first
    fetch(backendPdfUrl, { method: 'HEAD' })
      .then(res => {
        if (!res.ok) throw new Error(`Document not found (${res.status})`);
        setPdfUrl(backendPdfUrl);
      })
      .catch(err => setError('This document link is expired or invalid.'))
      .finally(() => setLoading(false));
  }, [docId]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = backendPdfUrl;
    a.download = docName.replace(/\.(docx?|pdf)$/i, '') + '.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      {/* ── Top Bar ── */}
      <header style={{
        height: 64,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img src="/logo.png" alt="DraftMate" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>DraftMate</span>
          <span style={{
            marginLeft: 6, background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            border: '1px solid rgba(59,130,246,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            Shared Document
          </span>
        </div>

        {/* Doc name + Download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            color: '#94a3b8', fontSize: 13, fontWeight: 500,
            maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {docName}
          </span>
          {pdfUrl && (
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </button>
          )}
          <a
            href="/login"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
              padding: '8px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            Sign In to DraftMate →
          </a>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: 16 }}>

        {/* Status / document badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12, padding: '8px 14px'
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: pdfUrl ? '#10b981' : error ? '#ef4444' : '#f59e0b',
              boxShadow: pdfUrl ? '0 0 8px #10b981' : '' }} />
            <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
              {loading ? 'Loading document…' : error ? 'Document unavailable' : 'Live document — view only'}
            </span>
          </div>
          <span style={{ color: '#475569', fontSize: 12 }}>
            Powered by <span style={{ color: '#60a5fa', fontWeight: 700 }}>DraftMate AI</span>
          </span>
        </div>

        {/* PDF Viewer */}
        <div style={{
          flex: 1, borderRadius: 20, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          minHeight: 'calc(100vh - 200px)',
          background: '#1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {loading && (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{
                width: 48, height: 48, border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#3b82f6', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Loading document…</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: 48, maxWidth: 420 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, marginBottom: 10 }}>
                Document Not Found
              </h2>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                {error} The owner may have deleted this document or the link may have expired.
              </p>
              <a href="/" style={{
                display: 'inline-block', background: '#2563eb', color: '#fff',
                padding: '10px 24px', borderRadius: 10, fontWeight: 700,
                fontSize: 14, textDecoration: 'none'
              }}>
                Go to DraftMate
              </a>
            </div>
          )}

          {pdfUrl && (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={docName}
              style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 200px)', border: 'none' }}
              allow="fullscreen"
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#334155', fontSize: 12, fontWeight: 500 }}>
          This document was shared via{' '}
          <a href="https://app.draftmate.in" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>
            DraftMate Legal Platform
          </a>
          {' '}— AI-powered legal drafting for Indian lawyers.
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
