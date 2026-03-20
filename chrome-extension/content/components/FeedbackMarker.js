/* ============================================================
   Visual Feedback — FeedbackMarker Component
   ============================================================ */

(function () {
  'use strict';

  class FeedbackMarker {
    constructor(shadowRoot, onMarkerClick) {
      this.shadowRoot = shadowRoot;
      this.onMarkerClick = onMarkerClick;
      this.markers = [];
      this.markerContainer = null;

      this._buildContainer();
      this._handleResize = this._handleResize.bind(this);
      window.addEventListener('resize', this._handleResize);
      window.addEventListener('scroll', this._handleResize);
    }

    _buildContainer() {
      this.markerContainer = document.createElement('div');
      this.markerContainer.id = 'vf-markers';
      this.markerContainer.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483630;';
      this.shadowRoot.appendChild(this.markerContainer);
    }

    _getStatusClass(status) {
      switch (status) {
        case 'in-progress':
          return 'vf-marker--in-progress';
        case 'resolved':
          return 'vf-marker--resolved';
        default:
          return 'vf-marker--open';
      }
    }

    _getStatusColor(status) {
      switch (status) {
        case 'in-progress':
          return '#f59e0b';
        case 'resolved':
          return '#2da44e';
        default:
          return '#5e6ad2';
      }
    }

    _computePosition(item) {
      // Try to find the element on the page
      let x = 0;
      let y = 0;

      if (item.selector) {
        try {
          const el = document.querySelector(item.selector);
          if (el) {
            const rect = el.getBoundingClientRect();
            x = rect.left + window.scrollX;
            y = rect.top + window.scrollY;
            return { x, y };
          }
        } catch { /* ignore bad selectors */ }
      }

      // Fallback to stored position, adjusting for viewport changes
      if (item.position) {
        const scaleX = item.position.viewportWidth
          ? window.innerWidth / item.position.viewportWidth
          : 1;
        const scaleY = item.position.viewportHeight
          ? window.innerHeight / item.position.viewportHeight
          : 1;
        x = (item.position.x || 0) * scaleX;
        y = (item.position.y || 0) * scaleY;
      }

      return { x, y };
    }

    renderMarkers(feedbackItems) {
      // Clear existing
      this.markerContainer.innerHTML = '';
      this.markers = [];

      feedbackItems.forEach((item, index) => {
        const pos = this._computePosition(item);

        const marker = document.createElement('div');
        marker.className = `vf-marker ${this._getStatusClass(item.status)}`;
        marker.style.cssText = `
          position: absolute;
          left: ${pos.x - 12}px;
          top: ${pos.y - 12}px;
          width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 11px; font-weight: 600; color: #fff;
          cursor: pointer; pointer-events: auto;
          background: ${this._getStatusColor(item.status)};
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: transform 150ms ease, box-shadow 150ms ease;
          animation: vf-marker-enter 300ms ease forwards;
          user-select: none; z-index: 2147483630;
        `;
        marker.textContent = String(index + 1);

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
          position: absolute; bottom: calc(100% + 8px); left: 50%;
          transform: translateX(-50%); background: #171717; color: #fff;
          padding: 6px 10px; border-radius: 6px; font-size: 12px;
          line-height: 1.4; white-space: nowrap; max-width: 240px;
          overflow: hidden; text-overflow: ellipsis; pointer-events: none;
          opacity: 0; transition: opacity 150ms ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        tooltip.textContent = item.comment || 'No comment';
        marker.appendChild(tooltip);

        marker.addEventListener('mouseenter', () => {
          marker.style.transform = 'scale(1.2)';
          marker.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
          tooltip.style.opacity = '1';
        });
        marker.addEventListener('mouseleave', () => {
          marker.style.transform = 'scale(1)';
          marker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          tooltip.style.opacity = '0';
        });
        marker.addEventListener('click', () => {
          this.onMarkerClick(item);
        });

        this.markerContainer.appendChild(marker);
        this.markers.push({ el: marker, item });
      });
    }

    updateMarker(id, status) {
      const entry = this.markers.find((m) => m.item.id === id);
      if (entry) {
        entry.item.status = status;
        entry.el.style.background = this._getStatusColor(status);
      }
    }

    _handleResize() {
      // Re-position all markers
      this.markers.forEach(({ el, item }) => {
        const pos = this._computePosition(item);
        el.style.left = (pos.x - 12) + 'px';
        el.style.top = (pos.y - 12) + 'px';
      });
    }

    destroy() {
      window.removeEventListener('resize', this._handleResize);
      window.removeEventListener('scroll', this._handleResize);
      this.markerContainer.remove();
    }
  }

  window.VFFeedbackMarker = FeedbackMarker;
})();
