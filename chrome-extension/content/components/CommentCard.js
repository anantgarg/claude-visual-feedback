/* ============================================================
   Visual Feedback — CommentCard Component
   ============================================================ */

(function () {
  'use strict';

  class CommentCard {
    constructor(shadowRoot, onSubmit, onCancel) {
      this.shadowRoot = shadowRoot;
      this.onSubmit = onSubmit;
      this.onCancel = onCancel;
      this.card = null;
      this.selectionData = null;
      this.priority = 'medium';
      this.lastAuthor = '';

      this._loadLastAuthor();
      this._buildUI();
    }

    async _loadLastAuthor() {
      try {
        const result = await chrome.storage.local.get('lastAuthor');
        this.lastAuthor = result.lastAuthor || '';
        if (this.authorInput) this.authorInput.value = this.lastAuthor;
      } catch { /* ignore */ }
    }

    _buildUI() {
      this.card = document.createElement('div');
      this.card.style.cssText = `
        position: fixed; z-index: 2147483645; display: none;
        width: 340px; background: #fff; border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.16); border: 1px solid #e8e8e8;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: vf-slide-up 150ms ease; overflow: hidden;
      `;

      // Header with screenshot + selector
      this.header = document.createElement('div');
      this.header.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        padding: 12px 14px; border-bottom: 1px solid #e8e8e8;
        background: #f9f8f8;
      `;

      this.thumbnail = document.createElement('div');
      this.thumbnail.style.cssText = `
        width: 80px; height: 50px; border-radius: 4px; overflow: hidden;
        background: #f3f2f1; flex-shrink: 0; border: 1px solid #e8e8e8;
      `;

      this.thumbnailImg = document.createElement('img');
      this.thumbnailImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      this.thumbnail.appendChild(this.thumbnailImg);

      this.selectorText = document.createElement('div');
      this.selectorText.style.cssText = `
        font-size: 11px; color: #6b6b6b; font-family: 'SF Mono', Monaco, Consolas, monospace;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        max-width: 200px;
      `;

      this.header.appendChild(this.thumbnail);
      this.header.appendChild(this.selectorText);

      // Body
      const body = document.createElement('div');
      body.style.cssText = 'padding: 14px;';

      // Textarea
      this.textarea = document.createElement('textarea');
      this.textarea.placeholder = 'Leave feedback...';
      this.textarea.style.cssText = `
        width: 100%; min-height: 80px; border: 1px solid #e8e8e8;
        border-radius: 6px; padding: 10px; font-size: 13px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #171717; background: #fff; resize: vertical;
        transition: border-color 150ms ease; line-height: 1.5;
        outline: none;
      `;
      this.textarea.addEventListener('focus', () => {
        this.textarea.style.borderColor = '#5e6ad2';
      });
      this.textarea.addEventListener('blur', () => {
        this.textarea.style.borderColor = '#e8e8e8';
      });
      this.textarea.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          this._submit();
        }
      });

      // Priority selector
      const priorityRow = document.createElement('div');
      priorityRow.style.cssText = 'display:flex;gap:6px;margin-top:10px;align-items:center;';

      const priorityLabel = document.createElement('span');
      priorityLabel.textContent = 'Priority';
      priorityLabel.style.cssText = 'font-size:12px;color:#6b6b6b;margin-right:4px;';
      priorityRow.appendChild(priorityLabel);

      this.priorityButtons = {};
      const priorities = [
        { key: 'low', label: 'Low', color: '#6b6b6b', bg: '#f3f2f1' },
        { key: 'medium', label: 'Medium', color: '#f59e0b', bg: '#fef3c7' },
        { key: 'high', label: 'High', color: '#e5534b', bg: '#fef2f2' },
      ];

      priorities.forEach((p) => {
        const btn = document.createElement('button');
        btn.textContent = p.label;
        btn.dataset.priority = p.key;
        btn.style.cssText = `
          padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;
          border: 1px solid #e8e8e8; cursor: pointer; transition: all 150ms ease;
          background: ${p.key === 'medium' ? p.bg : '#fff'};
          color: ${p.key === 'medium' ? p.color : '#6b6b6b'};
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        btn.addEventListener('click', () => this._setPriority(p.key));
        priorityRow.appendChild(btn);
        this.priorityButtons[p.key] = { btn, color: p.color, bg: p.bg };
      });

      // Author input
      const authorRow = document.createElement('div');
      authorRow.style.cssText = 'margin-top: 10px;';

      this.authorInput = document.createElement('input');
      this.authorInput.type = 'text';
      this.authorInput.placeholder = 'Your name';
      this.authorInput.value = this.lastAuthor;
      this.authorInput.style.cssText = `
        width: 100%; padding: 7px 10px; border: 1px solid #e8e8e8;
        border-radius: 6px; font-size: 12px; color: #171717;
        background: #fff; transition: border-color 150ms ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        outline: none;
      `;
      this.authorInput.addEventListener('focus', () => {
        this.authorInput.style.borderColor = '#5e6ad2';
      });
      this.authorInput.addEventListener('blur', () => {
        this.authorInput.style.borderColor = '#e8e8e8';
      });

      authorRow.appendChild(this.authorInput);

      body.appendChild(this.textarea);
      body.appendChild(priorityRow);
      body.appendChild(authorRow);

      // Footer
      const footer = document.createElement('div');
      footer.style.cssText = `
        display: flex; justify-content: flex-end; gap: 8px;
        padding: 10px 14px; border-top: 1px solid #e8e8e8;
      `;

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 6px 14px; border-radius: 6px; font-size: 12px;
        font-weight: 500; color: #6b6b6b; background: transparent;
        cursor: pointer; border: none; transition: background 150ms ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#f3f2f1'; });
      cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = 'transparent'; });
      cancelBtn.addEventListener('click', () => this._cancel());

      const submitBtn = document.createElement('button');
      submitBtn.innerHTML = 'Submit <span style="font-size:10px;opacity:0.7;margin-left:4px;">&#8984;&#9166;</span>';
      submitBtn.style.cssText = `
        padding: 6px 16px; border-radius: 6px; font-size: 12px;
        font-weight: 500; color: #fff; background: #5e6ad2;
        cursor: pointer; border: none; transition: background 150ms ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      submitBtn.addEventListener('mouseenter', () => { submitBtn.style.background = '#4f5bc0'; });
      submitBtn.addEventListener('mouseleave', () => { submitBtn.style.background = '#5e6ad2'; });
      submitBtn.addEventListener('click', () => this._submit());

      footer.appendChild(cancelBtn);
      footer.appendChild(submitBtn);

      this.card.appendChild(this.header);
      this.card.appendChild(body);
      this.card.appendChild(footer);

      this.shadowRoot.appendChild(this.card);

      // Close on outside click
      this._outsideClickHandler = (e) => {
        if (this.card.style.display !== 'none' && !this.card.contains(e.target)) {
          // Don't close immediately — allow some slack
        }
      };
    }

    _setPriority(key) {
      this.priority = key;
      Object.entries(this.priorityButtons).forEach(([k, v]) => {
        if (k === key) {
          v.btn.style.background = v.bg;
          v.btn.style.color = v.color;
          v.btn.style.borderColor = v.color;
        } else {
          v.btn.style.background = '#fff';
          v.btn.style.color = '#6b6b6b';
          v.btn.style.borderColor = '#e8e8e8';
        }
      });
    }

    _submit() {
      const comment = this.textarea.value.trim();
      if (!comment) {
        this.textarea.style.borderColor = '#e5534b';
        this.textarea.focus();
        return;
      }

      const author = this.authorInput.value.trim() || 'Anonymous';

      this.onSubmit({
        comment,
        priority: this.priority,
        author,
      });
    }

    _cancel() {
      this.hide();
      this.onCancel();
    }

    show(selectionData) {
      this.selectionData = selectionData;

      // Set thumbnail
      if (selectionData.screenshotDataUrl) {
        this.thumbnailImg.src = selectionData.screenshotDataUrl;
        this.thumbnail.style.display = 'block';
      } else {
        this.thumbnail.style.display = 'none';
      }

      // Set selector text
      this.selectorText.textContent = selectionData.selector || '';

      // Reset form
      this.textarea.value = '';
      this.priority = 'medium';
      this._setPriority('medium');

      // Position: near the selected element but within viewport
      const rect = selectionData.rect;
      let top = rect.y + rect.height + 12;
      let left = rect.x;

      // Keep within viewport
      if (top + 320 > window.innerHeight) {
        top = Math.max(10, rect.y - 320 - 12);
      }
      if (left + 340 > window.innerWidth) {
        left = window.innerWidth - 350;
      }
      if (left < 10) left = 10;
      if (top < 10) top = 10;

      this.card.style.top = top + 'px';
      this.card.style.left = left + 'px';
      this.card.style.display = 'block';

      // Focus textarea
      setTimeout(() => this.textarea.focus(), 100);
    }

    hide() {
      this.card.style.display = 'none';
      this.selectionData = null;
    }
  }

  window.VFCommentCard = CommentCard;
})();
