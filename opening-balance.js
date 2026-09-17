(() => {
  const URL = "https://ouyxhcmjwrqfmlqzuagj.supabase.co";
  const KEY = "sb_publishable_NW2jRbkdYVN1IxLqeIv2mA_sltgk_QZ";
  const client = window.supabase?.createClient(URL, KEY);

  const money = v => new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0
  }).format(Number(v) || 0);

  const el = () => document.querySelector("#openingBalance");
  const toast = msg => {
    const t = document.querySelector("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__obToast);
    window.__obToast = setTimeout(() => t.classList.remove("show"), 2800);
  };

  let opening = 0;
  let loading = false;

  function publish() {
    window.__openingBalance = opening;
    window.dispatchEvent(new CustomEvent("opening-balance-changed", { detail: opening }));
  }

  async function load() {
    if (!client) {
      console.error("Supabase client tidak tersedia");
      return false;
    }
    const { data, error } = await client
      .from("cash_settings")
      .select("opening_balance, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) {
      console.error("Opening balance Supabase:", error);
      toast("❌ Gagal mengambil Saldo awal dari Supabase");
      return false;
    }
    opening = Number(data?.opening_balance) || 0;
    publish();
    render();
    return true;
  }

  async function save(value) {
    if (!client) {
      toast("❌ Supabase tidak tersedia");
      return false;
    }
    loading = true;
    const { data, error } = await client
      .from("cash_settings")
      .upsert({ id: true, opening_balance: value, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("opening_balance")
      .single();
    loading = false;
    if (error) {
      console.error("Save opening balance:", error);
      toast("❌ Gagal menyimpan Saldo awal: " + error.message);
      return false;
    }
    opening = Number(data?.opening_balance) || 0;
    publish();
    render();
    toast("✅ Saldo awal tersimpan");
    return true;
  }

  function render() {
    const node = el();
    if (!node) return;
    node.textContent = money(opening);
    node.title = "Klik untuk mengubah Saldo awal";
    node.style.cursor = "pointer";
    node.onclick = async () => {
      if (loading) return;
      const raw = prompt("Masukkan Saldo awal kas usaha:", String(Math.trunc(opening)));
      if (raw === null) return;
      const digits = raw.replace(/\D/g, "");
      const value = Number(digits);
      if (!Number.isFinite(value) || value < 0) {
        toast("⚠ Nominal Saldo awal tidak valid");
        return;
      }
      await save(value);
    };
  }

  async function init() {
    publish();
    render();
    await load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  setInterval(() => {
    if (document.querySelector("#dashboard")) load();
  }, 10000);
})();
