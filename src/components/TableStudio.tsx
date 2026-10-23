import React, { useState } from 'react';
import {
  Download,
  Filter,
  ArrowUpDown,
  Sparkles,
  BarChart2,
  Combine,
  Check,
  RefreshCw,
  Search,
  ChevronDown,
} from 'lucide-react';
import { ExtractedTable, TableStatistics } from '../types';
import { transformTable, downloadTableExport, mergeTables } from '../api';

interface TableStudioProps {
  docId: string;
  tables: ExtractedTable[];
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
  onTableUpdated: (newTable: ExtractedTable) => void;
  onTablesMerged: (mergedTable: ExtractedTable) => void;
}

export const TableStudio: React.FC<TableStudioProps> = ({
  docId,
  tables,
  selectedTableId,
  onSelectTable,
  onTableUpdated,
  onTablesMerged,
}) => {
  const currentTable = tables.find((t) => t.table_id === selectedTableId) || tables[0];

  // Transformation states
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [inferNumeric, setInferNumeric] = useState(true);
  const [dropEmptyRows, setDropEmptyRows] = useState(true);
  const [dropEmptyCols, setDropEmptyCols] = useState(true);

  // Filter & Sort
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  // Execution states
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<TableStatistics | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  if (!currentTable) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-lg text-center">
        <p className="text-sm font-medium text-slate-700">No tables detected in document</p>
        <p className="text-xs text-slate-400 mt-1">
          Try extracting with the "stream" strategy or check the raw text layer.
        </p>
      </div>
    );
  }

  const handleApplyTransformations = async () => {
    if (!currentTable) return;
    setIsProcessing(true);
    try {
      const res = await transformTable(docId, {
        table_id: currentTable.table_id,
        drop_empty_rows: dropEmptyRows,
        drop_empty_cols: dropEmptyCols,
        trim_whitespace: trimWhitespace,
        infer_numeric_types: inferNumeric,
        filter_column: filterColumn || undefined,
        filter_query: filterQuery || undefined,
        sort_column: sortColumn || undefined,
        sort_ascending: sortAscending,
      });
      onTableUpdated(res.table);
      setStats(res.statistics);
    } catch (err) {
      console.error('Failed to transform table:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeAll = async () => {
    if (tables.length < 2) return;
    setIsProcessing(true);
    try {
      const res = await mergeTables(docId);
      onTablesMerged(res.merged_table);
      setStats(res.statistics);
      onSelectTable(res.merged_table.table_id);
    } catch (err) {
      console.error('Failed to merge tables:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = (format: string) => {
    downloadTableExport(docId, currentTable.table_id, format);
    setExportMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Top Controls Bar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Table Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={currentTable.table_id}
              onChange={(e) => onSelectTable(e.target.value)}
              className="text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              {tables.map((tbl, i) => (
                <option key={tbl.table_id} value={tbl.table_id}>
                  Table {i + 1} (Page {tbl.page_number} · {tbl.row_count} rows × {tbl.col_count} cols)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <span>Strategy: {currentTable.extraction_strategy}</span>
            <span aria-hidden="true">·</span>
            <span>Confidence: {Math.round(currentTable.confidence_score * 100)}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {tables.length > 1 && (
            <button
              onClick={handleMergeAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
            >
              <Combine className="w-3.5 h-3.5 text-slate-500" />
              Merge {tables.length} Tables
            </button>
          )}

          <button
            onClick={() => setShowStatsModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
            Pandas Summary
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1 text-xs">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>CSV Spreadsheet</span>
                  <span className="text-[10px] text-slate-400">.csv</span>
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>Microsoft Excel</span>
                  <span className="text-[10px] text-slate-400">.xlsx</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>Clean Records JSON</span>
                  <span className="text-[10px] text-slate-400">.json</span>
                </button>
                <button
                  onClick={() => handleExport('markdown')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                >
                  <span>Markdown Table</span>
                  <span className="text-[10px] text-slate-400">.md</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pandas Transformation Ribbon */}
      <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={trimWhitespace}
              onChange={(e) => setTrimWhitespace(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Trim spaces</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={inferNumeric}
              onChange={(e) => setInferNumeric(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Auto-cast numbers</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
            <input
              type="checkbox"
              checked={dropEmptyRows}
              onChange={(e) => setDropEmptyRows(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Drop empty rows</span>
          </label>
        </div>

        {/* Filter and Sort Inputs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1">
            <Search className="w-3 h-3 text-slate-400" />
            <select
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
              className="bg-transparent text-slate-700 text-xs focus:outline-none"
            >
              <option value="">Any column</option>
              {currentTable.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Filter query..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyTransformations()}
              className="w-24 sm:w-32 bg-transparent text-slate-800 text-xs focus:outline-none border-l border-slate-200 pl-2 ml-1"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-1">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={sortColumn}
              onChange={(e) => setSortColumn(e.target.value)}
              className="bg-transparent text-slate-700 text-xs focus:outline-none"
            >
              <option value="">Sort by...</option>
              {currentTable.headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {sortColumn && (
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="text-[11px] font-mono font-medium text-slate-600 px-1 hover:bg-slate-100 rounded"
                title="Toggle sort direction"
              >
                {sortAscending ? 'ASC' : 'DESC'}
              </button>
            )}
          </div>

          <button
            onClick={handleApplyTransformations}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
            Apply
          </button>
        </div>
      </div>

      {/* Main High-Density Tabular Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
            <tr>
              <th className="py-2.5 px-3 font-mono text-[11px] text-slate-400 font-normal w-12 border-r border-slate-200 text-center select-none">
                #
              </th>
              {currentTable.headers.map((header, idx) => {
                const sampleVal = currentTable.rows[0]?.[idx];
                const isNumeric =
                  typeof sampleVal === 'number' ||
                  (!isNaN(Number(sampleVal)) && sampleVal !== null && sampleVal !== '');

                return (
                  <th
                    key={idx}
                    className={`py-2.5 px-3.5 font-semibold text-slate-800 border-r border-slate-100 last:border-r-0 ${
                      isNumeric ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 ${isNumeric ? 'justify-end' : 'justify-start'}`}>
                      <span>{header}</span>
                      {isNumeric && (
                        <span className="font-mono text-[9px] text-slate-400 bg-slate-200/60 px-1 rounded">
                          num
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentTable.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={currentTable.headers.length + 1}
                  className="py-12 text-center text-slate-400 text-xs"
                >
                  No rows matched the current transformation or filter.
                </td>
              </tr>
            ) : (
              currentTable.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400 text-center border-r border-slate-100 select-none tabular-nums">
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, colIdx) => {
                    const isNum = typeof cell === 'number';
                    const displayVal = cell === null || cell === undefined || cell === '' ? '—' : String(cell);
                    const isEmpty = displayVal === '—';

                    return (
                      <td
                        key={colIdx}
                        className={`py-2 px-3.5 text-slate-700 border-r border-slate-50 last:border-r-0 ${
                          isNum ? 'text-right font-mono tabular-nums' : 'text-left'
                        } ${isEmpty ? 'text-slate-300' : ''}`}
                      >
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="px-5 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums font-medium text-slate-800">
            {currentTable.row_count} rows
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{currentTable.col_count} columns</span>
          {stats && (
            <>
              <span aria-hidden="true">·</span>
              <span>Data completeness: <strong className="font-mono">{stats.completeness_percentage}%</strong></span>
            </>
          )}
        </div>
        <div className="text-[11px] text-slate-400">
          Source: Page {currentTable.page_number}
        </div>
      </div>

      {/* Pandas Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Pandas Statistical Distribution Summary
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Computed metrics across numeric columns for {currentTable.table_id}
                </p>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              {stats?.numeric_summaries && Object.keys(stats.numeric_summaries).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50">
                        <th className="py-2 px-3">Metric</th>
                        {Object.keys(stats.numeric_summaries).map((col) => (
                          <th key={col} className="py-2 px-3 text-right font-mono">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      <tr>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">Count</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right">{s.count}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">Mean</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right font-semibold text-slate-900">{s.mean}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">Std Dev</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right text-slate-600">{s.std}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">Min</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right text-slate-600">{s.min}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">Median (Q2)</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right font-semibold text-slate-900">{s.median}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-slate-500 font-sans">Max</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right text-slate-600">{s.max}</td>
                        ))}
                      </tr>
                      <tr className="bg-slate-50/70 font-semibold">
                        <td className="py-1.5 px-3 text-slate-900 font-sans">Sum Total</td>
                        {Object.values(stats.numeric_summaries).map((s, i) => (
                          <td key={i} className="py-1.5 px-3 text-right text-slate-900">{s.sum}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Click "Apply" with "Auto-cast numbers" enabled to generate numeric summaries.
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
