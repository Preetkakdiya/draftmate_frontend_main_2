import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Send, ZoomIn, ZoomOut, Maximize2, FileText,
  Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function EditorToolbar({
  documentName,
  documentStatus = 'draft',
  scale,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  currentPage,
  numPages,
  onPrevPage,
  onNextPage,
  onSaveDraft,
  onSend,
  savingDraft = false,
  sendingEnvelope = false,
  canSend = false,
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      {/* Left: Back + doc name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={() => navigate('/dashboard/esignature')}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-black text-[#0F1C2E] truncate max-w-[240px]" title={documentName}>
              {documentName}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {documentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Page nav + zoom */}
      <div className="flex items-center gap-2">
        {numPages && (
          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
            <button
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="p-1.5 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-black text-[#0F1C2E] px-2 min-w-[50px] text-center">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={currentPage === numPages}
              className="p-1.5 text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
          <button
            onClick={onZoomOut}
            className="p-1.5 text-slate-500 hover:text-blue-600 rounded transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-black text-[#0F1C2E] px-1 min-w-[38px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 text-slate-500 hover:text-blue-600 rounded transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitWidth}
            className="p-1.5 text-slate-500 hover:text-blue-600 rounded transition-colors border-l border-slate-200 ml-1 pl-2"
            title="Fit to width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Save + Send */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSaveDraft}
          disabled={savingDraft}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 text-xs transition-colors disabled:opacity-50"
        >
          {savingDraft ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save Draft
        </button>

        <button
          onClick={onSend}
          disabled={sendingEnvelope || !canSend}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-lg text-xs shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-none"
          title={!canSend ? 'Add at least one recipient and one field' : ''}
        >
          {sendingEnvelope ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Send for signature
        </button>
      </div>
    </div>
  );
}