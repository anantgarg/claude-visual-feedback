/* ============================================================
   Visual Feedback — Content Script (Main Orchestrator)
   ============================================================ */

(function () {
  'use strict';

  // Prevent double-initialization
  if (window.__vfInitialized) return;
  window.__vfInitialized = true;

  // ── State ──────────────────────────────────────────────────
  const State = {
    IDLE: 'idle',
    SELECTING: 'selecting',
    COMMENTING: 'commenting',
  };

  let currentState = State.IDLE;
  let feedbackItems = [];
  let pollInterval = null;
  let isConnected = false;

  // ── Shadow DOM Setup ───────────────────────────────────────
  const hostEl = document.createElement('div');
  hostEl.id = 'vf-root';
  hostEl.style.cssText = 'all:initial; position:absolute; top:0; left:0; z-index:2147483640;';
  document.documentElement.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'open' });

  // Load the linear theme CSS into shadow root
  const themeLink = document.createElement('link');
  themeLink.rel = 'stylesheet';
  themeLink.href = chrome.runtime.getURL('styles/linear-theme.css');
  shadow.appendChild(themeLink);

  // Also load content.css into shadow root for vf- classes
  const contentStyle = document.createElement('link');
  contentStyle.rel = 'stylesheet';
  contentStyle.href = chrome.runtime.getURL('content/content.css');
  shadow.appendChild(contentStyle);

  // Container inside shadow
  const container = document.createElement('div');
  container.id = 'vf-container';
  shadow.appendChild(container);

  // ── Component instances ────────────────────────────────────
  // Components are loaded via manifest content_scripts (same isolated world)
  let floatingButton = null;
  let selectionOverlay = null;
  let commentCard = null;
  let feedbackMarker = null;
  let sidePanel = null;

  // Pending selection data (between selection and comment)
  let pendingSelection = null;

  // ── Messaging helpers ──────────────────────────────────────

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

  // ── Screenshot helper ──────────────────────────────────────

  async function captureScreenshot(rect) {
    // Try html2canvas first
    try {
      if (typeof html2canvas === 'function') {
        const canvas = await html2canvas(document.body, {
          x: rect.x + window.scrollX,
          y: rect.y + window.scrollY,
          width: rect.width,
          height: rect.height,
          useCORS: true,
          logging: false,
        });
        return canvas.toDataURL('image/png');
      }
    } catch (e) {
      console.warn('[VF] html2canvas failed, using fallback:', e);
    }

    // Fallback: capture visible viewport via canvas
    try {
      const canvas = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Draw a placeholder with element info
      ctx.fillStyle = '#f3f2f1';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#6b6b6b';
      ctx.font = '12px Inter, -apple-system, sans-serif';
      ctx.fillText(`Screenshot area: ${Math.round(rect.width)}x${Math.round(rect.height)}`, 8, 20);
      ctx.fillText(`Position: (${Math.round(rect.x)}, ${Math.round(rect.y)})`, 8, 36);

      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('[VF] Screenshot fallback failed:', e);
      return null;
    }
  }

  // ── Core methods ───────────────────────────────────────────

  function startSelection() {
    if (currentState === State.SELECTING) {
      cancelSelection();
      return;
    }
    currentState = State.SELECTING;
    if (sidePanel) sidePanel.close();
    if (selectionOverlay) selectionOverlay.activate();
    if (floatingButton) floatingButton.setActive(true);
  }

  function cancelSelection() {
    currentState = State.IDLE;
    if (selectionOverlay) selectionOverlay.deactivate();
    if (commentCard) commentCard.hide();
    if (floatingButton) floatingButton.setActive(false);
    pendingSelection = null;
  }

  async function onElementSelected(selectionData) {
    currentState = State.COMMENTING;
    if (selectionOverlay) selectionOverlay.deactivate();

    // Capture screenshot
    const screenshotDataUrl = await captureScreenshot(selectionData.rect);
    pendingSelection = { ...selectionData, screenshotDataUrl };

    // Show comment card
    if (commentCard) {
      commentCard.show(pendingSelection);
    }
  }

  async function submitFeedback(data) {
    if (!pendingSelection) return;

    const feedback = {
      url: window.location.href,
      selector: pendingSelection.selector,
      position: {
        x: pendingSelection.rect.x + window.scrollX,
        y: pendingSelection.rect.y + window.scrollY,
        width: pendingSelection.rect.width,
        height: pendingSelection.rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
      screenshot: pendingSelection.screenshotDataUrl,
      comment: data.comment,
      priority: data.priority,
      author: data.author,
      status: 'open',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    try {
      const result = await sendMessage({ type: 'submit-feedback', feedback });
      feedback.id = result?.id || Date.now().toString();
      feedbackItems.push(feedback);

      if (feedbackMarker) feedbackMarker.renderMarkers(feedbackItems);
      if (sidePanel) sidePanel.update(feedbackItems);
      if (floatingButton) floatingButton.updateBadge(feedbackItems.filter((f) => f.status === 'open').length);

      // Store author for next time
      chrome.storage.local.set({ lastAuthor: data.author });
    } catch (err) {
      console.error('[VF] Failed to submit feedback:', err);
      // Still add locally for UX
      feedback.id = 'local-' + Date.now();
      feedback._offline = true;
      feedbackItems.push(feedback);
      if (feedbackMarker) feedbackMarker.renderMarkers(feedbackItems);
    }

    // Reset state
    currentState = State.IDLE;
    pendingSelection = null;
    if (commentCard) commentCard.hide();
    if (floatingButton) floatingButton.setActive(false);
  }

  function onCommentCancel() {
    currentState = State.IDLE;
    pendingSelection = null;
    if (commentCard) commentCard.hide();
    if (floatingButton) floatingButton.setActive(false);
  }

  async function refreshFeedback() {
    try {
      const data = await sendMessage({
        type: 'get-feedback',
        url: window.location.href,
      });

      if (Array.isArray(data)) {
        feedbackItems = data;
      } else if (data && Array.isArray(data.items)) {
        feedbackItems = data.items;
      }

      if (feedbackMarker) feedbackMarker.renderMarkers(feedbackItems);
      if (sidePanel) sidePanel.update(feedbackItems);
      if (floatingButton) {
        floatingButton.updateBadge(feedbackItems.filter((f) => f.status === 'open').length);
        floatingButton.setConnected(true);
      }
      isConnected = true;
    } catch (err) {
      // Server unreachable — not critical
      if (floatingButton) floatingButton.setConnected(false);
      isConnected = false;
    }
  }

  function togglePanel() {
    if (sidePanel) sidePanel.toggle();
  }

  function onMarkerClick(feedbackItem) {
    if (sidePanel) {
      sidePanel.open();
      sidePanel.scrollToItem(feedbackItem.id);
    }
    // Scroll the element into view
    try {
      const el = document.querySelector(feedbackItem.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch { /* ignore bad selectors */ }
  }

  function onFeedbackClick(feedbackItem) {
    try {
      const el = document.querySelector(feedbackItem.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash highlight
        const rect = el.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'vf-highlight';
        highlight.style.cssText = `
          top:${rect.top}px; left:${rect.left}px;
          width:${rect.width}px; height:${rect.height}px;
          position:fixed; pointer-events:none; z-index:2147483641;
          border:2px solid #5e6ad2; background:rgba(94,106,210,0.08);
          border-radius:3px; transition:opacity 500ms ease;
        `;
        document.body.appendChild(highlight);
        setTimeout(() => {
          highlight.style.opacity = '0';
          setTimeout(() => highlight.remove(), 500);
        }, 1500);
      }
    } catch { /* ignore */ }
  }

  // ── Initialize components ──────────────────────────────────

  function initComponents() {
    // Initialize each component (already loaded via manifest content_scripts)
    if (window.VFFloatingButton) {
      floatingButton = new window.VFFloatingButton(shadow, {
        onNewFeedback: startSelection,
        onTogglePanel: togglePanel,
        onProjectSelect: () => {},
      });
    }

    if (window.VFSelectionOverlay) {
      selectionOverlay = new window.VFSelectionOverlay(shadow, onElementSelected, cancelSelection);
    }

    if (window.VFCommentCard) {
      commentCard = new window.VFCommentCard(shadow, submitFeedback, onCommentCancel);
    }

    if (window.VFFeedbackMarker) {
      feedbackMarker = new window.VFFeedbackMarker(shadow, onMarkerClick);
    }

    if (window.VFSidePanel) {
      sidePanel = new window.VFSidePanel(shadow, {
        onFeedbackClick: onFeedbackClick,
        onClose: () => {},
      });
    }

    // Initial fetch
    refreshFeedback();

    // Poll every 5s
    pollInterval = setInterval(refreshFeedback, 5000);
  }

  // ── Listen for messages from background ────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggle-feedback') {
      startSelection();
    } else if (message.type === 'toggle-panel') {
      togglePanel();
    } else if (message.type === 'open-panel') {
      if (sidePanel) sidePanel.open();
    }
  });

  // ── Cleanup on page unload ─────────────────────────────────

  window.addEventListener('beforeunload', () => {
    if (pollInterval) clearInterval(pollInterval);
  });

  // ── Boot ───────────────────────────────────────────────────
  initComponents();
})();
