"""Abstract Base Class for Document Extraction."""
from abc import ABC, abstractmethod
from typing import BinaryIO
from backend.models import ExtractionOptions, ExtractionResult, DocumentMetadata

class DocumentExtractionError(Exception):
    """Custom exception raised when document extraction fails."""
    def __init__(self, message: str, doc_name: str = "", error_code: str = "EXTRACTION_FAILED"):
        super().__init__(message)
        self.message = message
        self.doc_name = doc_name
        self.error_code = error_code

class BaseDocumentExtractor(ABC):
    """Abstract interface defining the contract for document extractors."""

    @abstractmethod
    def inspect_metadata(self, file_stream: BinaryIO, filename: str) -> DocumentMetadata:
        """Extract structural document metadata without full parsing."""
        pass

    @abstractmethod
    def extract(self, file_stream: BinaryIO, filename: str, options: ExtractionOptions) -> ExtractionResult:
        """Execute full extraction workflow across tables, key-values, and text."""
        pass
