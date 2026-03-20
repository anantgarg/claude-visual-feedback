const express = require('express');
const path = require('path');
const fs = require('fs');
const net = require('net');

const corsMiddleware = require('./middleware/cors');
const feedbackRoutes = require('./routes/feedback');

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  let projectPath = process.cwd();
  let projectName = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-path' && args[i + 1]) {
      projectPath = path.resolve(args[++i]);
    } else if (args[i] === '--project-name' && args[i + 1]) {
      projectName = args[++i];
    }
  }

  if (!projectName) {
    projectName = path.basename(projectPath);
  }

  return { projectPath, projectName };
}

// ---------------------------------------------------------------------------
// Server registry helpers (~/.claude-feedback/servers.json)
// ---------------------------------------------------------------------------
const REGISTRY_DIR = path.join(require('os').homedir(), '.claude-feedback');
const REGISTRY_FILE = path.join(REGISTRY_DIR, 'servers.json');

function readRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) return [];
    const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistry(servers) {
  fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(servers, null, 2), 'utf-8');
}

function registerServer(entry) {
  const servers = readRegistry().filter(
    s => !(s.pid === entry.pid || (s.projectPath === entry.projectPath && !isProcessRunning(s.pid)))
  );
  servers.push(entry);
  writeRegistry(servers);
}

function deregisterServer(pid) {
  try {
    const servers = readRegistry().filter(s => s.pid !== pid);
    writeRegistry(servers);
  } catch {
    // Best-effort cleanup
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Find a random available port in the ephemeral range
// ---------------------------------------------------------------------------
function findAvailablePort() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;

    function tryPort() {
      if (attempts >= maxAttempts) {
        return reject(new Error('Could not find an available port after ' + maxAttempts + ' attempts'));
      }
      attempts++;
      const port = Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152;
      const server = net.createServer();
      server.once('error', () => {
        tryPort();
      });
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '127.0.0.1');
    }

    tryPort();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { projectPath, projectName } = parseArgs();

  // Ensure feedback directories exist
  const feedbackDir = path.join(projectPath, 'feedback');
  const screenshotsDir = path.join(feedbackDir, 'screenshots');
  fs.mkdirSync(feedbackDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });

  // Set up Express app
  const app = express();
  app.locals.projectPath = projectPath;
  app.locals.projectName = projectName;

  // Middleware
  app.use(corsMiddleware);
  app.use(express.json());

  // Serve screenshots statically
  app.use('/screenshots', express.static(screenshotsDir));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      projectPath,
      projectName,
      port: app.locals.port
    });
  });

  // Servers discovery
  app.get('/api/servers', (req, res) => {
    const servers = readRegistry();
    res.json(servers);
  });

  // Feedback routes
  app.use(feedbackRoutes);

  // Find port and start
  const port = await findAvailablePort();
  app.locals.port = port;

  app.listen(port, '127.0.0.1', () => {
    console.log(`Feedback server running on port ${port} for project: ${projectName}`);

    // Register in servers.json
    registerServer({
      port,
      projectPath,
      projectName,
      pid: process.pid,
      startedAt: new Date().toISOString()
    });
  });

  // Cleanup on shutdown
  function cleanup() {
    deregisterServer(process.pid);
    process.exit(0);
  }

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', () => {
    // Synchronous deregister on exit (best-effort)
    deregisterServer(process.pid);
  });
}

main().catch(err => {
  console.error('Failed to start feedback server:', err);
  process.exit(1);
});
