import React from "react";
import {
  FileText,
  Table2,
  Layers,
  CheckCircle2,
  UploadCloud,
} from "lucide-react";

interface HeaderProps {
  activeTab: "viewer" | "tables" | "entities" | "tests";
  onSelectTab: (tab: "viewer" | "tables" | "entities" | "tests") => void;
  onOpenUpload: () => void;
  hasDocument: boolean;
  documentName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenUpload,
  hasDocument,
  documentName,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab("viewer");
            }}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            DocuPlumb
          </a>
          {documentName && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-3">
              <span className="truncate max-w-[220px] font-medium text-slate-700">
                {documentName}
              </span>
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links (Single-line controls) */}
        <nav className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => onSelectTab("viewer")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === "viewer"
                ? "bg-slate-100 text-slate-900 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Document Viewer
            </span>
          </button>

          <button
            onClick={() => onSelectTab("tables")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === "tables"
                ? "bg-slate-100 text-slate-900 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Table2 className="w-3.5 h-3.5 text-slate-500" />
              Table Studio
            </span>
          </button>

          <button
            onClick={() => onSelectTab("entities")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === "entities"
                ? "bg-slate-100 text-slate-900 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Entity Inspector
            </span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-sm whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            {hasDocument ? "Load New PDF" : "Upload Document"}
          </button>
        </div>
      </div>
    </header>
  );
};
