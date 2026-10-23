# DocuPlumb

**PDF Text & Table Extraction Platform**

DocuPlumb is a full-stack web application that extracts text, tables, and structured information from PDF documents. Built with Python, FastAPI, React, and TypeScript, it provides an interactive interface for processing PDFs, transforming extracted data, and exporting results.

## Features

- **PDF Upload:** Upload and process PDF documents up to 20 MB.
- **Text Extraction:** Extract readable text from PDF documents, including resumes and reports.
- **Table Extraction:** Detect and extract tables from PDFs using pdfplumber.
- **Extraction Strategies:** Support for automatic, line-based, and stream-based table extraction.
- **Data Processing:** Clean, filter, sort, and transform extracted tables using Pandas.
- **Data Export:** Export tables to CSV, Excel, JSON, and Markdown.
- **Document Preview:** View PDF pages and inspect extracted information.
- **Entity Inspector:** Explore extracted text and key-value information.
- **Sample Documents:** Test extraction using built-in invoice, financial statement, and laboratory report PDFs.
- **Responsive Interface:** Clean web interface built with React and Tailwind CSS.

## Tech Stack

| Category        | Technologies                          |
| --------------- | ------------------------------------- |
| Frontend        | React, TypeScript, Tailwind CSS, Vite |
| Backend         | Python, FastAPI, Uvicorn              |
| PDF Processing  | pdfplumber                            |
| Data Processing | Pandas                                |
| Server          | Node.js, Express                      |
| Testing         | pytest                                |
| Version Control | Git, GitHub                           |

## Project Structure

```text
DocuPlumb/
├── backend/
│   ├── extractors/
│   ├── processors/
│   ├── generators/
│   ├── tests/
│   ├── main.py
│   └── models.py
├── src/
│   ├── components/
│   ├── App.tsx
│   ├── api.ts
│   └── types.ts
├── index.html
├── server.ts
├── vite.config.ts
├── package.json
├── package-lock.json
├── requirements.txt
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- Python 3
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/agrawalmilin9/DocuPlumb.git
cd DocuPlumb
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Run the Application

```bash
npm run dev
```

The development server starts the React frontend and launches the Python FastAPI backend.

Open:

**http://localhost:3000**

The FastAPI documentation is available at:

**http://127.0.0.1:5001/docs**

## How to Use

1. Open DocuPlumb in your browser.
2. Upload a PDF or select a sample document.
3. View extracted text or detected tables.
4. Use Entity Inspector to examine extracted information.
5. Clean, filter, or sort extracted tables.
6. Export structured table data in your preferred format.

## API Endpoints

| Method | Endpoint                                           | Description                     |
| ------ | -------------------------------------------------- | ------------------------------- |
| GET    | `/api/health`                                      | Check backend health            |
| GET    | `/api/documents/samples`                           | List available sample documents |
| POST   | `/api/documents/load-sample`                       | Load and process a sample PDF   |
| POST   | `/api/documents/upload`                            | Upload and extract PDF content  |
| GET    | `/api/documents/{doc_id}/page/{page_number}/image` | Get PDF page preview            |
| POST   | `/api/documents/{doc_id}/transform-table`          | Transform extracted table data  |
| POST   | `/api/documents/{doc_id}/export`                   | Export extracted table data     |
| POST   | `/api/documents/{doc_id}/merge-tables`             | Merge extracted tables          |

Interactive API documentation is available through FastAPI Swagger UI.

## Testing

Run frontend TypeScript checks:

```bash
npm run lint
```

Build the frontend:

```bash
npm run build
```

Run backend tests:

```bash
python -m pytest backend/tests -q
```

Check npm dependencies for known vulnerabilities:

```bash
npm audit
```

**Latest local verification (October 2026):**

- TypeScript checks passed
- Production build successful
- 6 backend tests passed
- 0 npm vulnerabilities reported

## Limitations

- Scanned or image-only PDFs may require OCR, which is not currently included.
- Complex table layouts and borderless tables may not always be detected accurately.
- Extracted data should be reviewed before use in important workflows.
- Document sessions are stored in server memory and may be lost when the server restarts.
- The application is intended for local development and demonstration; additional security hardening is needed before public deployment.

## Future Improvements

- OCR support for scanned documents
- Improved detection of borderless tables
- Batch PDF processing
- More accurate structured information extraction
- Additional export and document-processing options

## License

No license has been specified yet. All rights are reserved unless a license is added.
