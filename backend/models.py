"""Pydantic schemas and data validation models for the PDF extraction engine."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x0: float
    top: float
    x1: float
    bottom: float
    width: float
    height: float

class ExtractedCell(BaseModel):
    row_idx: int
    col_idx: int
    value: str
    is_header: bool = False
    bbox: Optional[BoundingBox] = None

class ExtractedTable(BaseModel):
    table_id: str
    page_number: int
    headers: List[str]
    rows: List[List[Any]]
    row_count: int
    col_count: int
    bbox: Optional[BoundingBox] = None
    extraction_strategy: str = "lattice"
    confidence_score: float = 1.0

class KeyValuePair(BaseModel):
    key: str
    value: str
    confidence: float = 1.0
    page_number: int
    category: str = "general"  # financial, date, reference, contact, general

class PageMetadata(BaseModel):
    page_number: int
    width: float
    height: float
    rotation: int = 0
    char_count: int
    word_count: int
    table_count: int

class DocumentMetadata(BaseModel):
    filename: str
    file_size_bytes: int
    page_count: int
    pages: List[PageMetadata]
    pdf_info: Dict[str, Any] = Field(default_factory=dict)
    is_encrypted: bool = False
    has_text: bool = True

class ExtractionOptions(BaseModel):
    extract_tables: bool = True
    extract_text: bool = True
    extract_key_values: bool = True
    table_strategy: str = "auto"  # "auto", "lattice" (lines), "stream" (whitespace)
    clean_tables: bool = True
    pages: Optional[List[int]] = None  # None means all pages

class ExtractionResult(BaseModel):
    doc_id: str
    metadata: DocumentMetadata
    tables: List[ExtractedTable]
    raw_text: Dict[int, str]  # page_number -> text
    key_values: List[KeyValuePair]
    processing_time_ms: float
    warnings: List[str] = Field(default_factory=list)

class TableTransformRequest(BaseModel):
    table_id: str
    drop_empty_rows: bool = True
    drop_empty_cols: bool = True
    trim_whitespace: bool = True
    infer_numeric_types: bool = True
    header_row_index: int = 0
    filter_column: Optional[str] = None
    filter_query: Optional[str] = None
    sort_column: Optional[str] = None
    sort_ascending: bool = True

class TableStatistics(BaseModel):
    total_rows: int
    total_columns: int
    empty_cells_count: int
    completeness_percentage: float
    column_types: Dict[str, str]
    numeric_summaries: Dict[str, Dict[str, float]]

class ExportFormat(BaseModel):
    format: str  # "csv", "json", "xlsx", "markdown"
    table_id: Optional[str] = None
