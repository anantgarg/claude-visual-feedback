/* ============================================================
   Visual Feedback — FloatingButton Component
   ============================================================ */

(function () {
  'use strict';

  class FloatingButton {
    constructor(shadowRoot, callbacks) {
      this.shadowRoot = shadowRoot;
      this.callbacks = callbacks;
      this.menuOpen = false;
      this.connected = false;
      this.badgeCount = 0;
      this.isActive = false;

      // Drag state
      this.isDragging = false;
      this.dragOffset = { x: 0, y: 0 };
      this.hasMoved = false;

      this._buildUI();
      this._setupDrag();
    }

    _buildUI() {
      // Floating button
      this.btn = document.createElement('button');
      this.btn.className = 'vf-floating-btn';
      this.btn.style.cssText = `
        position: fixed; bottom: 24px; right: 24px;
        width: 56px; height: 56px; border-radius: 50%;
        background: #5e6ad2; color: #fff; border: none;
        cursor: pointer; z-index: 2147483644;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px rgba(94,106,210,0.4);
        transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
        user-select: none;
      `;

      // Crosshair/target icon
      this.btn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="22" y1="12" x2="18" y2="12"/>
          <line x1="6" y1="12" x2="2" y2="12"/>
          <line x1="12" y1="6" x2="12" y2="2"/>
          <line x1="12" y1="22" x2="12" y2="18"/>
        </svg>
      `;

      // Badge
      this.badge = document.createElement('div');
      this.badge.style.cssText = `
        position: absolute; top: -4px; right: -4px;
        min-width: 20px; height: 20px; border-radius: 10px;
        background: #e5534b; color: #fff; font-size: 11px;
        font-weight: 600; display: none; align-items: center;
        justify-content: center; padding: 0 5px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      this.btn.appendChild(this.badge);

      this.btn.addEventListener('mouseenter', () => {
        if (!this.isDragging) {
          this.btn.style.background = '#4f5bc0';
          this.btn.style.transform = 'scale(1.05)';
          this.btn.style.boxShadow = '0 6px 20px rgba(94,106,210,0.5)';
        }
      });
      this.btn.addEventListener('mouseleave', () => {
        if (!this.isDragging) {
          this.btn.style.background = this.isActive ? '#4f5bc0' : '#5e6ad2';
          this.btn.style.transform = 'scale(1)';
          this.btn.style.boxShadow = '0 4px 16px rgba(94,106,210,0.4)';
        }
      });
      this.btn.addEventListener('click', (e) => {
        if (this.hasMoved) {
          this.hasMoved = false;
          return;
        }
        e.stopPropagation();
        this.toggleMenu();
      });

      // Menu
      this.menu = document.createElement('div');
      this.menu.style.cssText = `
        position: fixed; bottom: 88px; right: 24px;
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16);
        border: 1px solid #e8e8e8; padding: 6px;
        z-index: 2147483645; min-width: 220px;
        display: none;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? '\u2318' : 'Ctrl';

      // New Feedback item
      const newFeedbackItem = this._createMenuItem(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>`,
        'New Feedback',
        `${modKey}+Shift+F`
      );
      newFeedbackItem.addEventListener('click', () => {
        this.closeMenu();
        this.callbacks.onNewFeedback();
      });

      // View All item
      const viewAllItem = this._createMenuItem(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>`,
        'View All',
        `${modKey}+Shift+L`
      );
      viewAllItem.addEventListener('click', () => {
        this.closeMenu();
        this.callbacks.onTogglePanel();
      });

      // Divider
      const divider = document.createElement('div');
      divider.style.cssText = 'height:1px;background:#e8e8e8;margin:4px 0;';

      // Status row
      this.statusRow = document.createElement('div');
      this.statusRow.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 8px 12px; font-size: 12px; color: #6b6b6b;
      `;

      this.statusDot = document.createElement('div');
      this.statusDot.style.cssText = `
        width: 8px; height: 8px; border-radius: 50%;
        background: #e5534b; flex-shrink: 0;
      `;

      this.statusText = document.createElement('span');
      this.statusText.textContent = 'Not connected';

      this.statusRow.appendChild(this.statusDot);
      this.statusRow.appendChild(this.statusText);

      this.menu.appendChild(newFeedbackItem);
      this.menu.appendChild(viewAllItem);
      this.menu.appendChild(divider);
      this.menu.appendChild(this.statusRow);

      // Outside click handler
      this._outsideClick = (e) => {
        if (this.menuOpen && !this.menu.contains(e.target) && !this.btn.contains(e.target)) {
          this.closeMenu();
        }
      };
      document.addEventListener('click', this._outsideClick, true);

      this.shadowRoot.appendChild(this.btn);
      this.shadowRoot.appendChild(this.menu);
    }

    _createMenuItem(iconSvg, label, shortcut) {
      const item = document.createElement('button');
      item.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 10px 12px; border-radius: 8px;
        font-size: 13px; color: #171717; background: none;
        border: none; cursor: pointer; transition: background 150ms ease;
        font-family: inherit; text-align: left;
      `;

      const iconSpan = document.createElement('span');
      iconSpan.innerHTML = iconSvg;
      iconSpan.style.cssText = 'display:flex;align-items:center;flex-shrink:0;';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = label;

      const kbdSpan = document.createElement('span');
      kbdSpan.textContent = shortcut;
      kbdSpan.style.cssText = 'margin-left:auto;font-size:11px;color:#9b9b9b;';

      item.appendChild(iconSpan);
      item.appendChild(labelSpan);
      item.appendChild(kbdSpan);

      item.addEventListener('mouseenter', () => { item.style.background = '#f3f2f1'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'none'; });

      return item;
    }

    _setupDrag() {
      let startX, startY;

      this.btn.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.hasMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.btn.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
      });

      document.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;

        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx < 5 && dy < 5) return; // threshold
        this.hasMoved = true;

        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;

        this.btn.style.right = 'auto';
        this.btn.style.bottom = 'auto';
        this.btn.style.left = Math.max(0, Math.min(window.innerWidth - 56, x)) + 'px';
        this.btn.style.top = Math.max(0, Math.min(window.innerHeight - 56, y)) + 'px';

        // Update menu position
        const btnRect = this.btn.getBoundingClientRect();
        this.menu.style.right = 'auto';
        this.menu.style.bottom = 'auto';
        this.menu.style.left = btnRect.left + 'px';
        this.menu.style.top = (btnRect.top - 8) + 'px';
        this.menu.style.transform = 'translateY(-100%)';
      });

      document.addEventListener('mouseup', () => {
        this.isDragging = false;
      });
    }

    toggleMenu() {
      if (this.menuOpen) {
        this.closeMenu();
      } else {
        this.openMenu();
      }
    }

    openMenu() {
      this.menuOpen = true;
      this.menu.style.display = 'block';
      this.menu.style.animation = 'vf-slide-up 150ms ease forwards';

      // Position menu above the button
      const btnRect = this.btn.getBoundingClientRect();
      this.menu.style.bottom = (window.innerHeight - btnRect.top + 8) + 'px';
      this.menu.style.right = (window.innerWidth - btnRect.right) + 'px';
      this.menu.style.left = 'auto';
      this.menu.style.top = 'auto';
      this.menu.style.transform = 'none';
    }

    closeMenu() {
      this.menuOpen = false;
      this.menu.style.display = 'none';
    }

    setActive(active) {
      this.isActive = active;
      this.btn.style.background = active ? '#4f5bc0' : '#5e6ad2';
    }

    setConnected(connected) {
      this.connected = connected;
      this.statusDot.style.background = connected ? '#2da44e' : '#e5534b';
      this.statusText.textContent = connected ? 'Connected' : 'Not connected';
    }

    updateBadge(count) {
      this.badgeCount = count;
      if (count > 0) {
        this.badge.textContent = String(count);
        this.badge.style.display = 'flex';
        // Add pulse
        this.btn.style.animation = 'vf-pulse 2s infinite';
      } else {
        this.badge.style.display = 'none';
        this.btn.style.animation = 'none';
      }
    }

    destroy() {
      document.removeEventListener('click', this._outsideClick, true);
      this.btn.remove();
      this.menu.remove();
    }
  }

  window.VFFloatingButton = FloatingButton;
})();
