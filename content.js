(function () {
  let isRunning = false, filledCount = 0, settings = {}, savedState = null, widget = null;

  /* =========================
     WIDGET (igual ao original)
     ========================= */
  const widgetCSS = `
    #formfiller-widget { position: fixed; top: 20px; right: 20px; width: 200px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 1px solid #374151; border-radius: 12px; padding: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #eaeaea; cursor: move; user-select: none; }
  `;

  function createWidget() {
    if (widget) return;
    const style = document.createElement('style');
    style.textContent = widgetCSS;
    document.head.appendChild(style);

    widget = document.createElement('div');
    widget.id = 'formfiller-widget';
    widget.innerHTML = `
      <strong>🔧 FormFiller</strong><br>
      <span id="ff-count">0</span> páginas<br><br>
      <button id="ff-start">▶ Iniciar</button>
      <button id="ff-stop" disabled>⏹ Parar</button>
    `;
    document.body.appendChild(widget);

    document.getElementById('ff-start').onclick = () => {
      isRunning = true;
      filledCount = 0;
      clearState();
      runFormFiller();
    };
    document.getElementById('ff-stop').onclick = stop;
  }

  /* =========================
     GERADORES
     ========================= */
  const gen = {
    firstName: () => ['João','Maria','Pedro','Ana','Carlos'][Math.floor(Math.random()*5)],
    lastName: () => ['Silva','Santos','Costa','Pereira'][Math.floor(Math.random()*4)],
    fullName: () => `${gen.firstName()} ${gen.lastName()}`,
    email: () => `teste${Date.now()}@exemplo.com`,
    phone: () => '91' + Math.floor(Math.random()*10000000).toString().padStart(7,'0'),
    date: () => `199${Math.floor(Math.random()*10)}-0${Math.floor(Math.random()*9)+1}-1${Math.floor(Math.random()*9)}`,
    paragraph: () => 'Texto de teste automático.',
    sentence: () => 'Resposta automática.'
  };

  /* =========================
     HELPERS
     ========================= */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isVisible = el => el && el.offsetParent !== null;

  function getValue(f) {
    const t = (f.type || '').toLowerCase();
    const name = (f.name || f.id || '').toLowerCase();
    if (t === 'email' || name.includes('email')) return gen.email();
    if (t === 'tel') return gen.phone();
    if (t === 'date') return gen.date();
    if (f.tagName === 'TEXTAREA') return gen.paragraph();
    return gen.sentence();
  }

  async function fillField(f) {
    const v = getValue(f);
    f.focus();
    f.value = '';
    for (let i = 0; i < v.length; i++) {
      f.value = v.slice(0, i + 1);
      f.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(15);
    }
    f.dispatchEvent(new Event('change', { bubbles: true }));
    f.blur();
  }

  function fillSelect(s) {
    const opts = [...s.options].filter(o => o.value);
    if (opts.length) {
      s.value = opts[Math.floor(Math.random() * opts.length)].value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function fillCheckbox(c) {
    if (!c.checked) {
      c.click();
    }
  }

  function fillRadio(radios) {
    radios[Math.floor(Math.random() * radios.length)].click();
  }

  function fillCustomDropdown(el) {
    el.click();
    setTimeout(() => {
      const options = document.querySelectorAll('[role="option"]');
      if (options.length) {
        options[Math.floor(Math.random() * options.length)].click();
      }
    }, 300);
  }

  /* =========================
     CORE
     ========================= */
  async function fillPage() {
    let filled = false;

    const inputs = document.querySelectorAll(
      'input:not([type=hidden]), textarea'
    );

    for (const f of inputs) {
      if (!isRunning) return false;
      if (isVisible(f) && !f.disabled && (!f.value || f.value.length < 2)) {
        await fillField(f);
        filled = true;
        await sleep(settings.delay || 300);
      }
    }

    document.querySelectorAll('select').forEach(s => {
      if (isVisible(s) && s.selectedIndex <= 0) {
        fillSelect(s);
        filled = true;
      }
    });

    document.querySelectorAll('input[type=checkbox]').forEach(fillCheckbox);

    const radios = {};
    document.querySelectorAll('input[type=radio]').forEach(r => {
      radios[r.name] = radios[r.name] || [];
      radios[r.name].push(r);
    });
    Object.values(radios).forEach(g => fillRadio(g));

    document.querySelectorAll('[contenteditable=true]').forEach(el => {
      if (isVisible(el) && !el.innerText.trim()) {
        el.innerText = gen.paragraph();
        el.dispatchEvent(new Event('input', { bubbles: true }));
        filled = true;
      }
    });

    document.querySelectorAll('[role=combobox],[aria-haspopup=listbox]')
      .forEach(fillCustomDropdown);

    if (filled) {
      filledCount++;
      document.getElementById('ff-count').textContent = filledCount;
      saveState();
    }

    return filled;
  }

  async function runFormFiller() {
    if (!isRunning) return;
    await fillPage();
    await sleep(800);
    if (isRunning) runFormFiller();
  }

  function stop() {
    isRunning = false;
    saveState();
  }

  function saveState() {
    chrome.storage.local.set({ formFillerState: { filledCount } });
  }
  function clearState() {
    chrome.storage.local.remove(['formFillerState']);
  }

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'start') {
      settings = msg.settings || {};
      isRunning = true;
      runFormFiller();
    }
    if (msg.action === 'stop') stop();
  });

  createWidget();
})();
