(() => {
  "use strict";
  const KEY = "cbt_preview_tx";
  let transactions = load();
  let activeType = "masuk";
  let activeFilter = "semua";
  let editingId = null;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function today() { return new Date().toISOString().slice(0, 10); }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(data)) return [];
      return data.map(item => ({
        id: item.id || crypto.randomUUID?.() || String(Date.now()),
        d: item.d || today(),
        t: item.t === "keluar" ? "keluar" : "masuk",
        a: Number(item.a) || 0,
        c: String(item.c || "Lain-lain"),
        x: String(item.x || "")
      }));
    } catch { return []; }
  }

  function save() { localStorage.setItem(KEY, JSON.stringify(transactions)); }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 2500);
  }

  function go(page) {
    $$(".page").forEach(el => el.classList.toggle("active", el.id === page));
    if (page === "dashboard") renderDashboard();
    if (page === "transactions") renderTransactions();
    if (location.hash !== "#" + page) history.replaceState(null, "", "#" + page);
  }

  $$('[data-page]').forEach(el => el.addEventListener("click", e => { e.preventDefault(); go(el.dataset.page); }));

  $$(".seg").forEach(button => button.addEventListener("click", () => {
    $$(".seg").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeType = button.dataset.type;
  }));

  if ($("#date")) $("#date").value = today();

  $("#txForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const amount = Number($("#amount")?.value);
    const category = $("#category")?.value.trim() || "Lain-lain";
    const description = $("#description")?.value.trim() || "";
    const date = $("#date")?.value;

    if (!Number.isFinite(amount) || amount <= 0) return toast("⚠ Isi nominal lebih dari 0");
    if (!date || Number.isNaN(Date.parse(date))) return toast("⚠ Tanggal tidak valid");

    if (editingId) {
      const index = transactions.findIndex(item => String(item.id) === String(editingId));
      if (index === -1) return cancelEdit();
      transactions[index] = { ...transactions[index], d: date, t: activeType, a: amount, c: category, x: description };
      save();
      cancelEdit(false);
      renderTransactions();
      renderDashboard();
      toast("✅ Transaksi berhasil diperbarui");
      return;
    }

    transactions.unshift({ id: crypto.randomUUID?.() || String(Date.now()), d: date, t: activeType, a: amount, c: category, x: description });
    save();
    event.target.reset();
    $("#date").value = today();
    renderTransactions();
    renderDashboard();
    toast(`✅ ${activeType === "masuk" ? "Uang masuk" : "Uang keluar"} ${rupiah(amount)} tersimpan`);
  });

  function startEdit(id) {
    const transaction = transactions.find(item => String(item.id) === String(id));
    if (!transaction) return toast("⚠ Transaksi tidak ditemukan");
    editingId = transaction.id;
    activeType = transaction.t === "keluar" ? "keluar" : "masuk";
    $$(".seg").forEach(button => button.classList.toggle("active", button.dataset.type === activeType));
    $("#amount").value = transaction.a;
    $("#category").value = transaction.c || "";
    $("#description").value = transaction.x || "";
    $("#date").value = transaction.d || today();
    const submit = $('#txForm button[type="submit"]');
    if (submit) submit.textContent = "💾 Simpan Perubahan";
    let cancel = $("#cancelEdit");
    if (!cancel) {
      cancel = document.createElement("button");
      cancel.type = "button";
      cancel.id = "cancelEdit";
      cancel.className = "btn secondary";
      cancel.textContent = "Batal Edit";
      cancel.addEventListener("click", () => cancelEdit());
      submit.parentElement.appendChild(cancel);
    }
    cancel.style.display = "inline-flex";
    go("transactions");
    setTimeout(() => $("#amount")?.focus(), 100);
    toast("✏️ Mode edit aktif");
  }

  function cancelEdit(showMessage = true) {
    editingId = null;
    $("#txForm")?.reset();
    if ($("#date")) $("#date").value = today();
    activeType = "masuk";
    $$(".seg").forEach(button => button.classList.toggle("active", button.dataset.type === "masuk"));
    const submit = $('#txForm button[type="submit"]');
    if (submit) submit.textContent = "Simpan Transaksi";
    $("#cancelEdit")?.remove();
    if (showMessage) toast("✖ Edit dibatalkan");
  }

  $$(".filter").forEach(button => button.addEventListener("click", () => {
    $$(".filter").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderTransactions();
  }));

  $("#search")?.addEventListener("input", renderTransactions);

  function filteredTransactions() {
    const query = $("#search")?.value.trim().toLowerCase() || "";
    return transactions.filter(transaction => {
      const typeMatch = activeFilter === "semua" || transaction.t === activeFilter;
      const searchMatch = !query || [transaction.c, transaction.x, transaction.a].some(value => String(value ?? "").toLowerCase().includes(query));
      return typeMatch && searchMatch;
    });
  }

  function renderTransactions() {
    const list = $("#txList");
    if (!list) return;
    const data = filteredTransactions();
    if (!data.length) {
      list.innerHTML = '<div class="empty">Belum ada transaksi.</div>';
      return;
    }
    list.innerHTML = data.map(transaction => {
      const isIn = transaction.t === "masuk";
      const date = new Date(transaction.d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
      return `<div class="tx ${isIn ? "in" : "out"}"><div class="tx-icon">${isIn ? "↗" : "↘"}</div><div class="tx-main"><b>${esc(transaction.x || transaction.c)}</b><small>${esc(transaction.c || "Lain-lain")} • ${esc(date)}</small><span class="tx-type">${isIn ? "UANG MASUK" : "UANG KELUAR"}</span></div><div class="tx-amount ${isIn ? "positive" : "negative"}">${isIn ? "+" : "−"} ${rupiah(transaction.a)}</div><div class="tx-actions"><button type="button" class="edit" data-edit-id="${esc(transaction.id)}" title="Edit transaksi">✏️</button><button type="button" class="delete" data-delete-id="${esc(transaction.id)}" title="Hapus transaksi">🗑️</button></div></div>`;
    }).join("");

    $$(".edit").forEach(button => button.addEventListener("click", () => startEdit(button.dataset.editId)));
    $$(".delete").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.deleteId;
      const transaction = transactions.find(item => String(item.id) === String(id));
      if (!transaction) return;
      if (!confirm(`Hapus transaksi ${rupiah(transaction.a)}?`)) return;
      transactions = transactions.filter(item => String(item.id) !== String(id));
      save();
      renderTransactions();
      renderDashboard();
      toast("🗑️ Transaksi dihapus");
    }));
  }

  function renderDashboard() {
    const income = transactions.filter(item => item.t === "masuk").reduce((sum, item) => sum + Number(item.a || 0), 0);
    const expense = transactions.filter(item => item.t === "keluar").reduce((sum, item) => sum + Number(item.a || 0), 0);
    if ($("#income")) $("#income").textContent = rupiah(income);
    if ($("#expense")) $("#expense").textContent = rupiah(expense);
    if ($("#balance")) $("#balance").textContent = rupiah(income - expense);
    renderCashChart();
    renderCategories();
  }

  function renderCashChart() {
    const chart = $("#cashChart");
    if (!chart) return;
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      const masuk = transactions.filter(item => item.d === key && item.t === "masuk").reduce((sum, item) => sum + Number(item.a || 0), 0);
      const keluar = transactions.filter(item => item.d === key && item.t === "keluar").reduce((sum, item) => sum + Number(item.a || 0), 0);
      data.push({ label: date.toLocaleDateString("id-ID", { weekday: "short" }), masuk, keluar });
    }
    const max = Math.max(1, ...data.flatMap(item => [item.masuk, item.keluar]));
    chart.innerHTML = data.map(item => `<div class="bar-day"><div class="bar" title="Masuk ${rupiah(item.masuk)}" style="height:${Math.max(3, item.masuk / max * 90)}%"></div><div class="bar out" title="Keluar ${rupiah(item.keluar)}" style="height:${Math.max(3, item.keluar / max * 90)}%"></div><label>${esc(item.label)}</label></div>`).join("");
  }

  function renderCategories() {
    const chart = $("#categoryChart");
    if (!chart) return;
    const categories = {};
    transactions.filter(item => item.t === "keluar").forEach(item => { categories[item.c] = (categories[item.c] || 0) + Number(item.a || 0); });
    const rows = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (!rows.length) {
      chart.innerHTML = '<div class="empty">Belum ada pengeluaran.</div>';
      return;
    }
    const max = rows[0][1] || 1;
    chart.innerHTML = rows.map(([name, value]) => `<div class="cat-row"><span class="cat-name">${esc(name)}</span><div class="track"><i style="width:${value / max * 100}%"></i></div><span class="cat-value">${rupiah(value)}</span></div>`).join("");
  }

  if (!transactions.length) {
    transactions = [
      { id: "demo-1", d: today(), t: "masuk", a: 247500, c: "Penjualan Warung", x: "Setoran Warung Bu Siti" },
      { id: "demo-2", d: today(), t: "keluar", a: 100000, c: "Transportasi", x: "BBM antar grosir" }
    ];
    save();
  }

  const initial = location.hash.slice(1);
  go(["home", "dashboard", "transactions"].includes(initial) ? initial : "home");

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("./service-worker.js").catch(() => {}); });
  }
})();
