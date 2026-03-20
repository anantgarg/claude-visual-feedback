/* ============================================================
   Visual Feedback — Background Service Worker
   ============================================================ */

const DEFAULT_PORTS = [3777, 3888, 3999, 4000, 4444, 5555, 5173, 8080, 8888, 9999];
const HEALTH_TIMEOUT = 2000; // ms
const RETRY_INTERVAL = 30000; // ms

// ── Offline queue ──────────────────────────────────────────────
let offlineQueue = [];

// ── Helpers ────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}, timeout = HEALTH_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function probeServer(port) {
  try {
    const res = await fetchWithTimeout(`http://localhost:${port}/api/health`);
    if (res.ok) {
      const data = await res.json();
      return { port, ...data };
    }
  } catch { /* ignore */ }
  return null;
}

async function getStoredPorts() {
  const result = await chrome.storage.local.get('knownPorts');
  return result.knownPorts || DEFAULT_PORTS;
}

async function storePort(port) {
  const ports = await getStoredPorts();
  if (!ports.includes(port)) {
    ports.push(port);
    await chrome.storage.local.set({ knownPorts: ports });
  }
}

async function getActiveServer() {
  const result = await chrome.storage.local.get('activeServer');
  return result.activeServer || null;
}

async function setActiveServer(serverUrl) {
  await chrome.storage.local.set({ activeServer: serverUrl });
}

// ── Server Discovery ───────────────────────────────────────────

async function discoverServers() {
  const ports = await getStoredPorts();
  const probes = ports.map((p) => probeServer(p));
  const results = await Promise.all(probes);
  const servers = results.filter(Boolean);

  // If any server responds with a /api/servers list, merge those too
  for (const server of [...servers]) {
    try {
      const res = await fetchWithTimeout(
        `http://localhost:${server.port}/api/servers`
      );
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const s of list) {
            if (s.port && !servers.find((x) => x.port === s.port)) {
              const extra = await probeServer(s.port);
              if (extra) {
                servers.push(extra);
                storePort(s.port);
              }
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  return servers;
}

// ── API helpers ────────────────────────────────────────────────

async function apiRequest(method, path, body) {
  const serverUrl = await getActiveServer();
  if (!serverUrl) throw new Error('No active server');

  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetchWithTimeout(`${serverUrl}${path}`, options, 8000);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server responded ${res.status}: ${text}`);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    return { success: true };
  } catch (err) {
    // Queue for retry if offline
    if (method !== 'GET') {
      offlineQueue.push({ method, path, body, timestamp: Date.now() });
    }
    throw err;
  }
}

async function processOfflineQueue() {
  if (offlineQueue.length === 0) return;

  const serverUrl = await getActiveServer();
  if (!serverUrl) return;

  // Check health first
  try {
    await fetchWithTimeout(`${serverUrl}/api/health`);
  } catch {
    return; // still offline
  }

  const queue = [...offlineQueue];
  offlineQueue = [];

  for (const item of queue) {
    try {
      const options = {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (item.body) options.body = JSON.stringify(item.body);
      await fetchWithTimeout(`${serverUrl}${item.path}`, options, 8000);
    } catch {
      // Re-queue if still failing
      offlineQueue.push(item);
    }
  }
}

// ── Message Handlers ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];
  if (handler) {
    handler(message, sender)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

const messageHandlers = {
  'get-servers': async () => {
    return await discoverServers();
  },

  'set-active-server': async (msg) => {
    await setActiveServer(msg.serverUrl);
    if (msg.port) await storePort(msg.port);
    return { serverUrl: msg.serverUrl };
  },

  'get-active-server': async () => {
    return await getActiveServer();
  },

  'submit-feedback': async (msg) => {
    return await apiRequest('POST', '/api/feedback', msg.feedback);
  },

  'get-feedback': async (msg) => {
    let path = '/api/feedback';
    const params = [];
    if (msg.url) params.push(`url=${encodeURIComponent(msg.url)}`);
    if (msg.status) params.push(`status=${encodeURIComponent(msg.status)}`);
    if (params.length) path += '?' + params.join('&');
    return await apiRequest('GET', path);
  },

  'update-feedback': async (msg) => {
    return await apiRequest('PATCH', `/api/feedback/${msg.id}`, msg.updates);
  },

  'add-reply': async (msg) => {
    return await apiRequest('POST', `/api/feedback/${msg.id}/reply`, msg.reply);
  },

  'add-port': async (msg) => {
    await storePort(msg.port);
    return { stored: true };
  },
};

// ── Command Handlers ───────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  if (command === 'toggle-feedback') {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-feedback' });
  } else if (command === 'toggle-panel') {
    chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' });
  }
});

// ── Lifecycle ──────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  // Try to discover servers on install
  const servers = await discoverServers();
  if (servers.length === 1) {
    await setActiveServer(`http://localhost:${servers[0].port}`);
  }
});

// Periodic offline queue processing
setInterval(processOfflineQueue, RETRY_INTERVAL);
