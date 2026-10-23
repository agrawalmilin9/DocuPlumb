"""Automated unit and integration tests for document extraction and Pandas processing."""
import io
import pytest
from backend.models import ExtractionOptions, TableTransformRequest
from backend.extractors.base import DocumentExtractionError
from backend.extractors.pdf_extractor import PdfPlumberExtractor
from backend.processors.data_transformer import PandasDataProcessor
from backend.generators.sample_generator import SampleDocumentGenerator


@pytest.fixture
def extractor():
    return PdfPlumberExtractor()

@pytest.fixture
def processor():
    return PandasDataProcessor()

@pytest.fixture
def invoice_pdf_bytes():
    return SampleDocumentGenerator.generate_invoice()

@pytest.fixture
def financial_pdf_bytes():
    return SampleDocumentGenerator.generate_financial_statement()


def test_invalid_pdf_raises_exception(extractor):
    """Test that corrupted non-PDF streams raise custom DocumentExtractionError."""
    fake_stream = io.BytesIO(b"NOT_A_PDF_DATA_STREAM_HEADER")
    with pytest.raises(DocumentExtractionError) as exc_info:
        extractor.inspect_metadata(fake_stream, "invalid.pdf")
    assert exc_info.value.error_code == "INVALID_FORMAT"


def test_empty_file_raises_exception(extractor):
    """Test that zero-byte streams raise EMPTY_FILE error code."""
    empty_stream = io.BytesIO(b"")
    with pytest.raises(DocumentExtractionError) as exc_info:
        extractor.inspect_metadata(empty_stream, "empty.pdf")
    assert exc_info.value.error_code == "EMPTY_FILE"


def test_sample_invoice_extraction(extractor, invoice_pdf_bytes):
    """Test full extraction workflow on authentic generated invoice PDF."""
    stream = io.BytesIO(invoice_pdf_bytes)
    options = ExtractionOptions(
        extract_tables=True,
        extract_text=True,
        extract_key_values=True,
        table_strategy="auto"
    )

    result = extractor.extract(stream, "test_invoice.pdf", options)

    assert result.doc_id is not None
    assert result.metadata.page_count == 1
    assert result.metadata.has_text is True
    assert len(result.tables) >= 1

    # Verify line items table structure
    main_table = next((t for t in result.tables if t.row_count >= 5), result.tables[0])
    assert main_table.row_count >= 5
    assert len(main_table.headers) >= 4
    assert main_table.confidence_score >= 0.8
    assert main_table.bbox is not None
    assert main_table.bbox.width > 0


def test_key_value_extraction(extractor, invoice_pdf_bytes):
    """Test regex entity extraction for invoice number and dates."""
    stream = io.BytesIO(invoice_pdf_bytes)
    options = ExtractionOptions(extract_key_values=True)
    result = extractor.extract(stream, "test_invoice.pdf", options)

    keys = {kv.key: kv.value for kv in result.key_values}
    assert "Invoice Number" in keys or "Invoice Number: INV-2026-8842" in str(keys)
    assert any("2026" in str(val) for val in keys.values())


def test_pandas_transformation_pipeline(extractor, processor, invoice_pdf_bytes):
    """Test Pandas whitespace trimming, type casting, and statistical metrics."""
    stream = io.BytesIO(invoice_pdf_bytes)
    result = extractor.extract(stream, "test_invoice.pdf", ExtractionOptions())
    main_table = next(t for t in result.tables if t.row_count >= 5)

    req = TableTransformRequest(
        table_id=main_table.table_id,
        trim_whitespace=True,
        infer_numeric_types=True,
        drop_empty_rows=True
    )
    transformed, stats = processor.transform_table(main_table, req)

    assert transformed.row_count == main_table.row_count
    assert stats.total_rows > 0
    assert stats.completeness_percentage > 90.0
    assert len(stats.column_types) > 0


def test_table_export_generation(extractor, processor, invoice_pdf_bytes):
    """Test exporting to CSV, JSON, and XLSX byte streams."""
    stream = io.BytesIO(invoice_pdf_bytes)
    result = extractor.extract(stream, "test_invoice.pdf", ExtractionOptions())
    table = result.tables[0]

    # Test CSV
    csv_bytes, mime_csv, filename_csv = processor.export_table(table, "csv")
    assert mime_csv == "text/csv"
    assert len(csv_bytes) > 0
    assert b"," in csv_bytes

    # Test JSON
    json_bytes, mime_json, filename_json = processor.export_table(table, "json")
    assert mime_json == "application/json"
    assert len(json_bytes) > 0
    assert b"[" in json_bytes

    # Test XLSX
    xlsx_bytes, mime_xlsx, filename_xlsx = processor.export_table(table, "xlsx")
    assert "openxmlformats" in mime_xlsx
    assert len(xlsx_bytes) > 0
