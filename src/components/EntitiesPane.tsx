import React, { useState } from 'react';
import { Copy, Check, Search, FileText, Calendar, DollarSign, Hash, Mail } from 'lucide-react';
import { KeyValuePair } from '../types';

interface EntitiesPaneProps {
  keyValues: KeyValuePair[];
  rawText: Record<number, string>;
  onNavigateToPage?: (pageNum: number) => void;
}

export const EntitiesPane: React.FC<EntitiesPaneProps> = ({
  keyValues,
  rawText,
  onNavigateToPage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'entities' | 'text'>('entities');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTextPage, setSelectedTextPage] = useState<number>(1);

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-600" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-blue-600" />;
      case 'reference':
        return <Hash className="w-3.5 h-3.5 text-purple-600" />;
      case 'contact':
        return <Mail className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const filteredEntities = keyValues.filter(
    (kv) =>
      kv.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kv.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentText = rawText[selectedTextPage] || '';

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Sub-header navigation */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
          <button
            onClick={() => setActiveSubTab('entities')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeSubTab === 'entities'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Structured Entities ({keyValues.length})
          </button>
          <button
            onClick={() => setActiveSubTab('text')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeSubTab === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Extracted Text Layer
          </button>
        </div>

        {activeSubTab === 'entities' && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search key or value..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-800 text-xs focus:outline-none w-36 sm:w-48"
            />
          </div>
        )}

        {activeSubTab === 'text' && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Page:</span>
            <select
              value={selectedTextPage}
              onChange={(e) => setSelectedTextPage(Number(e.target.value))}
              className="border border-slate-200 rounded py-1 px-2 text-xs font-mono bg-white"
            >
              {Object.keys(rawText).map((p) => (
                <option key={p} value={p}>
                  Page {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-5">
        {activeSubTab === 'entities' ? (
          filteredEntities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No entities found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEntities.map((kv, idx) => (
                <div
                  key={idx}
                  className="p-3.5 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      {getCategoryIcon(kv.category)}
                      <span>{kv.key}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-slate-400">
                        p.{kv.page_number}
                      </span>
                      <button
                        onClick={() => handleCopy(kv.value, `${kv.key}-${idx}`)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedKey === `${kv.key}-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900 break-words font-mono">
                    {kv.value}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto whitespace-pre-wrap leading-relaxed select-text">
              {currentText || '(No text extracted for this page)'}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono tabular-nums">{currentText.length} total characters</span>
              <span className="font-mono tabular-nums">
                {currentText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
