(function () {
  let isRunning = false;
  let filledCount = 0;
  let settings = {};
  let widget = null;

  /* =========================
     WIDGET
     ========================= */
  function createWidget() {
    if (widget) return;

    widget = document.createElement('div');
    widget.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:999999;
      background:#111827;color:#fff;padding:10px;
      border-radius:8px;font-size:12px
    `;
    widget.innerHTML = `
      <b>FormFiller</b><br>
      <span id="ff-count">0</span> páginas<br><br>
      <button id="ff-start">▶</button>
      <button id="ff-stop">⏹</button>
    `;
    document.body.appendChild(widget);

    document.getElementById('ff-start').onclick = () => {
      isRunning = true;
      filledCount = 0;
      run();
    };
    document.getElementById('ff-stop').onclick = stop;
  }

  /* =========================
     HELPERS
     ========================= */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isVisible = el => el && el.offsetParent !== null;

  function randomDate() {
    const d = new Date(
      1970 + Math.floor(Math.random() * 40),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    );
    return {
      iso: d.toISOString().slice(0, 10),
      mdY: `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`,
      dmY: `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
    };
  }

  function detectDateFormat(ph = '') {
    ph = ph.toLowerCase();
    if (ph.includes('mm') && ph.includes('dd')) return 'mdY';
    if (ph.includes('dd') && ph.includes('mm')) return 'dmY';
    return 'mdY';
  }

  async function typeValue(el, value) {
    el.focus();
    el.value = '';
    for (let i = 0; i < value.length; i++) {
      if (!isRunning) return;
      el.value += value[i];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(25);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  /* =========================
     FILLERS
     ========================= */
  async function fillInput(el) {
    if (!isRunning) return;

    const type = (el.type || '').toLowerCase();
    const ph = el.placeholder || '';
    const name = (el.name || el.id || '').toLowerCase();

    if (type === 'date') {
      await typeValue(el, randomDate().iso);
      return;
    }

    if (name.includes('date') || ph.includes('mm') || ph.includes('dd')) {
      const d = randomDate();
      const fmt = detectDateFormat(ph);
      await typeValue(el, d[fmt]);
      return;
    }

    await typeValue(el, 'Texto automático');
  }

  function fillSelect(el) {
    if (!isRunning) return;
    const opts = [...el.options].filter(o => o.value);
    if (opts.length) {
      el.value = opts[Math.floor(Math.random() * opts.length)].value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function fillCheckbox(el) {
    if (!isRunning) return;
    if (!el.checked) el.click();
  }

  async function fillContentEditable(el) {
    if (!isRunning) return;
    el.focus();
    el.innerText = 'Texto automático';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  async function fillCustomDropdown(el) {
    if (!isRunning) return;
    el.click();
    await sleep(300);
    if (!isRunning) return;
    const opts = document.querySelectorAll('[role=option]');
    if (opts.length) opts[Math.floor(Math.random() * opts.length)].click();
  }

  /* =========================
     CORE
     ========================= */
  async function fillPage() {
    let didFill = false;

    const inputs = document.querySelectorAll('input:not([type=hidden]),textarea');
    for (const el of inputs) {
      if (!isRunning) return false;
      if (isVisible(el) && !el.disabled && (!el.value || el.value.length < 2)) {
        await fillInput(el);
        didFill = true;
        await sleep(settings.delay || 300);
      }
    }

    for (const el of document.querySelectorAll('select')) {
      if (!isRunning) return false;
      if (isVisible(el) && el.selectedIndex <= 0) {
        fillSelect(el);
        didFill = true;
      }
    }

    for (const el of document.querySelectorAll('input[type=checkbox]')) {
      if (!isRunning) return false;
      if (isVisible(el)) fillCheckbox(el);
    }

    for (const el of document.querySelectorAll('[contenteditable=true]')) {
      if (!isRunning) return false;
      if (isVisible(el) && !el.innerText.trim()) {
        await fillContentEditable(el);
        didFill = true;
      }
    }

    for (const el of document.querySelectorAll('[role=combobox],[aria-haspopup=listbox]')) {
      if (!isRunning) return false;
      await fillCustomDropdown(el);
      didFill = true;
    }

    if (didFill) {
      filledCount++;
      document.getElementById('ff-count').textContent = filledCount;
    }

    return didFill;
  }

  async function run() {
    if (!isRunning) return;
    await fillPage();
    await sleep(800);
    if (isRunning) run();
  }

  function stop() {
    isRunning = false;
    console.log('FormFiller stopped');
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'start') {
      settings = msg.settings || {};
      isRunning = true;
      run();
    }
    if (msg.action === 'stop') stop();
  });

  createWidget();
})();
