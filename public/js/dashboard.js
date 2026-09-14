// =============================================================
// OWNER & KITCHEN POS LIVE DASHBOARD CONTROLLER — COFFEE CULTURE
// (Works with unified sidebar panel layout — live KDS & QR Hub)
// =============================================================

class DashboardApp {
  constructor() {
    this.ws = null;
    this.orders = [];
    this.menu = [];
    this.tables = [];
    this.serviceRequests = [];
    this._ready = true; // Enabled for seamless access
    this.isAdminRoute = window.location.pathname === '/admin';

    if (this.isAdminRoute && window.appRouter?.ownerAuthenticated) {
      this.connectWebSocket();
    }
    this.setupFormListeners();
    this.startTimerTicker();
    this.loadOfflineOrdersIntoDashboard();
  }

  onPanelReady() {
    this._ready = true;
    this.loadOfflineOrdersIntoDashboard();
    this.renderAll();
  }

  loadOfflineOrdersIntoDashboard() {
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('coffee_culture_offline_queue') || '[]');
      if (offlineQueue.length > 0) {
        offlineQueue.forEach(offOrd => {
          if (!this.orders.find(o => o.id === offOrd.id)) {
            this.orders.unshift(offOrd);
          }
        });
      }
    } catch (e) {}
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    try {
      this.ws = new WebSocket(`${protocol}//${window.location.host}`);

      this.ws.onopen = () => console.log('☕ Dashboard WS connected');

      this.ws.onmessage = (event) => {
        try { this.handleWsEvent(JSON.parse(event.data)); }
        catch (e) { console.error('WS parse error:', e); }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.connectWebSocket(), 4000);
      };
    } catch (e) {}
  }

  handleWsEvent(data) {
    switch (data.type) {
      case 'INIT_SYNC':
        this.orders  = data.orders  || [];
        this.menu    = data.menu    || [];
        this.tables  = data.tables  || [];
        this.serviceRequests = data.serviceRequests || [];
        this.loadOfflineOrdersIntoDashboard();
        this.renderAll();
        break;

      case 'NEW_ORDER':
        this.orders.unshift(data.order);
        if (data.tables) this.tables = data.tables;
        this.renderAll();
        window.soundEngine?.playNewOrderChime();
        this.showToast(`🔔 New order from ${data.order.tableName} — ${data.order.orderNumber}`);
        this.updateKitchenBadge();
        break;

      case 'ORDER_STATUS_CHANGED':
        const idx = this.orders.findIndex(o => o.id === data.order.id);
        if (idx !== -1) this.orders[idx] = data.order;
        if (data.tables) this.tables = data.tables;
        this.renderAll();
        break;

      case 'NEW_SERVICE_REQUEST':
        this.serviceRequests.unshift(data.serviceRequest);
        this.renderServiceAlerts();
        this.renderStats();
        window.soundEngine?.playServiceAlert();
        break;

      case 'SERVICE_REQUEST_RESOLVED':
        const sIdx = this.serviceRequests.findIndex(r => r.id === data.requestId);
        if (sIdx !== -1) this.serviceRequests[sIdx].resolved = true;
        this.renderServiceAlerts();
        this.renderStats();
        break;

      case 'MENU_UPDATED':
        this.menu = data.menu || [];
        this.renderMenuManager();
        break;

      case 'MENU_ITEM_UPDATED':
        const mIdx = this.menu.findIndex(i => i.id === data.item.id);
        if (mIdx !== -1) this.menu[mIdx] = data.item;
        this.renderMenuManager();
        break;
    }
  }

  setupFormListeners() {
    document.getElementById('form-add-dish')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addNewDishFromForm();
    });
  }

  startTimerTicker() {
    setInterval(() => {
      document.querySelectorAll('.ticket-timer[data-timestamp]').forEach(el => {
        el.textContent = '⏱️ ' + this.relTime(el.dataset.timestamp);
      });
    }, 15000);
  }

  renderAll() {
    this.renderStats();
    this.renderServiceAlerts();
    this.renderKanbanBoard();
    this.renderMenuManager();
    this.renderRecentOrders();
    this.updateKitchenBadge();
  }

  // ── Stats ──────────────────────────────────────────────────
  renderStats() {
    const activeOrders   = this.orders.filter(o => o.status === 'pending' || o.status === 'preparing');
    const readyOrders    = this.orders.filter(o => o.status === 'ready');
    const pendingAlerts  = this.serviceRequests.filter(r => !r.resolved).length;
    const totalRev       = this.orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0);
    const activeTables   = new Set(
      this.orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(o => o.tableId)
    ).size;

    this.setText('stat-total-revenue',  '₹' + Math.round(totalRev));
    this.setText('stat-active-orders',  activeOrders.length);
    this.setText('stat-ready-orders',   readyOrders.length);
    this.setText('stat-active-tables',  activeTables);
    this.setText('stat-total-orders',   this.orders.length);
    this.setText('stat-pending-alerts', pendingAlerts);
  }

  updateKitchenBadge() {
    const pending = this.orders.filter(o => o.status === 'pending').length;
    const badge = document.getElementById('sidebar-badge-kitchen');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
  }

  // ── Service Alerts ─────────────────────────────────────────
  renderServiceAlerts() {
    const banner = document.getElementById('dash-service-alerts');
    if (!banner) return;
    const pending = this.serviceRequests.filter(r => !r.resolved);
    if (!pending.length) { banner.innerHTML = ''; return; }

    banner.innerHTML = pending.map(req => `
      <div class="service-alert-item">
        <div class="alert-text">
          <span>🚨</span>
          <strong>${req.tableName}:</strong> ${req.message}
          <span style="font-size:0.75rem;color:var(--text-dim);">(${this.relTime(req.timestamp)})</span>
        </div>
        <button class="resolve-btn" onclick="dashboardApp.resolveRequest('${req.id}')">✓ Attended</button>
      </div>
    `).join('');
  }

  resolveRequest(id) {
    this.ws?.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify({ type: 'RESOLVE_SERVICE', requestId: id }));
  }

  // ── Kanban KDS Board ───────────────────────────────────────
  renderKanbanBoard() {
    const cols = { pending: [], preparing: [], ready: [], completed: [] };
    this.orders.forEach(o => {
      if (o.status === 'cancelled' || o.status === 'completed') cols.completed.push(o);
      else if (cols[o.status]) cols[o.status].push(o);
    });

    this.setInnerHTML('count-pending',    cols.pending.length);
    this.setInnerHTML('count-preparing',  cols.preparing.length);
    this.setInnerHTML('count-ready',      cols.ready.length);
    this.setInnerHTML('count-completed',  Math.min(cols.completed.length, 8));

    this.setInnerHTML('kanban-pending-list',   cols.pending.map(o => this.renderTicket(o)).join(''));
    this.setInnerHTML('kanban-preparing-list', cols.preparing.map(o => this.renderTicket(o)).join(''));
    this.setInnerHTML('kanban-ready-list',     cols.ready.map(o => this.renderTicket(o)).join(''));
    this.setInnerHTML('kanban-completed-list', cols.completed.slice(0, 8).map(o => this.renderTicket(o)).join(''));
  }

  renderTicket(order) {
    const isOffline = order.isOffline || order.id.startsWith('off-');
    return `
      <div class="order-ticket status-${order.status} ${isOffline ? 'ticket-offline-queued' : ''}">
        <div class="ticket-header">
          <span class="ticket-table-badge">🍽️ ${order.tableName}</span>
          ${isOffline ? '<span style="font-size:0.72rem;background:#f59e0b;color:#000;padding:2px 6px;border-radius:4px;font-weight:700;">⚡ Offline Order</span>' : ''}
          <span class="ticket-timer" data-timestamp="${order.createdAt}">⏱️ ${this.relTime(order.createdAt)}</span>
        </div>
        <div class="ticket-customer"><strong>${order.orderNumber}</strong> · ${order.customerName}</div>
        <div class="ticket-items-list">
          ${order.items.map(item => `
            <div class="ticket-item-line">
              <span class="ticket-item-qty">${item.quantity}×</span>
              <span class="ticket-item-name">${item.name}</span>
              ${item.selectedAddons?.length ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-left:18px;">+ ${item.selectedAddons.map(a=>a.name).join(', ')}</div>` : ''}
              ${item.notes ? `<span class="ticket-item-note">Note: "${item.notes}"</span>` : ''}
            </div>
          `).join('')}
        </div>
        ${order.specialInstructions ? `<div class="ticket-instructions">⚠️ <strong>Request:</strong> ${order.specialInstructions}</div>` : ''}
        <div class="ticket-total-row">
          <span style="color:var(--text-muted);font-size:0.8rem;">Bill Total</span>
          <span style="color:var(--primary);font-size:1.05rem;font-weight:800;">₹${Math.round(order.total)}</span>
        </div>
        <div class="ticket-actions">${this.renderTicketBtns(order)}</div>
      </div>
    `;
  }

  renderTicketBtns(order) {
    if (order.status === 'pending') return `
      <button class="ticket-btn btn-start"  onclick="dashboardApp.setStatus('${order.id}','preparing')">👨‍🍳 Start Crafting</button>
      <button class="ticket-btn btn-cancel" onclick="dashboardApp.setStatus('${order.id}','cancelled')">Reject</button>
    `;
    if (order.status === 'preparing') return `
      <button class="ticket-btn btn-ready" onclick="dashboardApp.setStatus('${order.id}','ready')">🔔 Mark Ready & Plated</button>
    `;
    if (order.status === 'ready') return `
      <button class="ticket-btn btn-complete" onclick="dashboardApp.setStatus('${order.id}','completed')">✅ Settle & Served</button>
    `;
    return `<span style="font-size:0.75rem;color:var(--text-dim);width:100%;text-align:center;">${order.status === 'cancelled' ? 'Cancelled' : 'Fulfilled'}</span>`;
  }

  setStatus(orderId, status) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'UPDATE_ORDER_STATUS', orderId, status }));
    } else {
      // Local update for offline
      const ord = this.orders.find(o => o.id === orderId);
      if (ord) {
        ord.status = status;
        this.renderAll();
      }
    }
  }

  // ── Menu Manager ───────────────────────────────────────────
  renderMenuManager() {
    const tbody = document.getElementById('dash-menu-items-table');
    if (!tbody) return;

    tbody.innerHTML = this.menu.map(dish => `
      <tr style="border-bottom:1px solid var(--border-subtle);">
        <td style="padding:12px 12px;display:flex;align-items:center;gap:10px;">
          <img src="${dish.image}" style="width:42px;height:42px;border-radius:6px;object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'" />
          <div>
            <strong style="font-size:0.9rem;">${dish.name}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted);">${dish.category}</div>
          </div>
        </td>
        <td style="padding:12px;">
          <span style="font-size:0.78rem;font-weight:700;padding:3px 8px;border-radius:var(--radius-full);background:${dish.dietary==='veg'?'rgba(16,185,129,.15)':dish.dietary==='vegan'?'rgba(16,185,129,.2)':'rgba(244,63,94,.15)'};color:${dish.dietary==='non-veg'?'var(--accent-rose)':'var(--accent-emerald)'};">
            ${dish.dietary.toUpperCase()}
          </span>
        </td>
        <td style="padding:12px;font-weight:800;color:var(--primary);">₹${dish.price}</td>
        <td style="padding:12px;">
          <button
            onclick="dashboardApp.toggleStock('${dish.id}', ${!dish.isAvailable})"
            style="padding:5px 14px;border-radius:var(--radius-full);font-size:0.75rem;font-weight:700;border:none;cursor:pointer;
              background:${dish.isAvailable ? 'rgba(16,185,129,.2)' : 'rgba(244,63,94,.2)'};
              color:${dish.isAvailable ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
            ${dish.isAvailable ? '🟢 In Stock' : '🔴 Sold Out'}
          </button>
        </td>
        <td style="padding:12px;text-align:right;">
          <button onclick="dashboardApp.deleteDish('${dish.id}')" style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;" title="Remove dish">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  toggleStock(dishId, isAvailable) {
    this.ws?.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify({ type: 'TOGGLE_ITEM_AVAILABILITY', itemId: dishId, isAvailable }));
  }

  deleteDish(dishId) {
    if (!confirm('Remove this dish from the live menu?')) return;
    this.ws?.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify({ type: 'DELETE_MENU_ITEM', itemId: dishId }));
  }

  addNewDishFromForm() {
    const name     = document.getElementById('dish-new-name').value.trim();
    const category = document.getElementById('dish-new-cat').value;
    const price    = parseFloat(document.getElementById('dish-new-price').value);
    const dietary  = document.getElementById('dish-new-diet').value;
    const desc     = document.getElementById('dish-new-desc').value.trim();
    const img      = document.getElementById('dish-new-img').value.trim() ||
                     'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    if (!name || isNaN(price)) return;

    this.ws?.readyState === WebSocket.OPEN && this.ws.send(JSON.stringify({
      type: 'ADD_MENU_ITEM',
      item: { name, category, price, dietary, description: desc, image: img, spiceLevel: 0, isChefSpecial: false, prepTime: '15 min' }
    }));

    document.getElementById('form-add-dish').reset();
    document.getElementById('modal-add-dish').classList.remove('active');
    this.showToast(`✨ "${name}" published to the live menu!`);
  }

  // ── Overview — Recent Orders ───────────────────────────────
  renderRecentOrders() {
    const box = document.getElementById('overview-recent-orders');
    if (!box) return;
    const recent = this.orders.slice(0, 10);
    if (!recent.length) {
      box.innerHTML = `<p style="padding:16px;color:var(--text-muted);font-size:0.88rem;">No orders yet today.</p>`;
      return;
    }
    box.innerHTML = recent.map(o => `
      <div class="recent-order-row">
        <div>
          <strong>${o.orderNumber}</strong>
          <span style="margin-left:10px;color:var(--text-muted);font-size:0.8rem;">${o.tableName} · ${o.customerName}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span style="font-weight:700;color:var(--primary);">₹${Math.round(o.total)}</span>
          <span class="status-pill ${o.status}">${o.status}</span>
          <span style="font-size:0.75rem;color:var(--text-dim);">${this.relTime(o.createdAt)}</span>
        </div>
      </div>
    `).join('');
  }

  // ── Tables Panel ──────────────────────────────────────────
  renderTablesPanel() {
    const grid = document.getElementById('tables-grid');
    if (!grid) return;

    const occupiedTableIds = new Set(
      this.orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(o => o.tableId)
    );

    grid.innerHTML = this.tables.map(table => {
      const isOccupied = occupiedTableIds.has(table.id);
      const activeOrders = this.orders.filter(o => o.tableId === table.id && o.status !== 'completed' && o.status !== 'cancelled');
      return `
        <div class="table-status-card">
          <div class="table-status-indicator ${isOccupied ? 'occupied' : 'available'}"></div>
          <div>
            <div class="table-card-name">${table.name}</div>
            <div class="table-card-detail">${table.section} · ${table.seats} seats</div>
            ${isOccupied ? `<div style="font-size:0.72rem;color:var(--primary);margin-top:3px;">${activeOrders.length} active order${activeOrders.length>1?'s':''}</div>` : ''}
          </div>
          <span class="table-card-status-label ${isOccupied ? 'occupied' : 'available'}">
            ${isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
          </span>
        </div>
      `;
    }).join('');
  }

  relTime(iso) {
    if (!iso) return 'just now';
    const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return `${Math.max(1, sec)}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
  }

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  setInnerHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:70px;right:20px;background:var(--bg-surface-elevated);border:1px solid var(--primary);color:#fff;padding:14px 20px;border-radius:var(--radius-md);box-shadow:0 8px 24px rgba(0,0,0,.5);z-index:3000;font-weight:700;font-size:0.9rem;animation:fadeSlideUp 0.3s ease;max-width:340px;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .5s'; setTimeout(() => t.remove(), 500); }, 4500);
  }
}

window.dashboardApp = new DashboardApp();
