// =============================================================
// QR CODE HUB — Table standee generator (Coffee Culture, Jabalpur)
// =============================================================

class QrHubApp {
  constructor() {
    this.networkInfo = null;
    this.tables = [];
    this.useNetworkIp = false;
  }

  async fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network-info');
      this.networkInfo = await res.json();
    } catch (e) {
      console.warn('Could not fetch network info:', e);
    }

    try {
      const tableRes = await fetch('/api/tables');
      this.tables = await tableRes.json();
    } catch (e) {
      console.warn('Could not fetch tables:', e);
    }

    this.setupEventListeners();
    const toggle = document.getElementById('qr-ip-toggle');
    if (toggle) this.useNetworkIp = toggle.checked;
    this.renderQrCards();
    this.updateNetworkBadge();
  }

  updateNetworkBadge() {
    const badge = document.getElementById('topbar-network-url');
    if (badge && this.networkInfo) {
      badge.textContent = this.networkInfo.publicUrl || this.networkInfo.networkUrl;
    }
  }

  setupEventListeners() {
    const toggle = document.getElementById('qr-ip-toggle');
    if (toggle && !toggle._bound) {
      toggle._bound = true;
      toggle.addEventListener('change', (e) => {
        this.useNetworkIp = e.target.checked;
        this.renderQrCards();
      });
    }

    const printBtn = document.getElementById('btn-print-all-tents');
    if (printBtn && !printBtn._bound) {
      printBtn._bound = true;
      printBtn.addEventListener('click', () => {
        this.buildPrintTents();
        setTimeout(() => window.print(), 400);
      });
    }
  }

  getBaseUrl() {
    if (this.useNetworkIp && this.networkInfo) return this.networkInfo.networkUrl;
    if (this.networkInfo && this.networkInfo.publicUrl) return this.networkInfo.publicUrl;
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
    return !isLocalHost ? window.location.origin : (this.networkInfo?.networkUrl || window.location.origin);
  }

  getQrSrc(tableId) {
    return `/api/qr/${tableId}${this.useNetworkIp ? '?mode=network' : ''}`;
  }

  renderQrCards() {
    const grid = document.getElementById('qr-cards-grid');
    if (!grid || !this.tables.length) return;
    const baseUrl = this.getBaseUrl();

    grid.innerHTML = this.tables.map(table => {
      const targetUrl = `${baseUrl}/?table=${table.id}`;
      return `
        <div class="qr-card">
          <div class="qr-table-title">${table.name}</div>
          <div class="qr-section-tag">${table.section} &bull; ${table.seats} Seats</div>
          <div class="qr-image-box">
            <img src="${this.getQrSrc(table.id)}" alt="QR for ${table.name}" width="180" height="180"
              onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent('${targetUrl}')" />
          </div>
          <p style="font-size:0.75rem;color:var(--text-dim);word-break:break-all;margin-bottom:14px;text-align:center;">${targetUrl}</p>
          <div class="qr-card-actions">
            <button class="qr-btn" onclick="window.appRouter.switchToCustomerTable('${table.id}')">📱 Open Menu (T${table.id})</button>
            <button class="qr-btn" onclick="qrHubApp.printSingle('${table.id}')">🖨️ Print Standee</button>
          </div>
        </div>`;
    }).join('');
  }

  buildPrintTents() {
    const container = document.getElementById('print-tents-container');
    if (!container) return;
    container.style.display = 'block';
    const baseUrl = this.getBaseUrl();
    container.innerHTML = this.tables.map(table => {
      const targetUrl = `${baseUrl}/?table=${table.id}`;
      return `
        <div class="print-tent-container">
          <div class="print-tent-brand">☕ COFFEE CULTURE</div>
          <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:6px;">The Ristorante Lounge • Jabalpur</div>
          <div class="print-tent-table">${table.name}</div>
          <div class="print-tent-qr"><img src="${this.getQrSrc(table.id)}" alt="QR" onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent('${targetUrl}')" /></div>
          <div class="print-tent-instructions"><strong>Scan to Browse Menu &amp; Order Directly</strong><br>Instant Kitchen Dispatch &bull; Seamless Digital Billing</div>
        </div>`;
    }).join('');
  }

  printSingle(tableId) {
    const table = this.tables.find(t => t.id === tableId);
    const container = document.getElementById('print-tents-container');
    if (!table || !container) return;
    container.style.display = 'block';
    const targetUrl = `${this.getBaseUrl()}/?table=${tableId}`;
    container.innerHTML = `
      <div class="print-tent-container">
        <div class="print-tent-brand">☕ COFFEE CULTURE</div>
        <div style="font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:6px;">The Ristorante Lounge • Jabalpur</div>
        <div class="print-tent-table">${table.name}</div>
        <div class="print-tent-qr"><img src="${this.getQrSrc(tableId)}" alt="QR" onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent('${targetUrl}')" /></div>
        <div class="print-tent-instructions"><strong>Scan to Browse Menu &amp; Order Directly</strong><br>Instant Kitchen Dispatch &bull; Seamless Digital Billing</div>
      </div>`;
    setTimeout(() => window.print(), 300);
  }
}

window.qrHubApp = new QrHubApp();