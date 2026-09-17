(() => {
  "use strict";

  const SUPABASE_URL = "https://ouyxhcmjwrqfmlqzuagj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_NW2jRbkdYVN1IxLqeIv2mA_sltgk_QZ";
  const LOCAL_KEY = "cbt_preview_tx";

  const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  let currentUser = null;
  let cloudEnabled = !!supabaseClient;
  let transactions = loadLocal();
  let activeType = "masuk";
  let activeFilter = "semua";
  let editingId = null;
  let booting = true;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  function rupiah(value) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  }

  function today() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function newId() {
    return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeLocal(item) {
    return {
      id: item.id || newId(),
      d: item.d || item.transaction_date || today(),
      t: item.t === "keluar" || item.type === "keluar" ? "keluar" : "masuk",
      a: Number(item.a ?? item.amount) || 0,
      c: String(item.c ?? item.category ?? "Lain-lain"),
      x: String(item.x ?? item.description ?? "")
    };
  }

  function loadLocal() {
    try {
      const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return Array.isArray(data) ? data.map(normalizeLocal).filter(x => x.a > 0) : [];
    } catch { return []; }
  }

  function saveLocal() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions));
  }

  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  async function cloudInsert(tx) {
    if (!cloudEnabled || !currentUser) return false;
    const { error } = await supabaseClient.from("transactions").insert({
      id: tx.id,
      user_id: currentUser.id,
      type: tx.t,
      amount: tx.a,
      category: tx.c,
      description: tx.x,
      transaction_date: tx.d
    });
    if (error) throw error;
    return true;
  }

  async function cloudUpdate(tx) {
    if (!cloudEnabled || !currentUser) return false;
    const { error } = await supabaseClient.from("transactions").update({
      type: tx.t,
      amount: tx.a,
      category: tx.c,
      description: tx.x,
      transaction_date: tx.d
    }).eq("id", tx.id).eq("user_id", currentUser.id);
    if (error) throw error;
    return true;
  }

  async function cloudDelete(id) {
    if (!cloudEnabled || !currentUser) return false;
    const { error } = await supabaseClient.from("transactions").delete().eq("id", id).eq("user_id", currentUser.id);
    if (error) throw error;
    return true;
  }

  async function cloudLoad() {
    if (!cloudEnabled || !currentUser) return [];
    const { data, error } = await supabaseClient.from("transactions")
      .select("id,user_id,type,amount,category,description,transaction_date,created_at")
      .eq("user_id", currentUser.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeLocal);
  }

  async function initializeCloud() {
    if (!supabaseClient) return;

    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;

    if (sessionData.session?.user) {
      currentUser = sessionData.session.user;
    } else {
      const { data, error } = await supabaseClient.auth.signInAnonymously();
      if (error) throw error;
      currentUser = data.user;
    }

    const remote = await cloudLoad();

    // First installation: migrate old localStorage records to Supabase.
    if (!remote.length && transactions.length) {
      for (const tx of transactions) {
        try { await cloudInsert(tx); } catch (e) { console.warn("Migration gagal", e); }
      }
      transactions = await cloudLoad();
    } else {
      transactions = remote;
    }

    saveLocal();
  }

  function setBootStatus() {
    const brand = document.querySelector(".brand small");
    if (brand) brand.textContent = cloudEnabled && currentUser ? "Telur · Cloud" : "Telur · Lokal";
  }

  async function boot() {
    try {
      if (cloudEnabled) {
        await initializeCloud();
      }
    } catch (error) {
      console.error("Supabase gagal:", error);
      cloudEnabled = false;
      setBootStatus();
      toast("⚠ Supabase belum aktif. Data tetap disimpan lokal.");
    }

    booting = false;
    setBootStatus();
    renderTransactions();
    renderDashboard();
  }

  function go(page) {
    $$(".page").forEach(el => el.classList.toggle("active", el.id === page));
    if (page === "dashboard") renderDashboard();
    if (page === "transactions") renderTransactions();
    if (location.hash !== "#" + page) history.replaceState(null, "", "#" + page);
  }

  $$('[data-page]').forEach(el => el.addEventListener("click", e => {
    e.preventDefault();
    go(el.dataset.page);
  }));

  $$(".seg").forEach(button => button.addEventListener("click", () => {
    $$(".seg").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    activeType = button.dataset.type;
  }));

  if ($("#date")) $("#date").value = today();

  $("#txForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (booting) return toast("⏳ Menyiapkan database...");

    const amount = Number($("#amount")?.value);
    const category = $("#category")?.value.trim() || "Lain-lain";
    const description = $("#description")?.value.trim() || "";
    const date = $("#date")?.value;

    if (!Number.isFinite(amount) || amount <= 0) return toast("⚠ Isi nominal lebih dari 0");
    if (!date || Number.isNaN(Date.parse(date))) return toast("⚠ Tanggal tidak valid");

    const tx = { id: editingId || newId(), d: date, t: activeType, a: amount, c: category, x: description };
    const button = event.submitter;
    if (button) button.disabled = true;

    try {
      if (editingId) {
        const index = transactions.findIndex(item => String(item.id) === String(editingId));
        if (index === -1) throw new Error("Transaksi tidak ditemukan");
        if (cloudEnabled) await cloudUpdate(tx);
        transactions[index] = tx;
        toast("✅ Transaksi berhasil diperbarui");
      } else {
        if (cloudEnabled) await cloudInsert(tx);
        transactions.unshift(tx);
        toast(`✅ ${activeType === "masuk" ? "Uang masuk" : "Uang keluar"} ${rupiah(amount)} tersimpan`);
      }

      saveLocal();
      cancelEdit(false);
      renderTransactions();
      renderDashboard();
    } catch (error) {
      console.error(error);
      toast(`❌ Gagal menyimpan: ${error.message || "periksa Supabase"}`);
    } finally {
      if (button) button.disabled = false;
    }
  });

  function startEdit(id) {
    const transaction = transactions.find(item => String(item.id) === String(id));
    if (!transaction) return toast("⚠ Transaksi tidak ditemukan");

    editingId = transaction.id;
    activeType = transaction.t;
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
    $$(".delete").forEach(button => button.addEventListener("click", async () => {
      const id = button.dataset.deleteId;
      const transaction = transactions.find(item => String(item.id) === String(id));
      if (!transaction) return;
      if (!confirm(`Hapus transaksi ${rupiah(transaction.a)}?`)) return;

      button.disabled = true;
      try {
        if (cloudEnabled) await cloudDelete(id);
        transactions = transactions.filter(item => String(item.id) !== String(id));
        saveLocal();
        renderTransactions();
        renderDashboard();
        toast("🗑️ Transaksi dihapus");
      } catch (error) {
        console.error(error);
        toast(`❌ Gagal menghapus: ${error.message || "periksa Supabase"}`);
        button.disabled = false;
      }
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

  const initial = location.hash.slice(1);
  go(["home", "dashboard", "transactions"].includes(initial) ? initial : "home");
  boot();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
})();
