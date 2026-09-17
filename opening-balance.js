(() => {
  const URL = "https://ouyxhcmjwrqfmlqzuagj.supabase.co";
  const KEY = "sb_publishable_NW2jRbkdYVN1IxLqeIv2mA_sltgk_QZ";
  const client = window.supabase?.createClient(URL, KEY);
  const LOCAL = "cbt_opening_balance";
  const money = v => new Intl.NumberFormat("id-ID", {style:"currency", currency:"IDR", maximumFractionDigits:0}).format(Number(v)||0);
  const el = () => document.querySelector("#openingBalance");
  const toast = msg => { const t=document.querySelector("#toast"); if(!t)return; t.textContent=msg; t.classList.add("show"); clearTimeout(window.__obToast); window.__obToast=setTimeout(()=>t.classList.remove("show"),2800); };
  let opening = Number(localStorage.getItem(LOCAL) || 0);

  async function load(){
    if(!client) return;
    const {data,error}=await client.from("cash_settings").select("opening_balance").eq("id",true).maybeSingle();
    if(error){ console.warn("Opening balance Supabase:",error); return; }
    if(data) { opening=Number(data.opening_balance)||0; localStorage.setItem(LOCAL,String(opening)); }
  }
  async function save(value){
    opening=value; localStorage.setItem(LOCAL,String(value));
    if(!client){toast("Uang awal tersimpan di perangkat");return;}
    const {error}=await client.from("cash_settings").upsert({id:true,opening_balance:value,updated_at:new Date().toISOString()});
    if(error){console.error(error);toast("❌ Gagal sinkron Uang awal: "+error.message);return;}
    toast("✅ Uang awal tersimpan & tersinkron");
  }
  function render(){ const node=el(); if(!node)return; node.textContent=money(opening); node.title="Klik untuk mengubah Uang awal"; node.style.cursor="pointer"; node.onclick=async()=>{const raw=prompt("Masukkan Uang awal:",String(opening).replace(/\.00$/,"")); if(raw===null)return; const digits=raw.replace(/\D/g,""); const value=Number(digits); if(!Number.isFinite(value)||value<0){toast("⚠ Nominal Uang awal tidak valid");return;} await save(value);}; }
  async function init(){await load();render();}
  document.addEventListener("DOMContentLoaded",init);
  setInterval(()=>{if(document.querySelector("#dashboard"))render();},2000);
})();
