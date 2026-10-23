import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadModal } from './components/UploadModal';
import { PdfViewerPane } from './components/PdfViewerPane';
import { TableStudio } from './components/TableStudio';
import { EntitiesPane } from './components/EntitiesPane';
import { ExtractionResult, SampleDoc, ExtractedTable } from './types';
import { fetchSamples, loadSampleDocument, uploadPdfDocument } from './api';
import { Loader2, ArrowRight, Table2, Layers, FileText, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'viewer' | 'tables' | 'entities' | 'tests'>('viewer');
  const [samples, setSamples] = useState<SampleDoc[]>([]);
  const [currentResult, setCurrentResult] = useState<ExtractionResult | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load sample documents list and auto-load the commercial logistics invoice
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const sampleList = await fetchSamples();
        if (!mounted) return;
        setSamples(sampleList);

        if (sampleList.length > 0) {
          setIsLoading(true);
          try {
            const initialDoc = await loadSampleDocument(sampleList[0].id);
            if (mounted) {
              setCurrentResult(initialDoc);
              if (initialDoc.tables.length > 0) {
                // Prefer main table
                const mainTable = initialDoc.tables.reduce((prev, curr) =>
                  curr.row_count > prev.row_count ? curr : prev
                );
                setSelectedTableId(mainTable.table_id);
              }
            }
          } catch (e: any) {
            console.error('Initial sample load retry...', e);
          } finally {
            if (mounted) setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Failed to initialize sample list:', err);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectSample = async (sampleId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await loadSampleDocument(sampleId);
      setCurrentResult(res);
      if (res.tables.length > 0) {
        setSelectedTableId(res.tables[0].table_id);
      }
      setIsUploadOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to extract sample document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (
    file: File,
    strategy: string,
    extractKeyValues: boolean,
    cleanTables: boolean
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await uploadPdfDocument(file, strategy, extractKeyValues, cleanTables);
      setCurrentResult(res);
      if (res.tables.length > 0) {
        setSelectedTableId(res.tables[0].table_id);
      }
      setIsUploadOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Document processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableUpdated = (updatedTable: ExtractedTable) => {
    if (!currentResult) return;
    setCurrentResult({
      ...currentResult,
      tables: currentResult.tables.map((t) =>
        t.table_id === updatedTable.table_id ? updatedTable : t
      ),
    });
  };

  const handleTablesMerged = (mergedTable: ExtractedTable) => {
    if (!currentResult) return;
    setCurrentResult({
      ...currentResult,
      tables: [mergedTable, ...currentResult.tables],
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900 antialiased selection:bg-slate-200">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        hasDocument={!!currentResult}
        documentName={currentResult?.metadata.filename}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {isLoading && !currentResult ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[480px]">
            <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-3" />
            <p className="text-sm font-medium text-slate-800">
              Initializing document processing backend...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Parsing vector paths, reading tables, and inferring data schemas
            </p>
          </div>
        ) : !currentResult ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[480px] bg-white border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto my-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Welcome to DocuPlumb Extraction Engine
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Upload any PDF or select an authentic industry benchmark to begin high-precision table
              parsing, key-value entity recognition, and Pandas data normalization.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium transition-colors"
            >
              Choose Document
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-[calc(100vh-6.5rem)]">
            {/* View 1: Document Layout Viewer & Dual Pane */}
            {activeTab === 'viewer' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
                {/* Left 6 cols: PDF Visual Layout with Bounding Boxes */}
                <div className="lg:col-span-6 h-full">
                  <PdfViewerPane
                    result={currentResult}
                    selectedTableId={selectedTableId}
                    onSelectTable={(tableId) => {
                      setSelectedTableId(tableId);
                      setActiveTab('tables');
                    }}
                  />
                </div>

                {/* Right 6 cols: Quick Insights & Extracted Tables preview */}
                <div className="lg:col-span-6 h-full flex flex-col gap-4 overflow-hidden">
                  {/* Metric Summary Strip */}
                  <div className="grid grid-cols-3 gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Extracted Tables
                      </span>
                      <span className="text-base font-semibold text-slate-900 font-mono tabular-nums">
                        {currentResult.tables.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Entities Detected
                      </span>
                      <span className="text-base font-semibold text-slate-900 font-mono tabular-nums">
                        {currentResult.key_values.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Engine Strategy
                      </span>
                      <span className="text-xs font-semibold text-slate-800 capitalize mt-1 block">
                        {currentResult.tables[0]?.extraction_strategy || 'Auto'}
                      </span>
                    </div>
                  </div>

                  {/* Automatically display text or tables */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    {currentResult.tables.length > 0 ? (
                      <div className="flex-1 min-h-0">
                        <TableStudio
                          docId={currentResult.doc_id}
                          tables={currentResult.tables}
                          selectedTableId={selectedTableId}
                          onSelectTable={setSelectedTableId}
                          onTableUpdated={handleTableUpdated}
                          onTablesMerged={handleTablesMerged}
                        />
                      </div>
                    ) : Object.values(currentResult.raw_text).some(
                        (text) => text.trim().length > 0
                      ) ? (
                      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-lg p-5 overflow-auto">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-semibold text-slate-900">
                            Extracted PDF Text
                          </h2>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                Object.values(currentResult.raw_text).join("\n\n")
                              )
                            }
                            className="text-xs px-3 py-2 border rounded-md hover:bg-slate-100"
                          >
                            Copy Text
                          </button>
                        </div>

                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">
                          {Object.entries(currentResult.raw_text)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([page, text]) => (
                              <div key={page} className="mb-6">
                                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                                  Page {page}
                                </h3>
                                {text}
                              </div>
                            ))}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-6 text-center">
                        <p className="text-sm text-slate-500">
                          No extractable text or tables found. This PDF may require OCR.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View 2: Dedicated Table Studio (Full width) */}
            {activeTab === 'tables' && (
              <div className="h-full">
                <TableStudio
                  docId={currentResult.doc_id}
                  tables={currentResult.tables}
                  selectedTableId={selectedTableId}
                  onSelectTable={setSelectedTableId}
                  onTableUpdated={handleTableUpdated}
                  onTablesMerged={handleTablesMerged}
                />
              </div>
            )}

            {/* View 3: Key-Values and Text Layer */}
            {activeTab === 'entities' && (
              <div className="h-full">
                <EntitiesPane
                  keyValues={currentResult.key_values}
                  rawText={currentResult.raw_text}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        samples={samples}
        onSelectSample={handleSelectSample}
        onUploadFile={handleUploadFile}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </div>
  );
}
