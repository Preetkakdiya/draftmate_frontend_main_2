import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronsUp, ChevronsDown } from 'lucide-react';

export default function PagesPanel({
  numPages,
  currentPage,
  onPageSelect,
  fieldsPerPage = {},
}) {
  const listRef = useRef(null);
  const [jumpValue, setJumpValue] = useState('');

  // Keep active page visible in the left list
  useEffect(() => {
    if (!listRef.current || !currentPage) return;
    const el = listRef.current.querySelector(`[data-page="${currentPage}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentPage]);

  const pages = useMemo(() => {
    if (!numPages) return [];
    return Array.from({ length: numPages }, (_, i) => i + 1);
  }, [numPages]);

  const handleJump = (e) => {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (!numPages || Number.isNaN(n)) return;
    const clamped = Math.min(Math.max(1, n), numPages);
    onPageSelect(clamped);
    setJumpValue('');
  };

  return (
    <div className="w-[140px] shrink-0 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-220px)]">
      <div className="p-3 border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Pages
          </span>
          {numPages ? (
            <span className="ml-auto px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-black">
              {numPages}
            </span>
          ) : null}
        </div>

        {/* Jump to page — critical for 50–200 page PDFs */}
        {numPages > 8 && (
          <form onSubmit={handleJump} className="flex gap-1">
            <input
              type="number"
              min={1}
              max={numPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={`1–${numPages}`}
              className="w-full px-2 py-1 text-[10px] font-bold border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-2 py-1 text-[10px] font-black bg-blue-600 text-white rounded-lg"
            >
              Go
            </button>
          </form>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {!numPages && (
          <div className="space-y-2 p-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {pages.map((pageNum) => {
          const isActive = pageNum === currentPage;
          const fieldCount = fieldsPerPage[pageNum] || 0;

          return (
            <motion.button
              key={pageNum}
              type="button"
              data-page={pageNum}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPageSelect(pageNum)}
              className={`relative w-full p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                isActive
                  ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <FileText className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className={`text-[11px] font-black ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                Page {pageNum}
              </span>
              {fieldCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">
                  {fieldCount}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {numPages > 1 && (
        <div className="p-2 border-t border-slate-100 flex gap-1">
          <button
            type="button"
            onClick={() => onPageSelect(1)}
            className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1"
            title="First page"
          >
            <ChevronsUp className="w-3 h-3" /> 1
          </button>
          <button
            type="button"
            onClick={() => onPageSelect(numPages)}
            className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1"
            title="Last page"
          >
            {numPages} <ChevronsDown className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}