import {
  ExtractionResult,
  SampleDoc,
  TableStatistics,
  ExtractedTable,
} from './types';

export async function fetchHealth(): Promise<{ status: string; versions: Record<string, string> }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchSamples(): Promise<SampleDoc[]> {
  const res = await fetch('/api/documents/samples');
  if (!res.ok) throw new Error('Failed to load sample documents');
  return res.json();
}

export async function loadSampleDocument(sampleId: string): Promise<ExtractionResult> {
  const res = await fetch(`/api/documents/load-sample?sample_id=${encodeURIComponent(sampleId)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to load sample document');
  }
  return res.json();
}

export async function uploadPdfDocument(
  file: File,
  strategy: string = 'auto',
  extractKeyValues: boolean = true,
  cleanTables: boolean = true
): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('table_strategy', strategy);
  formData.append('extract_key_values', String(extractKeyValues));
  formData.append('clean_tables', String(cleanTables));

  const res = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Upload and extraction failed');
  }
  return res.json();
}

export async function fetchPageImage(docId: string, pageNumber: number): Promise<string> {
  const res = await fetch(`/api/documents/${docId}/page/${pageNumber}/image`);
  if (!res.ok) {
    throw new Error(`Failed to render page ${pageNumber}`);
  }
  const data = await res.json();
  return data.image_data_url;
}

export async function transformTable(
  docId: string,
  params: {
    table_id: string;
    drop_empty_rows: boolean;
    drop_empty_cols: boolean;
    trim_whitespace: boolean;
    infer_numeric_types: boolean;
    header_row_index?: number;
    filter_column?: string;
    filter_query?: string;
    sort_column?: string;
    sort_ascending?: boolean;
  }
): Promise<{ table: ExtractedTable; statistics: TableStatistics }> {
  const res = await fetch(`/api/documents/${docId}/transform-table`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Transformation failed');
  }
  return res.json();
}

export async function mergeTables(
  docId: string
): Promise<{ merged_table: ExtractedTable; statistics: TableStatistics }> {
  const res = await fetch(`/api/documents/${docId}/merge-tables`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to merge tables');
  }
  return res.json();
}

export function downloadTableExport(docId: string, tableId: string, format: string) {
  // Direct file download trigger via form or fetch blob
  fetch(`/api/documents/${docId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table_id: tableId, format }),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error('Export download failed');
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      let filename = `table_export.${format}`;
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error('Download error:', err);
    });
}
