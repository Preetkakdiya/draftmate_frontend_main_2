import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PenTool, Hash, Calendar, User, Type, Trash2 } from 'lucide-react';

const FIELD_ICONS = { signature: PenTool, initials: Hash, date: Calendar, name: User, text: Type };
const FIELD_LABELS = { signature: 'Signature', initials: 'Initials', date: 'Date', name: 'Full Name', text: 'Text Box' };

function toFrac(field, pageWidth, pageHeight) {
  // 10000-basis (normal) OR legacy raw pixels
  const legacy = field.width <= 1000 && field.width > 2;
  const x = legacy ? field.x_position / pageWidth : field.x_position / 10000;
  const y = legacy ? field.y_position / pageHeight : field.y_position / 10000;
  const w = legacy ? field.width / pageWidth : field.width / 10000;
  const h = legacy ? field.height / pageHeight : field.height / 10000;
  return {
    x: Math.max(0, Math.min(x, 0.95)),
    y: Math.max(0, Math.min(y, 0.95)),
    w: Math.max(0.04, Math.min(w, 1)),
    h: Math.max(0.02, Math.min(h, 1)),
  };
}

export default function PlacedField({
  field,
  signer,
  pageWidth,
  pageHeight,
  isSelected,
  onSelect,
  onDelete,
  onUpdateBounds,
  isPlacementMode = false,
}) {
  const Icon = FIELD_ICONS[field.field_type] || PenTool;
  const label = FIELD_LABELS[field.field_type] || 'Field';
  const color = signer?.color || '#2563EB';

  const base = toFrac(field, pageWidth, pageHeight);
  const [live, setLive] = useState(null); // {x,y,w,h} while interacting
  const liveRef = useRef(null);
  const opRef = useRef(null); // { type:'drag'|'resize', startX, startY, orig }

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  // If parent field props change (after save), drop local override
  useEffect(() => {
    if (!opRef.current) setLive(null);
  }, [field.x_position, field.y_position, field.width, field.height]);

  const x = live?.x ?? base.x;
  const y = live?.y ?? base.y;
  const w = live?.w ?? base.w;
  const h = live?.h ?? base.h;

  const commit = useCallback(() => {
    const op = opRef.current;
    if (!op) return;
    const final = liveRef.current || op.orig;
    opRef.current = null;
    setLive(null);
    if (final && onUpdateBounds) {
      onUpdateBounds(field.id, final.x, final.y, final.w, final.h);
    }
  }, [field.id, onUpdateBounds]);

  // Global move/up — resize/drag kabhi stick nahi hote
  useEffect(() => {
    const onMove = (e) => {
      const op = opRef.current;
      if (!op || !pageWidth || !pageHeight) return;

      const dx = (e.clientX - op.startX) / pageWidth;
      const dy = (e.clientY - op.startY) / pageHeight;
      const o = op.orig;

      let next;
      if (op.type === 'drag') {
        let nx = o.x + dx;
        let ny = o.y + dy;
        nx = Math.max(0, Math.min(nx, 1 - o.w));
        ny = Math.max(0, Math.min(ny, 1 - o.h));
        next = { x: nx, y: ny, w: o.w, h: o.h };
      } else {
        // resize from bottom-right
        let nw = o.w + dx;
        let nh = o.h + dy;
        nw = Math.max(0.08, Math.min(nw, 1 - o.x)); // min ~8% page width
        nh = Math.max(0.035, Math.min(nh, 1 - o.y)); // min ~3.5% page height
        next = { x: o.x, y: o.y, w: nw, h: nh };
      }

      liveRef.current = next;
      setLive(next);
    };

    const onUp = () => commit();

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('blur', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [pageWidth, pageHeight, commit]);

  const startDrag = useCallback((e) => {
    if (isPlacementMode) return;
    if (e.button !== 0) return;
    if (e.target.closest('[data-no-drag]')) return;

    e.stopPropagation();
    e.preventDefault();
    onSelect?.(field.id);

    const orig = { x, y, w, h };
    opRef.current = {
      type: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      orig,
    };
    liveRef.current = orig;
    setLive(orig);
  }, [isPlacementMode, field.id, onSelect, x, y, w, h]);

  const startResize = useCallback((e) => {
    if (isPlacementMode) return;
    if (e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();
    onSelect?.(field.id);

    const orig = { x, y, w, h };
    opRef.current = {
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      orig,
    };
    liveRef.current = orig;
    setLive(orig);
  }, [isPlacementMode, field.id, onSelect, x, y, w, h]);

  if (!pageWidth || !pageHeight) return null;

  return (
    <div
      onPointerDown={startDrag}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
        borderColor: color,
        backgroundColor: `${color}18`,
        pointerEvents: isPlacementMode ? 'none' : 'auto',
        touchAction: 'none',
        boxSizing: 'border-box',
      }}
      className={`group border-2 rounded-xl p-1.5 flex flex-col justify-between shadow-sm hover:shadow-md z-20 select-none ${
        isSelected ? 'ring-2 ring-offset-1 ring-blue-500 shadow-lg cursor-move' : 'cursor-grab'
      }`}
    >
      <div className="flex items-center justify-between gap-1 min-h-0">
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-white truncate max-w-[80%]"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{signer?.name || 'Signer'}</span>
        </div>

        <button
          type="button"
          data-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(field.id);
          }}
          className="p-1 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="text-[10px] font-bold truncate px-0.5" style={{ color }}>
        {label}
      </div>

      {/* Bigger hit-area resize handle — bottom-right */}
      {isSelected && !isPlacementMode && (
        <div
          data-no-drag
          onPointerDown={startResize}
          title="Drag to resize signature"
          className="absolute bottom-0 right-0 w-5 h-5 translate-x-1/3 translate-y-1/3 z-30"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-sm shadow cursor-nwse-resize hover:scale-110 transition-transform" />
          {/* diagonal grip lines */}
          <svg
            className="absolute bottom-[3px] right-[3px] w-2.5 h-2.5 text-blue-600 pointer-events-none"
            viewBox="0 0 10 10"
          >
            <path d="M9 1 L1 9 M9 5 L5 9 M9 8 L8 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}