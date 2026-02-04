(() => {
  let isRunning = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isVisible = el => el && el.offsetParent !== null;

  function randomDate() {
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

  function looksLikeDate(el) {
    const t = (el.type || '').toLowerCase();
    const n = (el.name || el.id || '').toLowerCase();
    const p = (el.placeholder || '').toLowerCase();
    return (
      t === 'date' ||
      n.includes('date') ||
      n.includes('birth') ||
      p.includes('dd') ||
      p.includes('mm') ||
      p.includes('yyyy')
    );
  }

  async function typeHuman(el, value) {
    el.focus();
    el.value = '';
    for (const ch of value) {
      if (!isRunning) return;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      el.value += ch;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, bubbles: true }));
      await sleep(40);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  async function fillInput(el) {
    if (looksLikeDate(el)) {
      const { dd, mm, yyyy } = randomDate();
      const ph = (el.placeholder || '').toLowerCase();

      let val = `${mm}/${dd}/${yyyy}`;
      if (ph.includes('dd') && ph.indexOf('dd') < ph.indexOf('mm')) {
        val = `${dd}/${mm}/${yyyy}`;
      }
      if (el.type === 'date') {
        val = `${yyyy}-${mm}-${dd}`;
      }

      await typeHuman(el, val);
      return;
    }

    await typeHuman(el, 'Texto automático');
  }

  function fillSelect(el) {
    const opts = [...el.options].filter(o => o.value);
    if (opts.length) {
      el.value = opts[Math.floor(Math.random() * opts.length)].value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function fillCheckbox(el) {
    if (!el.checked) el.click();
  }

  async function fillPage() {
    const inputs = document.querySelectorAll('input:not([type=hidden]), textarea');
    for (const el of inputs) {
      if (!isRunning) return;
      if (isVisible(el) && !el.disabled && (!el.value || el.value.length < 2)) {
        await fillInput(el);
        await sleep(200);
      }
    }

    for (const el of document.querySelectorAll('select')) {
      if (!isRunning) return;
      if (isVisible(el)) fillSelect(el);
    }

    for (const el of document.querySelectorAll('input[type=checkbox]')) {
      if (!isRunning) return;
      if (isVisible(el)) fillCheckbox(el);
    }
  }

  async function run() {
    while (isRunning) {
      await fillPage();
      await sleep(800);
    }
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'start') {
      if (isRunning) return;
      isRunning = true;
      run();
    }
    if (msg.action === 'stop') {
      isRunning = false;
    }
  });
})();
