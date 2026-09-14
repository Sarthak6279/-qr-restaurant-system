// =============================================================
// APP.JS — Coffee Culture Router, Global Sidebar & Offline SW
// =============================================================

const PANEL_TITLES = {
  customer: '☕ Customer Digital Menu',
  kitchen:  '👨‍🍳 Live Kitchen Display (KDS)',
  qr:       '🏷️ QR Code Standees',
  overview: '📊 Restaurant Overview',
  menu:     '📋 Menu & Stock Manager',
  budget:   '💡 Budget Dining Planner'
};

class AppRouter {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.currentView = this.params.get('view') || 'customer';
    this.tableId = this.params.get('table') || '4';
    this.sidebarCollapsed = false;
    this.sidebarOverlay = null;
    this.ownerAuthenticated = false;
    this.pendingOwnerView = null;
    this.isAdminRoute = window.location.pathname === '/admin';

    this.init();
  }

  init() {
    document.body.classList.toggle('admin-mode', this.isAdminRoute);
    document.body.classList.toggle('customer-public', !this.isAdminRoute);
    this.registerServiceWorker();
    this.setupSidebarNavigation();
    this.setupTableSelector();
    this.setupMobileToggles();
    this.loadNetworkInfo();
    this.setupOwnerLogin();

    this.checkOwnerSession().then(() => {
      this.routeInitialView();
      if (this.isAdminRoute && this.ownerAuthenticated) {
        window.dashboardApp?.connectWebSocket();
      }
    });
  }

  routeInitialView() {
    if (!this.isAdminRoute) return this.switchView('customer');
    if (this.currentView === 'dashboard' || this.currentView === 'kitchen') return this.switchView('kitchen');
    if (this.currentView === 'qr' || this.currentView === 'qr-hub') return this.switchView('qr');
    if (this.currentView === 'overview') return this.switchView('overview');
    if (this.currentView === 'menu') return this.switchView('menu');
    this.switchView('customer');
  }

  setupOwnerLogin() {
    const form = document.getElementById('owner-login-form');
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = document.getElementById('owner-login-error');
      error.textContent = '';
      const credentials = new FormData(form);
      const ownerId = credentials.get('ownerId');
      const password = credentials.get('password');
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerId, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed');
        this.ownerAuthenticated = true;
        form.reset();
        this.hideOwnerLogin();
        this.setOwnerMode();
        window.dashboardApp?.ws?.close();
        window.dashboardApp?.connectWebSocket();
        this.switchView(this.pendingOwnerView || 'kitchen');
      } catch (loginError) {
        error.textContent = loginError.message;
      }
    });

    document.getElementById('owner-logout-btn')?.addEventListener('click', () => this.logoutOwner());
  }

  async checkOwnerSession() {
    try {
      const response = await fetch('/api/auth/status');
      this.ownerAuthenticated = (await response.json()).authenticated === true;
    } catch (error) {
      this.ownerAuthenticated = false;
    }
  }

  showOwnerLogin() {
    document.body.classList.add('admin-mode');
    document.body.classList.remove('customer-public');
    this.closeMobileSidebar();
    document.getElementById('unified-sidebar')?.classList.add('sidebar-hidden');
    document.body.classList.add('sidebar-is-hidden');
    const overlay = document.getElementById('owner-login-overlay');
    overlay?.classList.add('active');
    overlay?.setAttribute('aria-hidden', 'false');
    document.getElementById('owner-id')?.focus();
  }

  hideOwnerLogin() {
    const overlay = document.getElementById('owner-login-overlay');
    overlay?.classList.remove('active');
    overlay?.setAttribute('aria-hidden', 'true');
  }

  async logoutOwner() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.dashboardApp?.ws?.close();
    this.ownerAuthenticated = false;
    this.isAdminRoute = false;
    document.body.classList.remove('admin-mode');
    document.body.classList.add('customer-public');
    this.switchView('customer');
  }

  setOwnerMode() {
    this.isAdminRoute = true;
    document.body.classList.add('admin-mode');
    document.body.classList.remove('customer-public');
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('☕ [PWA] Service Worker registered with scope:', reg.scope))
        .catch(err => console.warn('☕ [PWA] SW registration failed:', err));
    }
  }

  setupSidebarNavigation() {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.dataset.targetView;
        if (targetView === 'owner-login') {
          this.pendingOwnerView = 'kitchen';
          if (this.ownerAuthenticated) {
            this.setOwnerMode();
            this.switchView('kitchen');
          } else {
            this.showOwnerLogin();
          }
        } else if (targetView === 'budget') {
          window.customerApp?.openBudgetModal();
        } else {
          this.switchView(targetView);
        }
        this.closeMobileSidebar();
      });
    });

    // Collapse toggle on desktop
    document.getElementById('btn-collapse-sidebar')?.addEventListener('click', () => {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      const sidebar = document.getElementById('unified-sidebar');
      sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
      document.body.classList.toggle('sidebar-is-collapsed', this.sidebarCollapsed);
    });

    // Create mobile overlay element if not present
    if (!document.querySelector('.sidebar-backdrop')) {
      this.sidebarOverlay = document.createElement('div');
      this.sidebarOverlay.className = 'sidebar-backdrop';
      this.sidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
      document.body.appendChild(this.sidebarOverlay);
    } else {
      this.sidebarOverlay = document.querySelector('.sidebar-backdrop');
    }
  }

  setupTableSelector() {
    const selector = document.getElementById('sidebar-table-select');
    if (selector) {
      selector.value = this.tableId;
      selector.addEventListener('change', (e) => {
        this.switchToCustomerTable(e.target.value);
      });
    }
  }

  setupMobileToggles() {
    document.querySelectorAll('.btn-toggle-sidebar').forEach(btn => {
      btn.addEventListener('click', (event) => {
        if (btn.classList.contains('sidebar-close-mobile')) {
          event.stopPropagation();
          this.closeMobileSidebar();
          return;
        }
        this.toggleMobileSidebar();
      });
    });

    document.getElementById('btn-close-sidebar')?.addEventListener('click', () => this.closeSidebar());

    // Audio toggle
    document.getElementById('dash-audio-toggle')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const muted = window.soundEngine ? window.soundEngine.toggleMute() : false;
      btn.classList.toggle('active', !muted);
      btn.innerHTML = muted ? '🔕 Sound: MUTED' : '🔔 Sound: ON';
    });
  }

  toggleMobileSidebar() {
    if (window.innerWidth > 900) {
      const sidebar = document.getElementById('unified-sidebar');
      const hidden = sidebar?.classList.toggle('sidebar-hidden');
      document.body.classList.toggle('sidebar-is-hidden', hidden);
      return;
    }
    const sidebar = document.getElementById('unified-sidebar');
    if (sidebar.classList.contains('mobile-open')) {
      this.closeMobileSidebar();
    } else {
      this.openMobileSidebar();
    }
  }

  closeSidebar() {
    const sidebar = document.getElementById('unified-sidebar');
    sidebar?.classList.remove('mobile-open');
    sidebar?.classList.add('sidebar-hidden');
    this.sidebarOverlay?.classList.remove('active');
    document.querySelectorAll('.sidebar-backdrop').forEach(backdrop => backdrop.classList.remove('active'));
    document.body.classList.add('sidebar-is-hidden');
  }

  openMobileSidebar() {
    document.getElementById('unified-sidebar')?.classList.remove('sidebar-hidden');
    document.body.classList.remove('sidebar-is-hidden');
    document.getElementById('unified-sidebar')?.classList.add('mobile-open');
    this.sidebarOverlay?.classList.add('active');
  }

  closeMobileSidebar() {
    document.getElementById('unified-sidebar')?.classList.remove('mobile-open');
    this.sidebarOverlay?.classList.remove('active');
    document.querySelector('.sidebar-backdrop')?.classList.remove('active');
  }

  switchView(viewName) {
    if (!this.isAdminRoute && viewName !== 'customer' && viewName !== 'budget') {
      return this.switchView('customer');
    }
    if (viewName !== 'customer' && viewName !== 'budget' && !this.ownerAuthenticated) {
      this.pendingOwnerView = viewName;
      this.showOwnerLogin();
      return;
    }
    this.currentView = viewName;

    // Update active nav items
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.targetView === viewName);
    });

    const customerAppContainer = document.getElementById('app-customer');
    const ownerAppContainer = document.getElementById('app-owner');
    const panelTitle = document.getElementById('global-page-title');

    if (viewName === 'customer') {
      customerAppContainer.style.display = 'block';
      ownerAppContainer.style.display = 'none';
      document.title = `Coffee Culture | Table ${this.tableId} — Digital Menu`;
      if (panelTitle) panelTitle.textContent = `☕ Table ${this.tableId} Menu`;
      window.customerApp?.renderMenu();
    } else {
      customerAppContainer.style.display = 'none';
      ownerAppContainer.style.display = 'block';
      document.title = `Coffee Culture | ${PANEL_TITLES[viewName] || 'Dashboard'}`;
      if (panelTitle) panelTitle.textContent = PANEL_TITLES[viewName] || viewName;

      // Show matching sub-panel inside owner main
      document.querySelectorAll('.owner-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${viewName}`);
      });

      // Specific initializers
      if (viewName === 'kitchen' && window.dashboardApp) {
        window.dashboardApp.renderKanbanBoard();
      }
      if (viewName === 'qr' && window.qrHubApp) {
        window.qrHubApp.fetchNetworkInfo();
      }
      if (viewName === 'overview' && window.dashboardApp) {
        window.dashboardApp.renderStats();
        window.dashboardApp.renderRecentOrders();
      }
      if (viewName === 'menu' && window.dashboardApp) {
        window.dashboardApp.renderMenuManager();
      }
    }

    // Update URL query state
    const url = new URL(window.location);
    if (viewName === 'customer') {
      url.searchParams.delete('view');
      url.searchParams.set('table', this.tableId);
    } else {
      url.searchParams.set('view', viewName);
    }
    window.history.replaceState({}, '', url);
  }

  switchToCustomerTable(tableId) {
    this.tableId = String(tableId);
    if (window.customerApp) {
      window.customerApp.setTable(this.tableId);
    }
    const selector = document.getElementById('sidebar-table-select');
    if (selector) selector.value = this.tableId;

    this.switchView('customer');
  }

  async loadNetworkInfo() {
    try {
      const res = await fetch('/api/network-info');
      const info = await res.json();
      const el = document.getElementById('topbar-network-url');
      if (el) el.textContent = info.networkUrl;
      const cafeNameEl = document.getElementById('cafe-brand-city');
      if (cafeNameEl) cafeNameEl.textContent = `${info.city || 'Jabalpur'}`;
    } catch (e) {
      const el = document.getElementById('topbar-network-url');
      if (el) el.textContent = window.location.host;
    }
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new AppRouter();
});
