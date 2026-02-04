(() => {
  let isRunning = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isVisible = (el) => el && el.offsetParent !== null;

  // Retorna data aleatória no formato ISO yyyy-mm-dd (para input type=date)
  function randomDateISO() {
    const start = new Date(1980, 0, 1).getTime();
    const end = new Date(2010, 11, 31).getTime();
    const date = new Date(start + Math.random() * (end - start));
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Preenche campo texto ou date com valor apropriado
  async function fillInput(el) {
    if (!isVisible(el) || el.disabled) return;

    if (el.type === "date") {
      const dateVal = randomDateISO();
      console.log(`Filling date input: ${dateVal}`);
      el.value = dateVal;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    // Tentativa de preencher campos de texto que pareçam datas (placeholder ou name)
    const namePlaceholder = (el.name + el.placeholder).toLowerCase();
    const datePattern = /(date|data|birth|dob|dd|mm|yyyy)/;
    if (datePattern.test(namePlaceholder)) {
      // Formato mm/dd/yyyy simples
      const date = new Date(
        1980 + Math.floor(Math.random() * 30),
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28) + 1
      );
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const yyyy = date.getFullYear();
      const val = `${mm}/${dd}/${yyyy}`;
      console.log(`Filling text date field: ${val}`);
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    // Preenche texto normal
    const text = "Texto automático";
    console.log(`Filling text input: ${text}`);
    el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Preenche selects com opção aleatória
  function fillSelect(el) {
    if (!isVisible(el) || el.disabled) return;
    const options = Array.from(el.options).filter((o) => o.value);
    if (options.length === 0) return;
    const opt = options[Math.floor(Math.random() * options.length)];
    el.value = opt.value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    console.log(`Filling select with value: ${opt.value}`);
  }

  // Marca checkbox se não estiver marcado
  function fillCheckbox(el) {
    if (!isVisible(el) || el.disabled) return;
    if (!el.checked) {
      el.click();
      console.log(`Checking checkbox`);
    }
  }

  // Percorre campos da página e preenche-os
  async function fillPage() {
    if (!isRunning) return;

    const inputs = document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), textarea");
    for (const el of inputs) {
      if (!isRunning) break;
      if (el.value && el.value.length > 0) continue; // pula preenchidos
      await fillInput(el);
      await sleep(150);
    }

    const selects = document.querySelectorAll("select");
    for (const el of selects) {
      if (!isRunning) break;
      fillSelect(el);
    }

    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    for (const el of checkboxes) {
      if (!isRunning) break;
      fillCheckbox(el);
    }
  }

  // Loop principal enquanto isRunning = true
  async function run() {
    console.log("FormFiller iniciado");
    while (isRunning) {
      await fillPage();
      await sleep(1000);
    }
    console.log("FormFiller parado");
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "start") {
      if (isRunning) return;
      isRunning = true;
      run();
    } else if (msg.action === "stop") {
      isRunning = false;
    }
  });
})();
