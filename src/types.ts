export interface BoundingBox {
  x0: number;
  top: number;
  x1: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ExtractedTable {
  table_id: string;
  page_number: number;
  headers: string[];
  rows: (string | number | null)[][];
  row_count: number;
  col_count: number;
  bbox?: BoundingBox | null;
  extraction_strategy: string;
  confidence_score: number;
}

export interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
  page_number: number;
  category: string;
}

export interface PageMetadata {
  page_number: number;
  width: number;
  height: number;
  rotation: number;
  char_count: number;
  word_count: number;
  table_count: number;
}

export interface DocumentMetadata {
  filename: string;
  file_size_bytes: number;
  page_count: number;
  pages: PageMetadata[];
  pdf_info: Record<string, string>;
  is_encrypted: boolean;
  has_text: boolean;
}

export interface ExtractionResult {
  doc_id: string;
  metadata: DocumentMetadata;
  tables: ExtractedTable[];
  raw_text: Record<number, string>;
  key_values: KeyValuePair[];
  processing_time_ms: number;
  warnings: string[];
}

export interface TableStatistics {
  total_rows: number;
  total_columns: number;
  empty_cells_count: number;
  completeness_percentage: number;
  column_types: Record<string, string>;
  numeric_summaries: Record<string, {
    count: number;
    mean: number;
    std: number;
    min: number;
    q25: number;
    median: number;
    q75: number;
    max: number;
    sum: number;
  }>;
}

export interface SampleDoc {
  id: string;
  title: string;
  category: string;
  description: string;
  pages: number;
  table_count: number;
  filename: string;
}

export interface TestCaseResult {
  node_id: string;
  outcome: 'passed' | 'failed';
  duration_sec: number;
}
