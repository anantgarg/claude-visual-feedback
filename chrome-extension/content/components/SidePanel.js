/* ============================================================
   Visual Feedback — SidePanel Component
   ============================================================ */

(function () {
  'use strict';

  class SidePanel {
    constructor(shadowRoot, callbacks) {
      this.shadowRoot = shadowRoot;
      this.callbacks = callbacks;
      this.isOpen = false;
      this.feedbackItems = [];
      this.filter = 'all'; // all | open | in-progress | resolved
      this.pageFilter = 'this'; // 'this' | 'all'

      this._buildUI();
    }

    _timeAgo(dateStr) {
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

    _getStatusColor(status) {
      switch (status) {
        case 'in-progress': return '#f59e0b';
        case 'resolved': return '#2da44e';
        default: return '#5e6ad2';
      }
    }

    _buildUI() {
      // Overlay behind panel
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.15); z-index: 2147483642;
        display: none; opacity: 0; transition: opacity 200ms ease;
      `;
      this.overlay.addEventListener('click', () => this.close());

      // Panel
      this.panel = document.createElement('div');
      this.panel.style.cssText = `
        position: fixed; top: 0; right: 0; width: 380px; height: 100vh;
        background: #fff; z-index: 2147483643;
        box-shadow: -4px 0 24px rgba(0,0,0,0.1);
        transform: translateX(100%); transition: transform 250ms ease;
        display: flex; flex-direction: column;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      // ── Header ─────────────────────────────────────────────
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; border-bottom: 1px solid #e8e8e8;
        flex-shrink: 0;
      `;

      const title = document.createElement('div');
      title.style.cssText = 'font-size:16px;font-weight:600;color:#171717;';
      title.textContent = 'Feedback';

      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = `
        width: 28px; height: 28px; border-radius: 6px; border: none;
        background: transparent; cursor: pointer; display: flex;
        align-items: center; justify-content: center; color: #6b6b6b;
        transition: background 150ms ease;
      `;
      closeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `;
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = '#f3f2f1'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
      closeBtn.addEventListener('click', () => this.close());

      header.appendChild(title);
      header.appendChild(closeBtn);

      // ── Filter tabs ────────────────────────────────────────
      const filterBar = document.createElement('div');
      filterBar.style.cssText = `
        display: flex; gap: 0; padding: 0 20px;
        border-bottom: 1px solid #e8e8e8; flex-shrink: 0;
      `;

      this.filterTabs = {};
      const filters = [
        { key: 'all', label: 'All' },
        { key: 'open', label: 'Open' },
        { key: 'in-progress', label: 'In Progress' },
        { key: 'resolved', label: 'Resolved' },
      ];

      filters.forEach((f) => {
        const tab = document.createElement('button');
        tab.textContent = f.label;
        tab.style.cssText = `
          padding: 10px 14px; font-size: 12px; font-weight: 500;
          border: none; background: none; cursor: pointer;
          color: ${f.key === 'all' ? '#171717' : '#6b6b6b'};
          border-bottom: 2px solid ${f.key === 'all' ? '#5e6ad2' : 'transparent'};
          transition: all 150ms ease;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        tab.addEventListener('click', () => this._setFilter(f.key));
        tab.addEventListener('mouseenter', () => {
          if (this.filter !== f.key) tab.style.color = '#171717';
        });
        tab.addEventListener('mouseleave', () => {
          if (this.filter !== f.key) tab.style.color = '#6b6b6b';
        });
        filterBar.appendChild(tab);
        this.filterTabs[f.key] = tab;
      });

      // ── Status bar ─────────────────────────────────────────
      this.statusBar = document.createElement('div');
      this.statusBar.style.cssText = `
        display: flex; gap: 8px; padding: 12px 20px;
        border-bottom: 1px solid #e8e8e8; flex-shrink: 0;
        flex-wrap: wrap; align-items: center;
      `;

      // ── Page toggle ────────────────────────────────────────
      const toggleRow = document.createElement('div');
      toggleRow.style.cssText = `
        display: flex; gap: 2px; padding: 8px 20px;
        border-bottom: 1px solid #e8e8e8; flex-shrink: 0;
        background: #f9f8f8;
      `;

      this.pageToggleBtns = {};
      ['this', 'all'].forEach((key) => {
        const btn = document.createElement('button');
        btn.textContent = key === 'this' ? 'This page' : 'All pages';
        btn.style.cssText = `
          padding: 5px 12px; border-radius: 6px; font-size: 11px;
          font-weight: 500; border: none; cursor: pointer;
          transition: all 150ms ease;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: ${key === 'this' ? '#fff' : 'transparent'};
          color: ${key === 'this' ? '#171717' : '#6b6b6b'};
          box-shadow: ${key === 'this' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
        `;
        btn.addEventListener('click', () => this._setPageFilter(key));
        toggleRow.appendChild(btn);
        this.pageToggleBtns[key] = btn;
      });

      // ── Feedback list ──────────────────────────────────────
      this.list = document.createElement('div');
      this.list.style.cssText = `
        flex: 1; overflow-y: auto; padding: 8px 0;
      `;

      // ── Empty state ────────────────────────────────────────
      this.emptyState = document.createElement('div');
      this.emptyState.style.cssText = `
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 60px 20px; color: #9b9b9b;
        font-size: 13px; text-align: center;
      `;
      this.emptyState.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" stroke-width="1.5" style="margin-bottom:12px;">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        No feedback yet
      `;

      this.list.appendChild(this.emptyState);

      // Assemble panel
      this.panel.appendChild(header);
      this.panel.appendChild(filterBar);
      this.panel.appendChild(this.statusBar);
      this.panel.appendChild(toggleRow);
      this.panel.appendChild(this.list);

      this.shadowRoot.appendChild(this.overlay);
      this.shadowRoot.appendChild(this.panel);
    }

    _setFilter(key) {
      this.filter = key;
      Object.entries(this.filterTabs).forEach(([k, tab]) => {
        tab.style.color = k === key ? '#171717' : '#6b6b6b';
        tab.style.borderBottom = k === key ? '2px solid #5e6ad2' : '2px solid transparent';
      });
      this._renderList();
    }

    _setPageFilter(key) {
      this.pageFilter = key;
      Object.entries(this.pageToggleBtns).forEach(([k, btn]) => {
        btn.style.background = k === key ? '#fff' : 'transparent';
        btn.style.color = k === key ? '#171717' : '#6b6b6b';
        btn.style.boxShadow = k === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none';
      });
      this._renderList();
    }

    _getFilteredItems() {
      let items = [...this.feedbackItems];

      if (this.pageFilter === 'this') {
        items = items.filter((f) => f.url === window.location.href);
      }

      if (this.filter !== 'all') {
        items = items.filter((f) => f.status === this.filter);
      }

      return items;
    }

    _renderStatusBar() {
      this.statusBar.innerHTML = '';
      const items = this.pageFilter === 'this'
        ? this.feedbackItems.filter((f) => f.url === window.location.href)
        : this.feedbackItems;

      const counts = {
        open: items.filter((f) => f.status === 'open').length,
        'in-progress': items.filter((f) => f.status === 'in-progress').length,
        resolved: items.filter((f) => f.status === 'resolved').length,
      };

      const pills = [
        { key: 'open', label: 'Open', color: '#5e6ad2', bg: '#e8e9f8' },
        { key: 'in-progress', label: 'In Progress', color: '#f59e0b', bg: '#fef3c7' },
        { key: 'resolved', label: 'Resolved', color: '#2da44e', bg: '#dafbe1' },
      ];

      pills.forEach((p) => {
        const pill = document.createElement('span');
        pill.style.cssText = `
          padding: 3px 10px; border-radius: 12px; font-size: 11px;
          font-weight: 500; color: ${p.color}; background: ${p.bg};
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        pill.textContent = `${counts[p.key]} ${p.label}`;
        this.statusBar.appendChild(pill);
      });
    }

    _renderList() {
      const items = this._getFilteredItems();
      this.list.innerHTML = '';

      if (items.length === 0) {
        this.list.appendChild(this.emptyState);
        return;
      }

      items.forEach((item) => {
        const card = document.createElement('div');
        card.dataset.id = item.id;
        card.style.cssText = `
          display: flex; gap: 12px; padding: 12px 20px;
          cursor: pointer; transition: background 150ms ease;
          border-bottom: 1px solid #f3f2f1;
        `;
        card.addEventListener('mouseenter', () => { card.style.background = '#f9f8f8'; });
        card.addEventListener('mouseleave', () => { card.style.background = 'transparent'; });
        card.addEventListener('click', () => this.callbacks.onFeedbackClick(item));

        // Status dot
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
          margin-top: 5px; background: ${this._getStatusColor(item.status)};
        `;

        // Content
        const content = document.createElement('div');
        content.style.cssText = 'flex:1;min-width:0;';

        // Comment text
        const commentEl = document.createElement('div');
        commentEl.style.cssText = `
          font-size: 13px; color: #171717; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        `;
        commentEl.textContent = item.comment || '';

        // URL
        const urlEl = document.createElement('div');
        urlEl.style.cssText = `
          font-size: 11px; color: #9b9b9b; margin-top: 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        `;
        try {
          const u = new URL(item.url || '');
          urlEl.textContent = u.pathname;
        } catch {
          urlEl.textContent = item.url || '';
        }

        // Meta row
        const metaRow = document.createElement('div');
        metaRow.style.cssText = `
          display: flex; align-items: center; gap: 8px;
          margin-top: 4px; font-size: 11px; color: #9b9b9b;
        `;

        const timeEl = document.createElement('span');
        timeEl.textContent = item.timestamp ? this._timeAgo(item.timestamp) : '';

        const replyCount = document.createElement('span');
        const replies = item.replies ? item.replies.length : 0;
        if (replies > 0) {
          replyCount.textContent = `${replies} repl${replies === 1 ? 'y' : 'ies'}`;
        }

        metaRow.appendChild(timeEl);
        if (replies > 0) metaRow.appendChild(replyCount);

        content.appendChild(commentEl);
        content.appendChild(urlEl);
        content.appendChild(metaRow);

        card.appendChild(dot);
        card.appendChild(content);

        // Thumbnail
        if (item.screenshot) {
          const thumb = document.createElement('div');
          thumb.style.cssText = `
            width: 60px; height: 40px; border-radius: 4px;
            overflow: hidden; flex-shrink: 0; background: #f3f2f1;
            border: 1px solid #e8e8e8;
          `;
          const img = document.createElement('img');
          img.src = item.screenshot;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          thumb.appendChild(img);
          card.appendChild(thumb);
        }

        this.list.appendChild(card);
      });
    }

    _getStatusColor(status) {
      switch (status) {
        case 'in-progress': return '#f59e0b';
        case 'resolved': return '#2da44e';
        default: return '#5e6ad2';
      }
    }

    // ── Public API ───────────────────────────────────────────

    open() {
      this.isOpen = true;
      this.overlay.style.display = 'block';
      requestAnimationFrame(() => {
        this.overlay.style.opacity = '1';
        this.panel.style.transform = 'translateX(0)';
      });
      this._renderStatusBar();
      this._renderList();
    }

    close() {
      this.isOpen = false;
      this.overlay.style.opacity = '0';
      this.panel.style.transform = 'translateX(100%)';
      setTimeout(() => {
        this.overlay.style.display = 'none';
      }, 250);
      this.callbacks.onClose();
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    update(feedbackItems) {
      this.feedbackItems = feedbackItems;
      if (this.isOpen) {
        this._renderStatusBar();
        this._renderList();
      }
    }

    scrollToItem(id) {
      const card = this.list.querySelector(`[data-id="${id}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.background = '#e8e9f8';
        setTimeout(() => { card.style.background = ''; }, 1500);
      }
    }

    destroy() {
      this.overlay.remove();
      this.panel.remove();
    }
  }

  window.VFSidePanel = SidePanel;
})();
