import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback } from 'react';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { scrollModePlugin, ScrollMode } from '@react-pdf-viewer/scroll-mode';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import PlacedField from './PlacedField';

const WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

const PDFViewer = forwardRef(({
  fileUrl,
  currentPage = 1,
  scale = 1.0,
  onLoadSuccess,
  onPageChange,
  fields = [],
  signers = [],
  selectedSignerId,
  activeFieldType,
  onPlaceField,
  onUpdateFieldBounds, // 👈 New prop name
  onDeleteField,
  selectedFieldId,
  onSelectField,
}, ref) => {
  const [loadError, setLoadError] = useState(null);
  const containerRef = useRef(null);
  const [pageLayout, setPageLayout] = useState({ width: 0, height: 0, left: 0, top: 0 });

  const pageNavigationPluginInstance = pageNavigationPlugin();
  const zoomPluginInstance = zoomPlugin();
  const scrollModePluginInstance = scrollModePlugin();

  const { jumpToPage } = pageNavigationPluginInstance;
  const { zoomTo } = zoomPluginInstance;
  const { switchScrollMode } = scrollModePluginInstance;

  // 🔥 FIX: Defeat Virtualization by finding the actual DOM node in view
  const updatePageLayout = useCallback(() => {
    if (!containerRef.current) return;

    // 1. Try to find the exact page by its data-testid (react-pdf-viewer specific)
    let targetPage = containerRef.current.querySelector(`[data-testid="core__page-layer-${currentPage - 1}"] .rpv-core__inner-page`);

    // 2. Fallback: If virtualized out or class changes, find the most visible page on screen!
    if (!targetPage) {
      const pages = containerRef.current.querySelectorAll('.rpv-core__inner-page');
      if (pages.length === 0) return;

      let bestPage = pages[0];
      let maxVisible = 0;
      const containerRect = containerRef.current.getBoundingClientRect();

      pages.forEach(p => {
        const rect = p.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top);
        if (visibleHeight > maxVisible) {
          maxVisible = visibleHeight;
          bestPage = p;
        }
      });
      targetPage = bestPage;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const pageRect = targetPage.getBoundingClientRect();

    setPageLayout({
      width: pageRect.width,
      height: pageRect.height,
      left: pageRect.left - containerRect.left,
      top: pageRect.top - containerRect.top,
    });
  }, [currentPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      switchScrollMode(ScrollMode.Page);
      updatePageLayout();
    }, 300);
    return () => clearTimeout(timer);
  }, [fileUrl, switchScrollMode, updatePageLayout]);

  useEffect(() => {
    if (currentPage && jumpToPage) jumpToPage(currentPage - 1);
    const timer = setTimeout(updatePageLayout, 150);
    return () => clearTimeout(timer);
  }, [currentPage, jumpToPage, updatePageLayout]);

  useEffect(() => {
    if (scale && zoomTo) zoomTo(scale);
    const timer = setTimeout(updatePageLayout, 150);
    return () => clearTimeout(timer);
  }, [scale, zoomTo, updatePageLayout]);

  useEffect(() => {
    window.addEventListener('resize', updatePageLayout);
    return () => window.removeEventListener('resize', updatePageLayout);
  }, [updatePageLayout]);

  useImperativeHandle(ref, () => ({
    getPageElement: () => containerRef.current,
    jumpToPage: (pageIdx) => jumpToPage(pageIdx),
    zoomTo: (zoomLevel) => zoomTo(zoomLevel),
  }));

  const handleDocumentLoad = (e) => {
    setLoadError(null);
    if (onLoadSuccess) onLoadSuccess({ numPages: e.doc.numPages });
    setTimeout(() => {
      switchScrollMode(ScrollMode.Page);
      jumpToPage(currentPage - 1);
      zoomTo(scale);
      updatePageLayout();
    }, 150);
  };

  const handlePageChange = (e) => {
    const newPage = e.currentPage + 1;
    if (onPageChange) onPageChange(newPage);
  };

  const handleCanvasClick = (e) => {
    if (!activeFieldType || !selectedSignerId || !containerRef.current) return;
    // only left click
    if (e.button !== undefined && e.button !== 0) return;

    const pageEl = e.target.closest('.rpv-core__inner-page');
    if (!pageEl) return;

    const pageRect = pageEl.getBoundingClientRect();
    const clickX = e.clientX - pageRect.left;
    const clickY = e.clientY - pageRect.top;

    if (clickX < 0 || clickY < 0 || clickX > pageRect.width || clickY > pageRect.height) return;

    const fieldW = pageRect.width * 0.22;
    const fieldH = pageRect.height * 0.07;

    const posX = clickX - fieldW / 2;
    const posY = clickY - fieldH / 2;

    let xBasis = Math.round((posX / pageRect.width) * 10000);
    let yBasis = Math.round((posY / pageRect.height) * 10000);
    const wBasis = Math.round((fieldW / pageRect.width) * 10000);
    const hBasis = Math.round((fieldH / pageRect.height) * 10000);

    xBasis = Math.max(0, Math.min(xBasis, 10000 - wBasis));
    yBasis = Math.max(0, Math.min(yBasis, 10000 - hBasis));

    onPlaceField({
      signer_id: selectedSignerId,
      field_type: activeFieldType,
      page_number: currentPage,
      x_position: xBasis,
      y_position: yBasis,
      width: wBasis,
      height: hBasis,
      required: true,
    });
  };

  const isPlacementMode = activeFieldType && selectedSignerId;
  const currentPageFields = fields.filter((f) => f.page_number === currentPage);

  return (
    <div className="w-full flex flex-col items-center">
      {isPlacementMode && (
        <div className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce">
          <Plus className="w-4 h-4" />
          Click on Page {currentPage} to place a <span className="underline uppercase tracking-wider">{activeFieldType}</span> field
        </div>
      )}

      <Worker workerUrl={WORKER_URL}>
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          className={`relative bg-white shadow-[0_10px_40px_rgba(15,28,46,0.08)] rounded-xl overflow-hidden border border-slate-200/80 transition-all ${isPlacementMode ? 'cursor-crosshair ring-4 ring-blue-500/20' : ''
            }`}
          style={{ width: '100%', maxWidth: '900px', height: '700px' }}
        >
          <Viewer
            fileUrl={fileUrl}
            plugins={[pageNavigationPluginInstance, zoomPluginInstance, scrollModePluginInstance]}
            defaultScale={SpecialZoomLevel.PageFit}
            onDocumentLoad={handleDocumentLoad}
            onPageChange={handlePageChange}
          />

          {pageLayout.width > 0 && (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                left: `${pageLayout.left}px`,
                top: `${pageLayout.top}px`,
                width: `${pageLayout.width}px`,
                height: `${pageLayout.height}px`,
              }}
            >
              {currentPageFields.map((field) => {
                const signer = signers.find((s) => s.id === field.signer_id);
                return (
                  <PlacedField
                    key={field.id}
                    field={field}
                    signer={signer}
                    pageWidth={pageLayout.width}
                    pageHeight={pageLayout.height}
                    isSelected={selectedFieldId === field.id}
                    onSelect={onSelectField}
                    onDelete={onDeleteField}
                    isPlacementMode={!!isPlacementMode}
                    onUpdateBounds={(id, x, y, w, h) =>
                      onUpdateFieldBounds(
                        id,
                        Math.round(x * 10000),
                        Math.round(y * 10000),
                        Math.round(w * 10000),
                        Math.round(h * 10000),
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </Worker>
    </div>
  );
});

PDFViewer.displayName = 'PDFViewer';
export default PDFViewer;