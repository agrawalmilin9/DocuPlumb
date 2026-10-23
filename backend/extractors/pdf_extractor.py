"""PdfPlumber-based document extractor implementation."""
import io
import re
import time
import uuid
import base64
from typing import BinaryIO, List, Dict, Any, Optional
import pdfplumber
import pypdfium2
from PIL import Image

from backend.models import (
    DocumentMetadata,
    PageMetadata,
    ExtractionOptions,
    ExtractionResult,
    ExtractedTable,
    KeyValuePair,
    BoundingBox,
)
from backend.extractors.base import BaseDocumentExtractor, DocumentExtractionError


class PdfPlumberExtractor(BaseDocumentExtractor):
    """Production-grade document extractor using pdfplumber and pypdfium2."""

    # Regex patterns for key-value pair and entity extraction
    KV_PATTERNS = [
        ("invoice_number", r"(?:Invoice\s*(?:#|No|Number|Num)[\s:.]*)([A-Z0-9\-_/]{3,30})", "financial"),
        ("po_number", r"(?:P\.?O\.?\s*(?:#|No|Number)[\s:.]*)([A-Z0-9\-_/]{3,25})", "financial"),
        ("invoice_date", r"(?:Invoice\s*Date[\s:.]*)((?:\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})|(?:\w+\s+\d{1,2},?\s+\d{4}))", "date"),
        ("due_date", r"(?:Due\s*Date[\s:.]*)((?:\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})|(?:\w+\s+\d{1,2},?\s+\d{4}))", "date"),
        ("total_amount", r"(?:Total\s*(?:Amount|Due|Price)?[\s:.]*[$€£¥]?\s*)([\d,]+\.\d{2})", "financial"),
        ("subtotal", r"(?:Subtotal[\s:.]*[$€£¥]?\s*)([\d,]+\.\d{2})", "financial"),
        ("tax_amount", r"(?:(?:Sales\s*Tax|Tax|VAT)[\s:.]*[$€£¥]?\s*)([\d,]+\.\d{2})", "financial"),
        ("tax_id", r"(?:Tax\s*ID|VAT\s*ID|EIN[\s:.]*)([A-Z0-9\-_]{6,20})", "reference"),
        ("email_address", r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", "contact"),
        ("phone_number", r"(?:Phone|Tel|Mobile)[\s:.]*(\+?[0-9\s\-()]{9,20})", "contact"),
        ("account_number", r"(?:Account\s*(?:#|No|Number)[\s:.]*)([0-9\-]{5,20})", "financial"),
    ]

    def inspect_metadata(self, file_stream: BinaryIO, filename: str) -> DocumentMetadata:
        """Inspect PDF structural metadata without extracting full heavy tables."""
        file_bytes = file_stream.read()
        file_stream.seek(0)
        file_size = len(file_bytes)

        if file_size == 0:
            raise DocumentExtractionError("Uploaded file is empty (0 bytes).", filename, "EMPTY_FILE")

        if not file_bytes.startswith(b"%PDF"):
            raise DocumentExtractionError("File signature does not match PDF format.", filename, "INVALID_FORMAT")

        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_meta: List[PageMetadata] = []
                total_chars = 0
                for idx, page in enumerate(pdf.pages, start=1):
                    text = page.extract_text() or ""
                    words = text.split()
                    char_count = len(text)
                    total_chars += char_count

                    # Fast rough table detect
                    tables = page.find_tables()
                    pages_meta.append(
                        PageMetadata(
                            page_number=idx,
                            width=float(page.width),
                            height=float(page.height),
                            rotation=int(getattr(page, "rotation", 0) or 0),
                            char_count=char_count,
                            word_count=len(words),
                            table_count=len(tables)
                        )
                    )

                raw_info = pdf.metadata or {}
                clean_info = {str(k): str(v) for k, v in raw_info.items() if v is not None}

                return DocumentMetadata(
                    filename=filename,
                    file_size_bytes=file_size,
                    page_count=len(pdf.pages),
                    pages=pages_meta,
                    pdf_info=clean_info,
                    is_encrypted=False,
                    has_text=total_chars > 0
                )
        except Exception as e:
            if "encrypted" in str(e).lower() or "password" in str(e).lower():
                raise DocumentExtractionError("The PDF document is password-protected or encrypted.", filename, "ENCRYPTED_FILE")
            raise DocumentExtractionError(f"Failed to inspect PDF metadata: {str(e)}", filename, "PARSING_ERROR")

    def extract(self, file_stream: BinaryIO, filename: str, options: ExtractionOptions) -> ExtractionResult:
        """Run deep extraction on PDF stream."""
        start_time = time.time()
        file_bytes = file_stream.read()
        file_stream.seek(0)

        metadata = self.inspect_metadata(file_stream, filename)
        doc_id = str(uuid.uuid4())

        extracted_tables: List[ExtractedTable] = []
        raw_text_dict: Dict[int, str] = {}
        key_values: List[KeyValuePair] = []
        warnings: List[str] = []

        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                target_pages = options.pages if options.pages else list(range(1, len(pdf.pages) + 1))

                for page_idx in target_pages:
                    if page_idx < 1 or page_idx > len(pdf.pages):
                        warnings.append(f"Page {page_idx} requested is outside valid range (1-{len(pdf.pages)}).")
                        continue

                    page = pdf.pages[page_idx - 1]
                    page_text = page.extract_text() or ""
                    raw_text_dict[page_idx] = page_text

                    # 1. Key-Value Extraction
                    if options.extract_key_values and page_text:
                        self._extract_key_values(page_text, page_idx, key_values)

                    # 2. Table Extraction
                    if options.extract_tables:
                        tables = self._extract_tables_from_page(page, page_idx, options.table_strategy, options.clean_tables)
                        extracted_tables.extend(tables)

        except Exception as e:
            raise DocumentExtractionError(f"Extraction failed during processing: {str(e)}", filename, "EXTRACTION_ABORTED")

        if not metadata.has_text and not extracted_tables:
            warnings.append("Document appears to contain scanned raster images without an embedded text layer.")

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return ExtractionResult(
            doc_id=doc_id,
            metadata=metadata,
            tables=extracted_tables,
            raw_text=raw_text_dict,
            key_values=key_values,
            processing_time_ms=elapsed_ms,
            warnings=warnings
        )

    def _extract_key_values(self, text: str, page_num: int, output_list: List[KeyValuePair]):
        """Extract high-value structured entities using regex pattern recognition."""
        seen_keys = {kv.key for kv in output_list}
        for label, pattern, category in self.KV_PATTERNS:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                val = match.group(1).strip()
                human_label = label.replace("_", " ").title()
                if val and f"{human_label}:{val}" not in seen_keys:
                    output_list.append(
                        KeyValuePair(
                            key=human_label,
                            value=val,
                            confidence=0.95,
                            page_number=page_num,
                            category=category
                        )
                    )
                    seen_keys.add(f"{human_label}:{val}")

    def _extract_tables_from_page(
        self,
        page: Any,
        page_num: int,
        strategy: str,
        clean: bool
    ) -> List[ExtractedTable]:
        """Extract structured tables using pdfplumber's line and text alignment heuristics."""
        page_tables: List[ExtractedTable] = []

        # Configure pdfplumber table settings based on strategy
        table_settings_options = []
        if strategy == "lattice" or strategy == "auto":
            # Explicit lines strategy
            table_settings_options.append({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 3,
                "join_tolerance": 3,
                "edge_min_length": 3,
                "strategy_name": "lattice"
            })
        if strategy == "stream":
            # Text position whitespace strategy
            table_settings_options.append({
                "vertical_strategy": "text",
                "horizontal_strategy": "text",
                "snap_tolerance": 4,
                "join_tolerance": 4,
                "strategy_name": "stream"
            })

        found_objects = []
        for settings in table_settings_options:
            strat_name = settings["strategy_name"]
            st_config = {k: v for k, v in settings.items() if k != "strategy_name"}
            try:
                tables = page.find_tables(table_settings=st_config)
                if tables:
                    for t in tables:
                        found_objects.append((t, strat_name))
                    if strategy == "auto" and found_objects:
                        break  # lattice succeeded with tables, prefer lattice
            except Exception:
                continue

        for idx, (tbl_obj, strat_used) in enumerate(found_objects, start=1):
            raw_data = tbl_obj.extract()
            if not raw_data or len(raw_data) < 1:
                continue

            bbox_coords = tbl_obj.bbox  # (x0, top, x1, bottom)
            table_bbox = BoundingBox(
                x0=round(float(bbox_coords[0]), 2),
                top=round(float(bbox_coords[1]), 2),
                x1=round(float(bbox_coords[2]), 2),
                bottom=round(float(bbox_coords[3]), 2),
                width=round(float(bbox_coords[2] - bbox_coords[0]), 2),
                height=round(float(bbox_coords[3] - bbox_coords[1]), 2),
            )

            # Process headers and rows
            headers, processed_rows = self._process_table_matrix(raw_data, clean)
            if not headers and not processed_rows:
                continue

            # Calculate confidence score
            total_cells = (len(headers) if headers else 1) * max(len(processed_rows), 1)
            filled_cells = sum(
                sum(1 for cell in row if cell is not None and str(cell).strip() != "")
                for row in processed_rows
            )
            confidence = round(min(max(filled_cells / max(total_cells, 1), 0.5), 1.0), 2)

            table_id = f"table_p{page_num}_{idx}_{uuid.uuid4().hex[:6]}"
            page_tables.append(
                ExtractedTable(
                    table_id=table_id,
                    page_number=page_num,
                    headers=headers,
                    rows=processed_rows,
                    row_count=len(processed_rows),
                    col_count=len(headers) if headers else (len(processed_rows[0]) if processed_rows else 0),
                    bbox=table_bbox,
                    extraction_strategy=strat_used,
                    confidence_score=confidence
                )
            )

        return page_tables

    def _process_table_matrix(self, raw_matrix: List[List[Any]], clean: bool):
        """Clean and normalize raw table rows, extracting headers and handling ragged columns."""
        if not raw_matrix:
            return [], []

        # Find max columns
        max_cols = max(len(row) for row in raw_matrix)
        normalized_matrix = []

        for row in raw_matrix:
            padded = list(row) + [None] * (max_cols - len(row))
            if clean:
                cleaned_cells = []
                for cell in padded:
                    if cell is None:
                        cleaned_cells.append("")
                    else:
                        val = str(cell).strip()
                        # Collapse multiple spaces or newlines within a cell
                        val = re.sub(r"\s+", " ", val)
                        cleaned_cells.append(val)
                # Skip row if completely empty
                if any(cleaned_cells):
                    normalized_matrix.append(cleaned_cells)
            else:
                normalized_matrix.append([str(c) if c is not None else "" for c in padded])

        if not normalized_matrix:
            return [], []

        # First non-empty row becomes headers if sensible
        first_row = normalized_matrix[0]
        has_string_header = any(isinstance(c, str) and not c.replace(".", "", 1).isdigit() for c in first_row)
        
        if has_string_header and len(normalized_matrix) > 1:
            headers = [c if c else f"Column_{i+1}" for i, c in enumerate(first_row)]
            # Ensure unique header names
            unique_headers = []
            seen = {}
            for h in headers:
                cnt = seen.get(h, 0)
                if cnt == 0:
                    unique_headers.append(h)
                else:
                    unique_headers.append(f"{h}_{cnt}")
                seen[h] = cnt + 1
            rows = normalized_matrix[1:]
            return unique_headers, rows
        else:
            headers = [f"Column_{i+1}" for i in range(max_cols)]
            return headers, normalized_matrix

    def render_page_image(self, file_bytes: bytes, page_number: int, scale: float = 1.5) -> str:
        """Render a specific PDF page to high-quality PNG base64 using pypdfium2."""
        try:
            pdf = pypdfium2.PdfDocument(file_bytes)
            if page_number < 1 or page_number > len(pdf):
                raise ValueError(f"Invalid page number: {page_number}")

            page = pdf[page_number - 1]
            # Render page to bitmap at scale factor
            bitmap = page.render(scale=scale)
            pil_image = bitmap.to_pil()

            buffer = io.BytesIO()
            pil_image.save(buffer, format="PNG")
            img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
            return f"data:image/png;base64,{img_b64}"
        except Exception as e:
            raise DocumentExtractionError(f"Failed to render page image: {str(e)}", error_code="RENDER_ERROR")
