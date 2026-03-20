/* ============================================================
   Visual Feedback — SelectionOverlay Component
   ============================================================ */

(function () {
  'use strict';

  class SelectionOverlay {
    constructor(shadowRoot, onSelect, onCancel) {
      this.shadowRoot = shadowRoot;
      this.onSelect = onSelect;
      this.onCancel = onCancel;
      this.active = false;
      this.mode = 'element'; // 'element' or 'area'

      // Element select state
      this.hoveredElement = null;

      // Area drag state
      this.isDragging = false;
      this.dragStart = null;

      // DOM elements
      this.overlay = null;
      this.highlight = null;
      this.selectionBox = null;
      this.toolbar = null;

      // Bound handlers
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onMouseDown = this._onMouseDown.bind(this);
      this._onMouseUp = this._onMouseUp.bind(this);
      this._onClick = this._onClick.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);

      this._buildUI();
    }

    _buildUI() {
      // Overlay
      this.overlay = document.createElement('div');
      this.overlay.className = 'vf-overlay';
      this.overlay.style.display = 'none';

      // Toolbar
      this.toolbar = document.createElement('div');
      this.toolbar.style.cssText = `
        position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
        z-index: 2147483647; display: flex; gap: 2px;
        background: #fff; border-radius: 8px; padding: 4px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12); border: 1px solid #e8e8e8;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      const btnStyle = (active) => `
        padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;
        border: none; cursor: pointer; transition: all 150ms ease;
        background: ${active ? '#5e6ad2' : 'transparent'};
        color: ${active ? '#fff' : '#6b6b6b'};
      `;

      this.elementBtn = document.createElement('button');
      this.elementBtn.textContent = 'Select Element';
      this.elementBtn.style.cssText = btnStyle(true);
      this.elementBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setMode('element');
      });

      this.areaBtn = document.createElement('button');
      this.areaBtn.textContent = 'Drag Area';
      this.areaBtn.style.cssText = btnStyle(false);
      this.areaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._setMode('area');
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;
        border: none; cursor: pointer; color: #e5534b; background: transparent;
        margin-left: 4px; transition: background 150ms ease;
      `;
      cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#fef2f2'; });
      cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = 'transparent'; });
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deactivate();
        this.onCancel();
      });

      this.toolbar.appendChild(this.elementBtn);
      this.toolbar.appendChild(this.areaBtn);
      this.toolbar.appendChild(cancelBtn);
      this.overlay.appendChild(this.toolbar);

      // Highlight box (for element mode)
      this.highlight = document.createElement('div');
      this.highlight.className = 'vf-highlight';
      this.highlight.style.display = 'none';

      // Selection box (for area mode)
      this.selectionBox = document.createElement('div');
      this.selectionBox.className = 'vf-selection-box';
      this.selectionBox.style.display = 'none';

      this.shadowRoot.appendChild(this.overlay);
      this.shadowRoot.appendChild(this.highlight);
      this.shadowRoot.appendChild(this.selectionBox);
    }

    _setMode(mode) {
      this.mode = mode;
      const activeStyle = 'padding:6px 14px;border-radius:6px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:all 150ms ease;';
      this.elementBtn.style.cssText = activeStyle + (mode === 'element' ? 'background:#5e6ad2;color:#fff;' : 'background:transparent;color:#6b6b6b;');
      this.areaBtn.style.cssText = activeStyle + (mode === 'area' ? 'background:#5e6ad2;color:#fff;' : 'background:transparent;color:#6b6b6b;');

      // Reset state
      this.highlight.style.display = 'none';
      this.selectionBox.style.display = 'none';
      this.hoveredElement = null;
      this.isDragging = false;
    }

    activate() {
      this.active = true;
      this.overlay.style.display = 'block';
      this.mode = 'element';
      this._setMode('element');

      document.addEventListener('mousemove', this._onMouseMove, true);
      document.addEventListener('mousedown', this._onMouseDown, true);
      document.addEventListener('mouseup', this._onMouseUp, true);
      document.addEventListener('click', this._onClick, true);
      document.addEventListener('keydown', this._onKeyDown, true);
    }

    deactivate() {
      this.active = false;
      this.overlay.style.display = 'none';
      this.highlight.style.display = 'none';
      this.selectionBox.style.display = 'none';
      this.hoveredElement = null;
      this.isDragging = false;

      document.removeEventListener('mousemove', this._onMouseMove, true);
      document.removeEventListener('mousedown', this._onMouseDown, true);
      document.removeEventListener('mouseup', this._onMouseUp, true);
      document.removeEventListener('click', this._onClick, true);
      document.removeEventListener('keydown', this._onKeyDown, true);
    }

    _onMouseMove(e) {
      if (!this.active) return;

      if (this.mode === 'element') {
        // Hide overlay temporarily to get element beneath
        this.overlay.style.pointerEvents = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        this.overlay.style.pointerEvents = '';

        if (el && el !== this.hoveredElement && el.id !== 'vf-root' && !el.closest('#vf-root')) {
          this.hoveredElement = el;
          const rect = el.getBoundingClientRect();
          this.highlight.style.display = 'block';
          this.highlight.style.top = rect.top + 'px';
          this.highlight.style.left = rect.left + 'px';
          this.highlight.style.width = rect.width + 'px';
          this.highlight.style.height = rect.height + 'px';
        }
      } else if (this.mode === 'area' && this.isDragging) {
        const x = Math.min(e.clientX, this.dragStart.x);
        const y = Math.min(e.clientY, this.dragStart.y);
        const w = Math.abs(e.clientX - this.dragStart.x);
        const h = Math.abs(e.clientY - this.dragStart.y);
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = x + 'px';
        this.selectionBox.style.top = y + 'px';
        this.selectionBox.style.width = w + 'px';
        this.selectionBox.style.height = h + 'px';
      }
    }

    _onMouseDown(e) {
      if (!this.active) return;

      // Ignore clicks on toolbar
      if (this.toolbar.contains(e.target) || this.overlay.contains(e.target) && e.target !== this.overlay) return;

      if (this.mode === 'area') {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
      }
    }

    _onMouseUp(e) {
      if (!this.active) return;

      if (this.mode === 'area' && this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        this.isDragging = false;

        const x = Math.min(e.clientX, this.dragStart.x);
        const y = Math.min(e.clientY, this.dragStart.y);
        const w = Math.abs(e.clientX - this.dragStart.x);
        const h = Math.abs(e.clientY - this.dragStart.y);

        if (w > 10 && h > 10) {
          const rect = { x, y, width: w, height: h };
          this.selectionBox.style.display = 'none';

          // Find the element at the center of the selection
          this.overlay.style.pointerEvents = 'none';
          const centerEl = document.elementFromPoint(x + w / 2, y + h / 2);
          this.overlay.style.pointerEvents = '';

          const selector = centerEl ? this._getSelector(centerEl) : 'body';
          this.deactivate();
          this.onSelect({ element: centerEl, selector, rect });
        } else {
          this.selectionBox.style.display = 'none';
        }
      }
    }

    _onClick(e) {
      if (!this.active) return;

      // Ignore toolbar clicks
      if (this.toolbar.contains(e.target)) return;

      if (this.mode === 'element' && this.hoveredElement) {
        e.preventDefault();
        e.stopPropagation();

        const el = this.hoveredElement;
        const rect = el.getBoundingClientRect();
        const selector = this._getSelector(el);

        this.deactivate();
        this.onSelect({
          element: el,
          selector,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }

    _onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.deactivate();
        this.onCancel();
      }
    }

    // ── Selector builder ─────────────────────────────────────

    _getSelector(el) {
      if (el.id) return `#${CSS.escape(el.id)}`;

      const parts = [];
      let current = el;

      while (current && current !== document.body && current !== document.documentElement) {
        let part = current.tagName.toLowerCase();

        if (current.id) {
          parts.unshift(`#${CSS.escape(current.id)}`);
          break;
        }

        if (current.className && typeof current.className === 'string') {
          const classes = current.className
            .trim()
            .split(/\s+/)
            .filter((c) => c && !c.startsWith('vf-'))
            .slice(0, 2)
            .map((c) => `.${CSS.escape(c)}`)
            .join('');
          if (classes) part += classes;
        }

        // nth-child for uniqueness
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            (s) => s.tagName === current.tagName
          );
          if (siblings.length > 1) {
            const idx = siblings.indexOf(current) + 1;
            part += `:nth-child(${idx})`;
          }
        }

        parts.unshift(part);
        current = current.parentElement;

        if (parts.length >= 4) break;
      }

      return parts.join(' > ') || 'body';
    }
  }

  window.VFSelectionOverlay = SelectionOverlay;
})();
