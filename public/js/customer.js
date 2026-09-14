// =============================================================
// COFFEE CULTURE – THE RISTORANTE LOUNGE, JABALPUR
// CUSTOMER DIGITAL MENU & OFFLINE-READY ORDERING CLIENT
// =============================================================

class CustomerApp {
  constructor() {
    this.tableId = this.getQueryParam('table') || '4';
    this.currentCategory = 'all';
    this.currentDietFilter = 'all';
    this.searchQuery = '';
    this.menu = [];
    this.cart = [];
    this.activeOrder = null;
    this.activeCustomizingDish = null;
    this.selectedAddons = [];
    this.selectedTipPercentage = 10;
    this.ws = null;
    this.isOnline = navigator.onLine;

    this.init();
  }

  getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  setTable(id) {
    this.tableId = String(id);
    const url = new URL(window.location);
    url.searchParams.set('table', id);
    window.history.replaceState({}, '', url);
    this.updateTableDisplay();
    this.loadSavedOrder();
  }

  init() {
    this.updateTableDisplay();
    this.loadCachedMenu();
    this.fetchMenuFromApi();
    this.connectWebSocket();
    this.loadSavedOrder();
    this.setupEventListeners();
    this.setupNetworkWatchers();
    this.syncOfflineOrders();
  }

  updateTableDisplay() {
    const tableBadge = document.getElementById('customer-table-tag');
    if (tableBadge) {
      tableBadge.innerHTML = `<span>🍽️ Table ${this.tableId}</span>`;
    }
    const tableInput = document.getElementById('order-table-input');
    if (tableInput) {
      tableInput.value = `Table ${this.tableId}`;
    }
  }

  setupNetworkWatchers() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateOnlineStatusBadge();
      this.connectWebSocket();
      this.syncOfflineOrders();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateOnlineStatusBadge();
    });

    this.updateOnlineStatusBadge();
  }

  updateOnlineStatusBadge() {
    const pills = document.querySelectorAll('.network-status-indicator');
    pills.forEach(p => {
      if (this.isOnline) {
        p.innerHTML = '<span class="live-dot" style="background:#10b981;"></span> Online';
        p.style.color = '#10b981';
      } else {
        p.innerHTML = '<span class="live-dot" style="background:#f59e0b;"></span> ⚡ Offline Ready';
        p.style.color = '#f59e0b';
      }
    });

    const banner = document.getElementById('offline-notice-banner');
    if (banner) {
      banner.style.display = this.isOnline ? 'none' : 'flex';
    }
  }

  loadCachedMenu() {
    try {
      const cached = localStorage.getItem('coffee_culture_menu_cache');
      if (cached) {
        this.menu = JSON.parse(cached);
        this.renderMenu();
      }
    } catch (e) {
      console.warn('Could not load cached menu:', e);
    }
  }

  async fetchMenuFromApi() {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.menu = data;
          localStorage.setItem('coffee_culture_menu_cache', JSON.stringify(data));
          this.renderMenu();
        }
      }
    } catch (e) {
      console.log('Network request for menu failed, relying on cached/offline menu.');
    }
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('☕ Connected to Coffee Culture Live Hub');
        this.isOnline = true;
        this.updateOnlineStatusBadge();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsEvent(data);
        } catch (e) {
          console.error('Error handling WS event:', e);
        }
      };

      this.ws.onclose = () => {
        // Will retry in 5s
        setTimeout(() => {
          if (navigator.onLine) this.connectWebSocket();
        }, 5000);
      };
    } catch (e) {
      console.log('WebSocket not available in offline mode.');
    }
  }

  handleWsEvent(data) {
    switch (data.type) {
      case 'INIT_SYNC':
      case 'MENU_UPDATED':
        if (data.menu && data.menu.length > 0) {
          this.menu = data.menu;
          localStorage.setItem('coffee_culture_menu_cache', JSON.stringify(this.menu));
          this.renderMenu();
        }
        break;

      case 'MENU_ITEM_UPDATED':
        const index = this.menu.findIndex(i => i.id === data.item.id);
        if (index !== -1) {
          this.menu[index] = data.item;
          localStorage.setItem('coffee_culture_menu_cache', JSON.stringify(this.menu));
          this.renderMenu();
        }
        break;

      case 'ORDER_STATUS_CHANGED':
        if (this.activeOrder && this.activeOrder.id === data.order.id) {
          this.activeOrder = data.order;
          this.saveActiveOrder();
          this.renderTracker();
          window.soundEngine?.playSuccessBeep();
        }
        break;

      case 'ORDER_PLACED_CONFIRMATION':
        this.activeOrder = data.order;
        this.saveActiveOrder();
        this.cart = [];
        this.updateCartBar();
        this.closeCartDrawer();
        this.openTrackerModal();
        window.soundEngine?.playSuccessBeep();
        break;
    }
  }

  setupEventListeners() {
    // Search filter
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderMenu();
      });
    }

    // Category pills
    document.querySelectorAll('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCategory = btn.dataset.category;
        this.renderMenu();
      });
    });

    // Dietary filter pills
    document.querySelectorAll('.diet-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diet-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentDietFilter = btn.dataset.diet;
        this.renderMenu();
      });
    });

    // Cart bar click
    const cartBar = document.getElementById('floating-cart-bar');
    if (cartBar) {
      cartBar.addEventListener('click', () => this.openCartDrawer());
    }

    // Close drawers
    document.getElementById('close-cart-btn')?.addEventListener('click', () => this.closeCartDrawer());
    document.getElementById('close-customizer-btn')?.addEventListener('click', () => this.closeCustomizerModal());
    document.getElementById('close-tracker-btn')?.addEventListener('click', () => this.closeTrackerModal());
    document.getElementById('btn-cancel-order')?.addEventListener('click', () => this.cancelActiveOrder());
    document.getElementById('close-order-history-btn')?.addEventListener('click', () => this.closeOrderHistory());
    document.getElementById('close-service-btn')?.addEventListener('click', () => this.closeServiceModal());
    document.getElementById('close-budget-btn')?.addEventListener('click', () => this.closeBudgetModal());

    // Call service buttons
    document.getElementById('btn-call-waiter')?.addEventListener('click', () => this.openServiceModal());

    // Tip selection
    document.querySelectorAll('.tip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTipPercentage = Number(btn.dataset.tip);
        this.renderCartSummary();
      });
    });

    // Submit Order button
    document.getElementById('btn-submit-order')?.addEventListener('click', () => this.submitOrder());
  }

  // Filter helper for Budget Guide
  filterByBudget(type) {
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.cat-pill[data-category="all"]');
    if (allBtn) allBtn.classList.add('active');
    this.currentCategory = 'all';

    const searchInput = document.getElementById('menu-search-input');
    if (type === 'promo') {
      this.currentCategory = 'promo_deals';
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
    } else if (type === 'hangout') {
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
      // Filter for items <= 190
      this.renderFilteredMenu(item => item.price <= 190);
      this.closeBudgetModal();
      return;
    } else if (type === 'meal') {
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
      // Filter for mains, sizzlers, pastas, combos
      this.renderFilteredMenu(item => item.category === 'sizzlers_mains' || item.category === 'pastas' || item.category === 'pizzas');
      this.closeBudgetModal();
      return;
    }

    this.closeBudgetModal();
    this.renderMenu();
  }

  renderFilteredMenu(filterFn) {
    const container = document.getElementById('menu-items-container');
    if (!container) return;
    const filtered = this.menu.filter(filterFn);
    this.renderDishesIntoContainer(container, filtered);
  }

  renderMenu() {
    const container = document.getElementById('menu-items-container');
    if (!container) return;

    let filtered = this.menu.filter(item => {
      let matchesCategory = true;
      if (this.currentCategory === 'promo_deals') {
        matchesCategory = item.price === 40 || item.name.toLowerCase().includes('promo');
      } else if (this.currentCategory !== 'all') {
        matchesCategory = item.category === this.currentCategory;
      }

      const matchesDiet = this.currentDietFilter === 'all' || item.dietary === this.currentDietFilter;
      const matchesSearch = !this.searchQuery ||
        item.name.toLowerCase().includes(this.searchQuery) ||
        item.description.toLowerCase().includes(this.searchQuery);
      return matchesCategory && matchesDiet && matchesSearch;
    });

    this.renderDishesIntoContainer(container, filtered);
  }

  renderDishesIntoContainer(container, filtered) {
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <p style="font-size: 2.5rem; margin-bottom: 8px;">☕</p>
          <p style="font-weight: 700; font-size: 1.1rem; color: #fff;">No dishes found matching your selection.</p>
          <p style="font-size: 0.85rem; margin-top: 6px;">Try clearing search filters or selecting another category.</p>
          <button class="primary-action-btn" style="width:auto;margin:16px auto 0;padding:8px 20px;" onclick="customerApp.currentCategory='all';customerApp.searchQuery='';customerApp.renderMenu();">Show All Items</button>
        </div>
      `;
      return;
    }

    const categoriesMap = {
      coffees_drinks: '☕ Handcrafted Coffees & Chilled Beverages',
      starters: '🍟 Crispy Starters & Cafe Snacks',
      burgers_sandwiches: '🍔 Gourmet Burgers & Sandwiches',
      pizzas: '🍕 Hand-Tossed Artisanal Pizzas',
      pastas: '🍝 Authentic Italian Pastas',
      sizzlers_mains: '🔥 Signature Sizzlers & Mains',
      salads: '🥗 Fresh & Tossed Salads',
      desserts: '🍨 Sizzling Desserts & Bakery'
    };

    let html = '';
    const grouped = {};
    filtered.forEach(item => {
      const cat = item.category || 'coffees_drinks';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    for (const [catKey, items] of Object.entries(grouped)) {
      html += `
        <div class="menu-section">
          <div class="section-heading">
            ${categoriesMap[catKey] || 'Specialty Delights'}
            <span>${items.length} item${items.length > 1 ? 's' : ''}</span>
          </div>
          <div class="dishes-list">
            ${items.map(dish => this.renderDishCard(dish)).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach click listeners to dishes
    container.querySelectorAll('.dish-card').forEach(card => {
      card.addEventListener('click', () => {
        const dishId = card.dataset.dishId;
        const dish = this.menu.find(d => d.id === dishId);
        if (dish && dish.isAvailable) {
          this.openCustomizerModal(dish);
        }
      });
    });
  }

  renderDishCard(dish) {
    const isSoldOut = !dish.isAvailable;
    const isPromo = dish.price === 40 || dish.name.toLowerCase().includes('promo');
    const dietBadgeClass = dish.dietary === 'veg' ? 'badge-veg' :
                           dish.dietary === 'vegan' ? 'badge-vegan' : 'badge-non-veg';
    const dietLabel = dish.dietary === 'veg' ? 'VEG' :
                      dish.dietary === 'vegan' ? 'VEGAN' : 'NON-VEG';

    return `
      <div class="dish-card ${isSoldOut ? 'sold-out' : ''} ${isPromo ? 'promo-card-glow' : ''}" data-dish-id="${dish.id}">
        <div class="dish-info">
          <div class="dish-meta-tags">
            <span class="badge-diet ${dietBadgeClass}">${dietLabel}</span>
            ${isPromo ? '<span class="badge-special" style="background:#dc2626;color:#fff;">🏷️ ₹40 Offer</span>' : ''}
            ${dish.isChefSpecial && !isPromo ? '<span class="badge-special">⭐ Cafe Special</span>' : ''}
            ${dish.spiceLevel > 0 ? `<span style="font-size: 0.75rem;">${'🌶️'.repeat(dish.spiceLevel)}</span>` : ''}
          </div>
          <h3 class="dish-name">${dish.name}</h3>
          <p class="dish-desc">${dish.description}</p>
          <div class="dish-bottom">
            <span class="dish-price">₹${dish.price}</span>
            <span style="font-size: 0.75rem; color: var(--text-dim);">⏱️ ${dish.prepTime || '12 min'}</span>
          </div>
        </div>
        <div class="dish-img-wrapper">
          <img src="${dish.image}" alt="${dish.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'" />
          ${isSoldOut ? '<div class="sold-out-overlay">Sold Out</div>' : `
            <button class="add-btn" onclick="event.stopPropagation(); customerApp.openCustomizerModal(customerApp.getDish('${dish.id}'))">
              ADD +
            </button>
          `}
        </div>
      </div>
    `;
  }

  getDish(id) {
    return this.menu.find(d => d.id === id);
  }

  // ===========================================================
  // CUSTOMIZER MODAL (Addons, Notes)
  // ===========================================================
  openCustomizerModal(dish) {
    this.activeCustomizingDish = dish;
    this.selectedAddons = [];
    const modal = document.getElementById('customizer-modal');
    if (!modal) return;

    document.getElementById('customizer-img').src = dish.image;
    document.getElementById('customizer-name').innerText = dish.name;
    document.getElementById('customizer-desc').innerText = dish.description;
    document.getElementById('customizer-base-price').innerText = `₹${dish.price}`;
    document.getElementById('customizer-qty-val').innerText = '1';
    document.getElementById('customizer-notes').value = '';

    // Render Addons
    const addonsBox = document.getElementById('customizer-addons-list');
    if (dish.addons && dish.addons.length > 0) {
      addonsBox.innerHTML = `
        <p style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main);">Custom Add-ons</p>
        ${dish.addons.map((addon, idx) => `
          <label style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface-elevated); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 6px; cursor: pointer;">
            <span style="font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="addon-checkbox" data-index="${idx}" onchange="customerApp.toggleAddon(${idx})">
              ${addon.name}
            </span>
            <span style="font-weight: 700; font-size: 0.85rem; color: var(--primary);">+₹${addon.price}</span>
          </label>
        `).join('')}
      `;
      addonsBox.style.display = 'block';
    } else {
      addonsBox.style.display = 'none';
    }

    modal.classList.add('active');
  }

  toggleAddon(idx) {
    const addon = this.activeCustomizingDish.addons[idx];
    const existsIndex = this.selectedAddons.findIndex(a => a.name === addon.name);
    if (existsIndex !== -1) {
      this.selectedAddons.splice(existsIndex, 1);
    } else {
      this.selectedAddons.push(addon);
    }
  }

  adjustCustomizerQty(delta) {
    const qtySpan = document.getElementById('customizer-qty-val');
    let current = parseInt(qtySpan.innerText, 10);
    current = Math.max(1, current + delta);
    qtySpan.innerText = current;
  }

  confirmAddToCart() {
    if (!this.activeCustomizingDish) return;
    const qty = parseInt(document.getElementById('customizer-qty-val').innerText, 10);
    const notes = document.getElementById('customizer-notes').value.trim();

    const cartItem = {
      dishId: this.activeCustomizingDish.id,
      name: this.activeCustomizingDish.name,
      basePrice: this.activeCustomizingDish.price,
      quantity: qty,
      selectedAddons: [...this.selectedAddons],
      notes: notes
    };

    const addonsTotal = this.selectedAddons.reduce((sum, a) => sum + a.price, 0);
    cartItem.unitPrice = cartItem.basePrice + addonsTotal;
    cartItem.totalPrice = cartItem.unitPrice * qty;

    this.cart.push(cartItem);
    this.closeCustomizerModal();
    this.updateCartBar();
    window.soundEngine?.playSuccessBeep();
  }

  closeCustomizerModal() {
    document.getElementById('customizer-modal')?.classList.remove('active');
    this.activeCustomizingDish = null;
  }

  // ===========================================================
  // CART & CHECKOUT
  // ===========================================================
  updateCartBar() {
    const bar = document.getElementById('floating-cart-bar');
    if (!bar) return;

    const totalQty = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);

    if (totalQty > 0) {
      bar.classList.add('visible');
      document.getElementById('cart-bar-count').innerText = totalQty;
      document.getElementById('cart-bar-total').innerText = `₹${subtotal} →`;
    } else {
      bar.classList.remove('visible');
    }
  }

  openCartDrawer() {
    this.renderCartItems();
    this.renderCartSummary();
    document.getElementById('cart-drawer-modal')?.classList.add('active');
  }

  closeCartDrawer() {
    document.getElementById('cart-drawer-modal')?.classList.remove('active');
  }

  renderCartItems() {
    const list = document.getElementById('cart-items-container');
    if (!list) return;

    if (this.cart.length === 0) {
      list.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Your cart is empty. Tap any dish to add.</p>`;
      return;
    }

    list.innerHTML = this.cart.map((item, idx) => `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          ${item.selectedAddons.length > 0 ? `
            <div class="cart-item-addons">+ ${item.selectedAddons.map(a => a.name).join(', ')}</div>
          ` : ''}
          ${item.notes ? `<div class="cart-item-notes">"${item.notes}"</div>` : ''}
        </div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-btn" onclick="customerApp.changeCartItemQty(${idx}, -1)">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="customerApp.changeCartItemQty(${idx}, 1)">+</button>
          </div>
          <div class="cart-item-price">₹${item.totalPrice}</div>
        </div>
      </div>
    `).join('');
  }

  changeCartItemQty(index, delta) {
    if (!this.cart[index]) return;
    this.cart[index].quantity += delta;
    if (this.cart[index].quantity <= 0) {
      this.cart.splice(index, 1);
    } else {
      this.cart[index].totalPrice = this.cart[index].unitPrice * this.cart[index].quantity;
    }
    this.renderCartItems();
    this.renderCartSummary();
    this.updateCartBar();
  }

  renderCartSummary() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.05); // 5% GST for restaurant
    const tip = Math.round(subtotal * (this.selectedTipPercentage / 100));
    const grandTotal = subtotal + tax + tip;

    document.getElementById('bill-subtotal').innerText = `₹${subtotal}`;
    document.getElementById('bill-tax').innerText = `₹${tax}`;
    document.getElementById('bill-tip').innerText = `₹${tip}`;
    document.getElementById('bill-grand-total').innerText = `₹${grandTotal}`;
  }

  submitOrder() {
    if (this.cart.length === 0) return;

    const subtotal = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.05);
    const tip = Math.round(subtotal * (this.selectedTipPercentage / 100));
    const grandTotal = subtotal + tax + tip;
    const guestName = document.getElementById('customer-name-input')?.value.trim() || 'Guest';
    const instructions = document.getElementById('order-special-instructions')?.value.trim() || '';

    const orderPayload = {
      tableId: this.tableId,
      tableName: `Table ${this.tableId}`,
      customerName: guestName,
      items: this.cart.map(c => ({
        id: c.dishId,
        name: c.name,
        price: c.unitPrice,
        quantity: c.quantity,
        selectedAddons: c.selectedAddons,
        notes: c.notes
      })),
      subtotal: subtotal,
      tax: tax,
      tip: tip,
      total: grandTotal,
      specialInstructions: instructions,
      paymentStatus: 'unpaid'
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'PLACE_ORDER',
        order: orderPayload
      }));
    } else {
      // Attempt REST post or fallback to local offline order queue
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      })
      .then(res => res.json())
      .then(order => {
        this.activeOrder = order;
        this.saveActiveOrder();
        this.cart = [];
        this.updateCartBar();
        this.closeCartDrawer();
        this.openTrackerModal();
        window.soundEngine?.playSuccessBeep();
      })
      .catch(() => {
        // Fallback: Store locally in offline queue!
        this.queueOfflineOrder(orderPayload);
      });
    }
  }

  queueOfflineOrder(payload) {
    const offlineOrder = {
      ...payload,
      id: `off-${Date.now()}`,
      orderNumber: `#OFF-${Math.floor(100 + Math.random() * 900)}`,
      status: 'pending',
      isOffline: true,
      createdAt: new Date().toISOString()
    };

    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem('coffee_culture_offline_queue') || '[]');
    } catch (e) {}
    queue.push(offlineOrder);
    localStorage.setItem('coffee_culture_offline_queue', JSON.stringify(queue));

    this.activeOrder = offlineOrder;
    this.saveActiveOrder();
    this.cart = [];
    this.updateCartBar();
    this.closeCartDrawer();
    this.openTrackerModal();
    window.soundEngine?.playSuccessBeep();

    alert(`⚡ Offline Mode: Your order is saved locally on your device! It will automatically sync as soon as you reconnect to the cafe Wi-Fi.`);
  }

  async syncOfflineOrders() {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem('coffee_culture_offline_queue') || '[]');
    } catch (e) { return; }

    if (queue.length === 0) return;

    console.log(`☕ Syncing ${queue.length} offline orders...`);
    const remaining = [];
    for (const ord of queue) {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ord)
        });
        if (!res.ok) remaining.push(ord);
      } catch (e) {
        remaining.push(ord);
      }
    }
    localStorage.setItem('coffee_culture_offline_queue', JSON.stringify(remaining));
  }

  // ===========================================================
  // LIVE ORDER TRACKER
  // ===========================================================
  loadSavedOrder() {
    const saved = localStorage.getItem(`coffee_culture_order_v2_${this.tableId}`);
    if (saved) {
      try {
        this.activeOrder = JSON.parse(saved);
        const placedAt = new Date(this.activeOrder.createdAt).getTime();
        if (Date.now() - placedAt < 3 * 3600 * 1000 && this.activeOrder.status !== 'completed') {
          const trackBtn = document.getElementById('btn-view-tracker');
          if (trackBtn) trackBtn.style.display = 'flex';
        }
      } catch (e) {}
    }
  }

  saveActiveOrder() {
    if (this.activeOrder) {
      localStorage.setItem(`coffee_culture_order_v2_${this.tableId}`, JSON.stringify(this.activeOrder));
      this.saveOrderToHistory(this.activeOrder);
      const trackBtn = document.getElementById('btn-view-tracker');
      if (trackBtn) trackBtn.style.display = 'flex';
    }
  }

  getOrderHistory() {
    try {
      return JSON.parse(localStorage.getItem(`coffee_culture_order_history_v2_${this.tableId}`) || '[]');
    } catch (e) {
      return [];
    }
  }

  saveOrderToHistory(order) {
    const history = this.getOrderHistory();
    const existingIndex = history.findIndex(item => item.id === order.id);
    if (existingIndex >= 0) history[existingIndex] = order;
    else history.unshift(order);
    localStorage.setItem(`coffee_culture_order_history_v2_${this.tableId}`, JSON.stringify(history.slice(0, 20)));
  }

  openOrderHistory() {
    const history = this.getOrderHistory();
    const list = document.getElementById('order-history-list');
    if (!list) return;
    list.innerHTML = history.length ? history.map(order => {
      const date = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Recent order';
      const status = (order.status || 'pending').replace('_', ' ');
      const items = (order.items || []).map(item => `${item.quantity}x ${item.name}`).join(', ');
      return `<div style="padding:14px 0;border-bottom:1px solid var(--border-subtle);">
        <div style="display:flex;justify-content:space-between;gap:10px;font-weight:800;">
          <span>${order.orderNumber || 'Order'}</span><span style="color:var(--primary);">₹${order.total || 0}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin:5px 0;">${date}</div>
        <div style="font-size:0.8rem;color:var(--text-main);">${items}</div>
        <div style="font-size:0.75rem;color:var(--accent-emerald);text-transform:capitalize;margin-top:6px;">${status}</div>
        ${order.status === 'pending' ? `<button class="secondary-action-btn" style="margin-top:8px;padding:6px 10px;" onclick="customerApp.cancelOrderFromHistory('${order.id}')">Cancel This Order</button>` : ''}
      </div>`;
    }).join('') : '<p style="color:var(--text-muted);text-align:center;padding:30px 10px;">No orders yet for this table.</p>';
    document.getElementById('order-history-modal')?.classList.add('active');
  }

  closeOrderHistory() {
    document.getElementById('order-history-modal')?.classList.remove('active');
  }

  async cancelOrderFromHistory(orderId) {
    const order = this.getOrderHistory().find(item => item.id === orderId);
    if (!order || order.status !== 'pending' || !window.confirm(`Cancel ${order.orderNumber || 'this order'}?`)) return;
    await this.cancelOrderById(order);
    this.openOrderHistory();
  }

  openTrackerModal() {
    if (!this.activeOrder) {
      alert('No active order yet. Place an order first to track it here.');
      return;
    }
    this.renderTracker();
    document.getElementById('tracker-modal')?.classList.add('active');
  }

  closeTrackerModal() {
    document.getElementById('tracker-modal')?.classList.remove('active');
  }

  renderTracker() {
    if (!this.activeOrder) return;

    const status = this.activeOrder.status;
    const trackerTitle = document.getElementById('tracker-status-title');
    const trackerDesc = document.getElementById('tracker-status-desc');
    const trackerIcon = document.getElementById('tracker-status-icon');

    const steps = ['pending', 'preparing', 'ready', 'completed'];
    const currentIdx = steps.indexOf(status);

    steps.forEach((st, idx) => {
      const stepEl = document.getElementById(`step-${st}`);
      if (stepEl) {
        stepEl.classList.remove('active', 'completed');
        if (idx < currentIdx) {
          stepEl.classList.add('completed');
        } else if (idx === currentIdx) {
          stepEl.classList.add('active');
        }
      }
    });

    if (this.activeOrder.isOffline) {
      trackerIcon.innerText = '⚡';
      trackerTitle.innerText = 'Saved Offline (Queued)';
      trackerDesc.innerText = 'Order recorded locally. It will dispatch instantly when back online.';
    } else if (status === 'pending') {
      trackerIcon.innerText = '📬';
      trackerTitle.innerText = 'Order Received!';
      trackerDesc.innerText = 'Coffee Culture kitchen has your ticket and is preparing fresh ingredients.';
    } else if (status === 'preparing') {
      trackerIcon.innerText = '👨‍🍳';
      trackerTitle.innerText = 'Crafting in Kitchen';
      trackerDesc.innerText = 'Our cafe baristas and chefs are preparing your order fresh.';
    } else if (status === 'ready') {
      trackerIcon.innerText = '🔔';
      trackerTitle.innerText = 'Order Ready & Serving!';
      trackerDesc.innerText = 'Your delicious order is plated and heading right to your table.';
    } else if (status === 'completed') {
      trackerIcon.innerText = '🎉';
      trackerTitle.innerText = 'Enjoy Your Visit!';
      trackerDesc.innerText = 'Order fulfilled. Thank you for dining with Coffee Culture, Jabalpur!';
    } else if (status === 'cancelled') {
      trackerIcon.innerText = '❌';
      trackerTitle.innerText = 'Order Cancelled';
      trackerDesc.innerText = 'Please speak to your server for assistance.';
    }

    document.getElementById('tracker-order-number').innerText = this.activeOrder.orderNumber;
    document.getElementById('tracker-order-total').innerText = `₹${this.activeOrder.total}`;
    document.getElementById('tracker-items-list').innerHTML = this.activeOrder.items.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0;">
        <span><strong>${item.quantity}x</strong> ${item.name}</span>
        <span>₹${item.price * item.quantity}</span>
      </div>
    `).join('');
    const cancelButton = document.getElementById('btn-cancel-order');
    if (cancelButton) cancelButton.style.display = status === 'pending' ? 'block' : 'none';
  }

  async cancelActiveOrder() {
    if (!this.activeOrder || this.activeOrder.status !== 'pending') return;
    if (!window.confirm('Cancel this order?')) return;

    await this.cancelOrderById(this.activeOrder);
  }

  async cancelOrderById(order) {
    const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: this.tableId })
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'This order cannot be cancelled.');
      return;
    }
    if (this.activeOrder?.id === result.id) {
      this.activeOrder = result;
      this.saveActiveOrder();
      this.renderTracker();
    } else {
      this.saveOrderToHistory(result);
    }
  }

  // ===========================================================
  // BUDGET GUIDE MODAL
  // ===========================================================
  openBudgetModal() {
    document.getElementById('budget-modal')?.classList.add('active');
  }

  closeBudgetModal() {
    document.getElementById('budget-modal')?.classList.remove('active');
  }

  // ===========================================================
  // SERVICE REQUESTS
  // ===========================================================
  openServiceModal() {
    document.getElementById('service-modal')?.classList.add('active');
  }

  closeServiceModal() {
    document.getElementById('service-modal')?.classList.remove('active');
  }

  sendServiceRequest(type) {
    const typeNames = { waiter: 'Server Assistance', water: 'Water Refill', bill: 'Bill / Payment' };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'REQUEST_SERVICE',
        tableId: this.tableId,
        type: type,
        message: `Table ${this.tableId} requested ${typeNames[type]}`
      }));
    }

    this.closeServiceModal();
    window.soundEngine?.playSuccessBeep();
    alert(`🛎️ Service requested! A staff member is on the way to Table ${this.tableId}.`);
  }
}

window.customerApp = new CustomerApp();
