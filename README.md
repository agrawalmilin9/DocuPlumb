# DocuPlumb — PDF Data Extraction

React/TypeScript UI and FastAPI Python backend for extracting PDF text, tables and key-value fields, transforming tables and exporting data.

## Requirements

- Node.js 22+ and npm
- Python 3.10+

## Local setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm install
npm run dev
```

The Node server automatically starts the Python backend. Set `PYTHON_EXECUTABLE` if Python is installed under a different command.

Open http://localhost:3000. No Gemini API key is required for the current PDF extraction workflow.

## Verification

```powershell
python -m pytest backend/tests -q
npm run lint
npm run build
```

## Limitations

Documents are stored in process memory (not durable or multi-user isolated). The test-running API endpoint is intended for local development only; do not expose it publicly without access control. Review authentication, CORS, resource limits, and document isolation before public deployment.
