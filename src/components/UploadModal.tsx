import React, { useState, useRef } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2, X, Settings2 } from 'lucide-react';
import { SampleDoc } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleDoc[];
  onSelectSample: (sampleId: string) => void;
  onUploadFile: (
    file: File,
    strategy: string,
    extractKeyValues: boolean,
    cleanTables: boolean
  ) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  samples,
  onSelectSample,
  onUploadFile,
  isLoading,
  errorMessage,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'auto' | 'lattice' | 'stream'>('auto');
  const [extractEntities, setExtractEntities] = useState(true);
  const [cleanTables, setCleanTables] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onUploadFile(file, selectedStrategy, extractEntities, cleanTables);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onUploadFile(file, selectedStrategy, extractEntities, cleanTables);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Document Extraction Intake</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an authentic industry PDF benchmark or upload your own document.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Extraction Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Drag & Drop Area */}
        <div className="mt-5">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-slate-800 bg-slate-50'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {isLoading ? 'Processing document in Python backend...' : 'Click or drop PDF here to extract'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports standard PDF formats up to 25MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Presets */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
            Or test with verified sample documents
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {samples.map((sample) => (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                disabled={isLoading}
                className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50/70 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-slate-700 font-medium text-xs">
                    <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900" />
                    <span className="truncate">{sample.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                    {sample.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{sample.category}</span>
                  <span className="font-mono tabular-nums">{sample.table_count} tables</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Extraction Strategy Config */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showOptions ? 'Hide extraction parameters' : 'Configure extraction heuristics'}</span>
          </button>

          {showOptions && (
            <div className="mt-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  pdfplumber Table Extraction Strategy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStrategy('auto')}
                    className={`py-1.5 px-2.5 rounded border text-xs text-center transition-colors ${
                      selectedStrategy === 'auto'
                        ? 'bg-white border-slate-800 text-slate-900 font-medium shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Auto-Detect
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStrategy('lattice')}
                    className={`py-1.5 px-2.5 rounded border text-xs text-center transition-colors ${
                      selectedStrategy === 'lattice'
                        ? 'bg-white border-slate-800 text-slate-900 font-medium shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Lattice (Lines)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStrategy('stream')}
                    className={`py-1.5 px-2.5 rounded border text-xs text-center transition-colors ${
                      selectedStrategy === 'stream'
                        ? 'bg-white border-slate-800 text-slate-900 font-medium shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    Stream (Whitespace)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={extractEntities}
                    onChange={(e) => setExtractEntities(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span className="text-slate-700">Entity & Key-Value recognition</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanTables}
                    onChange={(e) => setCleanTables(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span className="text-slate-700">Normalize cell whitespace</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
