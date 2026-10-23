"""FastAPI application providing document processing REST APIs."""
import io
import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.models import (
    ExtractionOptions,
    ExtractionResult,
    TableTransformRequest,
    ExportFormat,
    ExtractedTable,
)
from backend.extractors.base import DocumentExtractionError
from backend.extractors.pdf_extractor import PdfPlumberExtractor
from backend.processors.data_transformer import PandasDataProcessor
from backend.generators.sample_generator import SampleDocumentGenerator

app = FastAPI(
    title="DocuPlumb API",
    description="Enterprise PDF Data Extraction and Document Processing Engine",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document storage: doc_id -> {"bytes": bytes, "filename": str, "result": ExtractionResult}
DOCUMENT_CACHE: Dict[str, Dict[str, Any]] = {}

extractor = PdfPlumberExtractor()
processor = PandasDataProcessor()


@app.exception_handler(DocumentExtractionError)
async def extraction_error_handler(request, exc: DocumentExtractionError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": True,
            "error_code": exc.error_code,
            "message": exc.message,
            "document": exc.doc_name
        }
    )


@app.get("/api/health")
def health_check():
    """Return backend health and runtime package telemetry."""
    import pdfplumber
    import pandas
    return {
        "status": "healthy",
        "service": "DocuPlumb Extraction Engine",
        "versions": {
            "pdfplumber": getattr(pdfplumber, "__version__", "0.11.10"),
            "pandas": getattr(pandas, "__version__", "2.3.3"),
            "fastapi": "0.159.1"
        }
    }


@app.get("/api/documents/samples")
def list_sample_documents():
    """Return pre-generated sample documents available for immediate analysis."""
    return [
        {
            "id": "sample_invoice",
            "title": "Commercial Logistics Invoice",
            "category": "Invoicing & Billing",
            "description": "Multi-item freight invoice with shipping codes, unit prices, tax breakdown, and header metadata.",
            "pages": 1,
            "table_count": 2,
            "filename": "Global_Freight_INV-2026-8842.pdf"
        },
        {
            "id": "sample_financial",
            "title": "Corporate Q3 Financial Operations",
            "category": "Corporate Finance",
            "description": "Consolidated statement of operations with multi-quarter revenue segments, margins, and YoY growth percentages.",
            "pages": 1,
            "table_count": 1,
            "filename": "Veridian_Q3_Financial_Statement.pdf"
        },
        {
            "id": "sample_lab",
            "title": "Clinical Diagnostic Reference Panel",
            "category": "Healthcare & Diagnostics",
            "description": "Complete blood and metabolic panel with observed analytes, reference intervals, units, and status flags.",
            "pages": 1,
            "table_count": 1,
            "filename": "BioAnalytics_Lab_Diagnostic_Report.pdf"
        }
    ]


@app.post("/api/documents/load-sample")
def load_sample(sample_id: str):
    """Load a genuine binary PDF sample and extract its contents immediately."""
    if sample_id == "sample_invoice":
        pdf_bytes = SampleDocumentGenerator.generate_invoice()
        filename = "Global_Freight_INV-2026-8842.pdf"
    elif sample_id == "sample_financial":
        pdf_bytes = SampleDocumentGenerator.generate_financial_statement()
        filename = "Veridian_Q3_Financial_Statement.pdf"
    elif sample_id == "sample_lab":
        pdf_bytes = SampleDocumentGenerator.generate_clinical_lab_report()
        filename = "BioAnalytics_Lab_Diagnostic_Report.pdf"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown sample ID: {sample_id}")

    options = ExtractionOptions(
        extract_tables=True,
        extract_text=True,
        extract_key_values=True,
        table_strategy="auto",
        clean_tables=True
    )

    stream = io.BytesIO(pdf_bytes)
    result = extractor.extract(stream, filename, options)

    DOCUMENT_CACHE[result.doc_id] = {
        "bytes": pdf_bytes,
        "filename": filename,
        "result": result
    }

    return result


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    table_strategy: str = Form("auto"),
    extract_key_values: bool = Form(True),
    clean_tables: bool = Form(True),
):
    """Upload custom PDF file, inspect structure, and execute deep extraction."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported document format. Please upload a standard PDF file (.pdf)."
        )

    content = await file.read(20 * 1024 * 1024 + 1)
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF exceeds the 20 MB upload limit.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="File is not a valid PDF.")
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty (0 bytes). Please upload a valid PDF."
        )

    options = ExtractionOptions(
        extract_tables=True,
        extract_text=True,
        extract_key_values=extract_key_values,
        table_strategy=table_strategy,
        clean_tables=clean_tables
    )

    stream = io.BytesIO(content)
    result = extractor.extract(stream, file.filename, options)

    DOCUMENT_CACHE[result.doc_id] = {
        "bytes": content,
        "filename": file.filename,
        "result": result
    }

    return result


@app.get("/api/documents/{doc_id}/page/{page_number}/image")
def get_page_image(doc_id: str, page_number: int):
    """Render high-resolution PDF page image for interactive bounding box overlays."""
    doc_entry = DOCUMENT_CACHE.get(doc_id)
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document session not found or expired.")

    img_data_url = extractor.render_page_image(doc_entry["bytes"], page_number)
    return {"image_data_url": img_data_url, "page_number": page_number}


@app.post("/api/documents/{doc_id}/transform-table")
def transform_table_data(doc_id: str, request: TableTransformRequest):
    """Run Pandas pipeline on an extracted table (cleaning, filtering, sorting, statistics)."""
    doc_entry = DOCUMENT_CACHE.get(doc_id)
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document session not found.")

    res: ExtractionResult = doc_entry["result"]
    target_table: Optional[ExtractedTable] = None

    for tbl in res.tables:
        if tbl.table_id == request.table_id:
            target_table = tbl
            break

    if not target_table:
        raise HTTPException(status_code=404, detail=f"Table {request.table_id} not found.")

    transformed_table, stats = processor.transform_table(target_table, request)

    # Update in-cache table representation
    for i, tbl in enumerate(res.tables):
        if tbl.table_id == request.table_id:
            res.tables[i] = transformed_table
            break

    return {
        "table": transformed_table,
        "statistics": stats
    }


@app.post("/api/documents/{doc_id}/export")
def export_table(doc_id: str, request: ExportFormat):
    """Export table data as downloadable CSV, Excel (.xlsx), JSON, or Markdown."""
    doc_entry = DOCUMENT_CACHE.get(doc_id)
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document session not found.")

    res: ExtractionResult = doc_entry["result"]
    if not res.tables:
        raise HTTPException(status_code=400, detail="No extracted tables available for export.")

    target_table = None
    if request.table_id:
        target_table = next((t for t in res.tables if t.table_id == request.table_id), None)
    if not target_table:
        target_table = res.tables[0]

    content_bytes, mime_type, filename = processor.export_table(target_table, request.format)

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(content=content_bytes, media_type=mime_type, headers=headers)


@app.post("/api/documents/{doc_id}/merge-tables")
def merge_all_tables(doc_id: str):
    """Concatenate multiple extracted tables into a single unified table."""
    doc_entry = DOCUMENT_CACHE.get(doc_id)
    if not doc_entry:
        raise HTTPException(status_code=404, detail="Document session not found.")

    res: ExtractionResult = doc_entry["result"]
    if len(res.tables) < 2:
        raise HTTPException(status_code=400, detail="At least 2 tables required to merge.")

    merged_table = processor.merge_tables(res.tables)
    res.tables.insert(0, merged_table)

    stats = processor.compute_statistics(processor.table_to_dataframe(merged_table))
    return {
        "merged_table": merged_table,
        "statistics": stats
    }
