import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Loader2, Sparkles, Layers } from 'lucide-react';
import { ExtractionResult, ExtractedTable } from '../types';
import { fetchPageImage } from '../api';

interface PdfViewerPaneProps {
  result: ExtractionResult;
  selectedTableId?: string | null;
  onSelectTable: (tableId: string) => void;
}

export const PdfViewerPane: React.FC<PdfViewerPaneProps> = ({
  result,
  selectedTableId,
  onSelectTable,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);

  const totalPages = result.metadata.page_count;
  const pageMeta = result.metadata.pages.find((p) => p.page_number === currentPage);

  useEffect(() => {
    let isCurrent = true;
    setLoadingImage(true);
    fetchPageImage(result.doc_id, currentPage)
      .then((url) => {
        if (isCurrent) {
          setPageImage(url);
          setLoadingImage(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load page image:', err);
        if (isCurrent) setLoadingImage(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [result.doc_id, currentPage]);

  // Tables on current page
  const pageTables = result.tables.filter((t) => t.page_number === currentPage);

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-700">Document Layout</span>
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Page</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900">{currentPage}</span>
            <span>of</span>
            <span className="font-mono tabular-nums">{totalPages}</span>
          </div>
          <div className="flex items-center gap-0.5 border border-slate-200 rounded-md p-0.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-100 disabled:opacity-40 rounded text-slate-600"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 hover:bg-slate-100 disabled:opacity-40 rounded text-slate-600"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono tabular-nums text-slate-700 select-none">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-slate-500">
            <Layers className="w-3.5 h-3.5" />
            <span>{pageTables.length} tables mapped</span>
          </div>
        </div>
      </div>

      {/* Main Visual Canvas */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-100/70">
        {loadingImage ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
            <p className="text-xs">Rendering vector page layout...</p>
          </div>
        ) : pageImage ? (
          <div
            className="relative shadow-md bg-white border border-slate-300 transition-all origin-top"
            style={{
              width: pageMeta ? `${(pageMeta.width * zoomLevel) / 100}px` : 'auto',
              minWidth: '320px',
            }}
          >
            <img
              src={pageImage}
              alt={`PDF Page ${currentPage}`}
              className="w-full h-auto block select-none pointer-events-none"
            />

            {/* Bounding Box Highlights for Extracted Tables */}
            {pageMeta &&
              pageTables.map((tbl) => {
                if (!tbl.bbox) return null;
                const scaleX = (pageMeta.width * zoomLevel) / 100 / pageMeta.width;
                const scaleY = (pageMeta.height * zoomLevel) / 100 / pageMeta.height;

                const left = tbl.bbox.x0 * scaleX;
                const top = tbl.bbox.top * scaleY;
                const width = tbl.bbox.width * scaleX;
                const height = tbl.bbox.height * scaleY;

                const isSelected = selectedTableId === tbl.table_id;
                const isHovered = highlightedTableId === tbl.table_id;

                return (
                  <div
                    key={tbl.table_id}
                    onClick={() => onSelectTable(tbl.table_id)}
                    onMouseEnter={() => setHighlightedTableId(tbl.table_id)}
                    onMouseLeave={() => setHighlightedTableId(null)}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    className={`absolute cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-blue-600 bg-blue-500/15 ring-2 ring-blue-400'
                        : isHovered
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800/40 bg-slate-800/5 hover:border-slate-900 hover:bg-slate-900/10'
                    }`}
                  >
                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 text-white rounded shadow-xs whitespace-nowrap opacity-90">
                      Table · {tbl.row_count} rows · {Math.round(tbl.confidence_score * 100)}% match
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            No layout image available.
          </div>
        )}
      </div>

      {/* Bottom Status strip */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div>
          <span>{result.metadata.filename}</span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="font-mono tabular-nums">
            {(result.metadata.file_size_bytes / 1024).toFixed(1)} KB
          </span>
          {pageMeta && (
            <>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-mono tabular-nums">{pageMeta.char_count} chars</span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-mono tabular-nums">{pageMeta.word_count} words</span>
            </>
          )}
        </div>
        <div className="font-mono tabular-nums">
          Extracted in {result.processing_time_ms}ms
        </div>
      </div>
    </div>
  );
};
