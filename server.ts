import express from 'express';
import { createServer as createViteServer } from 'vite';
import httpProxy from 'http-proxy';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const PYTHON_PORT = 5001;
let pythonProcess: ChildProcess | null = null;
let isPythonReady = false;

function launchPythonBackend() {
  console.log(`Starting FastAPI Python backend on port ${PYTHON_PORT}...`);
  try {
    pythonProcess = spawn(
      process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3'),
      ['-m', 'uvicorn', 'backend.main:app', '--port', `${PYTHON_PORT}`, '--host', '127.0.0.1', ...(process.env.NODE_ENV === 'production' ? [] : ['--reload'])],
      {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: process.cwd() },
      }
    );

    pythonProcess.on('error', (err) => {
      console.error('Failed to spawn Python process:', err);
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`Python process exited with code ${code} and signal ${signal}`);
      isPythonReady = false;
    });

    // Check health asynchronously in the background
    const checkHealth = async () => {
      for (let i = 0; i < 30; i++) {
        try {
          const res = await fetch(`http://127.0.0.1:${PYTHON_PORT}/api/health`);
          if (res.ok) {
            isPythonReady = true;
            console.log('FastAPI Python backend is ready and operational.');
            return;
          }
        } catch {
          // backend still warming up
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      console.warn('FastAPI backend health check reached max attempts.');
    };

    checkHealth();
  } catch (err) {
    console.error('Failed to start python backend:', err);
  }
}

async function startServer() {
  const app = express();

  // FastAPI reverse proxy, preserving the /api prefix
  const proxy = httpProxy.createProxyServer({
    target: `http://127.0.0.1:${PYTHON_PORT}`,
    changeOrigin: true,
  });

  proxy.on('error', (err, _req, res) => {
    console.error('Backend proxy error:', err.message);

    const response = res as import('http').ServerResponse;

    if (response.headersSent || response.destroyed) {
      response.destroy();
      return;
    }

    response.writeHead(isPythonReady ? 502 : 503, {
      'Content-Type': 'application/json',
    });

    response.end(JSON.stringify({
      error: true,
      error_code: isPythonReady
        ? 'BACKEND_UNAVAILABLE'
        : 'BACKEND_STARTING',
      message: isPythonReady
        ? 'Unable to connect to document processing backend.'
        : 'FastAPI Python processing engine is initializing. Please wait a moment...',
    }));
  });

  app.use('/api', (req, res) => {
    // Express strips /api from req.url when mounted here.
    // Restore it before forwarding to FastAPI.
    req.url = `/api${req.url}`;
    proxy.web(req, res);
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Bind port 3000 immediately so the health condition passes without delay
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`DocuPlumb server listening at http://0.0.0.0:${PORT}`);
    // Launch Python backend non-blockingly
    launchPythonBackend();
  });

  const cleanup = () => {
    console.log('Shutting down server and subprocesses...');
    if (pythonProcess) {
      pythonProcess.kill();
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
