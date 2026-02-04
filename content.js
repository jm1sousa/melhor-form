(function () {
  let isRunning = false;
  let settings = {};

  /* =========================
     HELPERS
     ========================= */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isVisible = el =>
    el &&
    el.offsetParent !== null &&
    getComputedStyle(el).visibility !== 'hidden';

  function randomDateParts() {
    const d = new Date(
      1980 + Math.floor(Math.random() * 30),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    );
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return { dd, mm, yyyy };
  }

  function buildDateForField(el) {
    const ph = (el.placeholder || '').toLowerCase();
    const name = (el.name || el.id || '').toLowerCase();
    const { dd, mm, yyyy } = randomDateParts();

    if (ph.includes('mm') && ph.includes('dd')) return `${mm}/${dd}/${yyyy}`;
    if (ph.includes('dd') && ph.includes('mm')) return `${dd}/${mm}/${yyyy}`;
    if (ph.includes('yyyy') && ph.includes('mm')) return `${yyyy}-${mm}-${dd}`;
    if (name.includes('birth') || name.includes('date')) return `${mm}/${dd}/${yyyy}`;

    // fallback seguro
    return `${mm}/${dd}/${yyyy}`;
  }

  async function typeLikeHuman(el, text) {
    el.focus();
    el.value = '';

    for (const char of text) {
      if (!isRunning) return;

      const keyCode = char.charCodeAt(0);

      el.dispatchEvent(new KeyboardEvent('keydown', { key: char, keyCode, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key: char, keyCode, bubbles: true }));

      el.value += char;
      el.dispatchEvent(new Event('input', { bubbles: true }));

      el.dispatchEvent(new KeyboardEvent('keyup', { key: char, keyCode, bubbles: true }));

      await sleep(40);
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  function looksLikeDateField(el) {
    const type = (el.type || '').toLowerCase();
    const name = (el.name || el.id || '').toLowerCase();
    const ph = (el.placeholder || '').toLowerCase();

    return (
      type === 'date' ||
      name.includes('date') ||
      name.includes('birth') ||
      ph.includes('dd') ||
      ph.includes('mm') ||
      ph.includes('yyyy')
    );
  }

  /* =========================
     FILLERS
     ========================= */
  async function fillInput(el) {
    if (!isRunning) return;

    if (looksLikeDateField(el)) {
      const dateStr = buildDateForField(el);
      await typeLikeHuman(el, dateStr);
      return;
    }

    await typeLikeHuman(el, 'Texto automático');
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
    const inputs = document.querySelectorAll('input:not([type=hidden]), textarea');

    for (const el of inputs) {
      if (!isRunning) return;
      if (isVisible(el) && !el.disabled && (!el.value || el.value.length < 2)) {
        await fillInput(el);
        await sleep(settings.delay || 300);
      }
    }

    for (const el of document.querySelectorAll('select')) {
      if (!isRunning) return;
      if (isVisible(el) && el.selectedIndex <= 0) fillSelect(el);
    }

    for (const el of document.querySelectorAll('input[type=checkbox]')) {
      if (!isRunning) return;
      if (isVisible(el)) fillCheckbox(el);
    }

    for (const el of document.querySelectorAll('[contenteditable=true]')) {
      if (!isRunning) return;
      if (isVisible(el) && !el.innerText.trim()) await fillContentEditable(el);
    }

    for (const el of document.querySelectorAll('[role=combobox],[aria-haspopup=listbox]')) {
      if (!isRunning) return;
      await fillCustomDropdown(el);
    }
  }

  async function run() {
    if (!isRunning) return;
    await fillPage();
    await sleep(800);
    if (isRunning) run();
  }

  function stop() {
    isRunning = false;
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'start') {
      settings = msg.settings || {};
      isRunning = true;
      run();
    }
    if (msg.action === 'stop') stop();
  });
})();
