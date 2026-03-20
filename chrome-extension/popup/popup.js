/* ============================================================
   Visual Feedback — Popup Script
   ============================================================ */

(function () {
  'use strict';

  // ── DOM refs ───────────────────────────────────────────────
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const serverPicker = document.getElementById('serverPicker');
  const serverSelect = document.getElementById('serverSelect');
  const portInput = document.getElementById('portInput');
  const connectBtn = document.getElementById('connectBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const serverMessage = document.getElementById('serverMessage');
  const summarySection = document.getElementById('summarySection');
  const openCount = document.getElementById('openCount');
  const inProgressCount = document.getElementById('inProgressCount');
  const resolvedCount = document.getElementById('resolvedCount');
  const recentSection = document.getElementById('recentSection');
  const recentList = document.getElementById('recentList');
  const openPanelBtn = document.getElementById('openPanelBtn');

  // ── State ──────────────────────────────────────────────────
  let servers = [];
  let activeServer = null;
  let feedbackItems = [];

  // ── Helpers ────────────────────────────────────────────────

  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  function timeAgo(dateStr) {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  function getStatusColor(status) {
    switch (status) {
      case 'in-progress': return '#f59e0b';
      case 'resolved': return '#2da44e';
      default: return '#5e6ad2';
    }
  }

  function setMessage(text, type) {
    serverMessage.textContent = text;
    serverMessage.className = 'server-message' + (type ? ` server-message--${type}` : '');
  }

  function setConnected(connected, label) {
    statusDot.className = `status-dot status-dot--${connected ? 'connected' : 'disconnected'}`;
    statusLabel.textContent = label || (connected ? 'Connected' : 'Not connected');
  }

  // ── Server discovery ───────────────────────────────────────

  async function discoverServers() {
    try {
      servers = await sendMessage({ type: 'get-servers' });
      if (!Array.isArray(servers)) servers = [];
    } catch {
      servers = [];
    }

    if (servers.length === 0) {
      serverPicker.style.display = 'none';
      setMessage('No servers found. Enter a port manually.', '');
      return;
    }

    if (servers.length === 1) {
      serverPicker.style.display = 'none';
      await selectServer(servers[0]);
    } else {
      // Multiple servers — show picker
      serverPicker.style.display = 'block';
      serverSelect.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.textContent = 'Select a server...';
      placeholder.value = '';
      serverSelect.appendChild(placeholder);

      servers.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.port;
        opt.textContent = `${s.project || 'Unknown'} (localhost:${s.port})`;
        serverSelect.appendChild(opt);
      });

      // Auto-select if there's an active server
      const stored = await sendMessage({ type: 'get-active-server' });
      if (stored) {
        const port = new URL(stored).port;
        serverSelect.value = port;
        const server = servers.find((s) => String(s.port) === String(port));
        if (server) await selectServer(server);
      }
    }
  }

  async function selectServer(server) {
    const serverUrl = `http://localhost:${server.port}`;
    await sendMessage({ type: 'set-active-server', serverUrl, port: server.port });
    activeServer = serverUrl;
    setConnected(true, server.project || `localhost:${server.port}`);
    setMessage(`Connected to ${server.project || 'server'} on port ${server.port}`, 'success');

    // Store as last-used
    chrome.storage.local.set({ lastPort: server.port });

    await loadFeedback();
  }

  // ── Load feedback ──────────────────────────────────────────

  async function loadFeedback() {
    if (!activeServer) return;

    try {
      const data = await sendMessage({ type: 'get-feedback' });
      if (Array.isArray(data)) {
        feedbackItems = data;
      } else if (data && Array.isArray(data.items)) {
        feedbackItems = data.items;
      } else {
        feedbackItems = [];
      }
    } catch {
      feedbackItems = [];
    }

    renderSummary();
    renderRecent();
  }

  function renderSummary() {
    const open = feedbackItems.filter((f) => f.status === 'open').length;
    const inProgress = feedbackItems.filter((f) => f.status === 'in-progress').length;
    const resolved = feedbackItems.filter((f) => f.status === 'resolved').length;

    openCount.textContent = `${open} Open`;
    inProgressCount.textContent = `${inProgress} In Progress`;
    resolvedCount.textContent = `${resolved} Resolved`;

    summarySection.style.display = feedbackItems.length > 0 ? 'block' : 'none';
  }

  function renderRecent() {
    recentList.innerHTML = '';

    const recent = feedbackItems
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);

    if (recent.length === 0) {
      recentSection.style.display = 'none';
      return;
    }

    recentSection.style.display = 'block';

    recent.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'recent-item';

      const dot = document.createElement('div');
      dot.className = 'status-dot';
      dot.style.background = getStatusColor(item.status);

      const content = document.createElement('div');
      content.className = 'recent-content';

      const comment = document.createElement('div');
      comment.className = 'recent-comment';
      comment.textContent = item.comment || '';

      const meta = document.createElement('div');
      meta.className = 'recent-meta';
      meta.textContent = item.timestamp ? timeAgo(item.timestamp) : '';
      if (item.author) meta.textContent += ` by ${item.author}`;

      content.appendChild(comment);
      content.appendChild(meta);

      div.appendChild(dot);
      div.appendChild(content);
      recentList.appendChild(div);
    });
  }

  // ── Event handlers ─────────────────────────────────────────

  connectBtn.addEventListener('click', async () => {
    const port = parseInt(portInput.value, 10);
    if (!port || port < 1 || port > 65535) {
      setMessage('Enter a valid port number (1-65535)', 'error');
      return;
    }

    setMessage('Connecting...', '');
    connectBtn.disabled = true;

    try {
      await sendMessage({ type: 'add-port', port });
      const serversResult = await sendMessage({ type: 'get-servers' });
      const server = (Array.isArray(serversResult) ? serversResult : []).find(
        (s) => s.port === port
      );

      if (server) {
        await selectServer(server);
      } else {
        setMessage(`No server found on port ${port}`, 'error');
        setConnected(false);
      }
    } catch (err) {
      setMessage(`Connection failed: ${err.message}`, 'error');
      setConnected(false);
    }

    connectBtn.disabled = false;
  });

  portInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connectBtn.click();
  });

  refreshBtn.addEventListener('click', () => {
    setMessage('Searching for servers...', '');
    discoverServers();
  });

  serverSelect.addEventListener('change', () => {
    const port = parseInt(serverSelect.value, 10);
    const server = servers.find((s) => s.port === port);
    if (server) selectServer(server);
  });

  openPanelBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'open-panel' });
    }
    window.close();
  });

  // ── Init ───────────────────────────────────────────────────

  async function init() {
    // Check for existing active server
    try {
      const stored = await sendMessage({ type: 'get-active-server' });
      if (stored) {
        activeServer = stored;
        try {
          const url = new URL(stored);
          portInput.value = url.port;
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    // Load last port
    try {
      const result = await chrome.storage.local.get('lastPort');
      if (result.lastPort && !portInput.value) {
        portInput.value = result.lastPort;
      }
    } catch { /* ignore */ }

    await discoverServers();
  }

  init();
})();
