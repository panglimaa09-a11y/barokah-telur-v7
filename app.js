(() => {
  "use strict";
  const SUPABASE_URL = "https://ouyxhcmjwrqfmlqzuagj.supabase.co";
  const SUPABASE_KEY = "sb_publishable_NW2jRbkdYVN1IxLqeIv2mA_sltgk_QZ";
  const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  let cloudEnabled = !!supabaseClient;
  let transactions = [];
  let activeType = "masuk", activeFilter = "semua", editingId = null, booting = true;
  let dashboardPeriod = "month", dashboardFilter = "keluar";
  let openingBalance = Number(window.__openingBalance) || 0;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const rupiah = v => new Intl.NumberFormat("id-ID", {style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(v)||0);
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  function today(){const d=new Date(),l=new Date(d.getTime()-d.getTimezoneOffset()*60000);return l.toISOString().slice(0,10)}
  function newId(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}
  function normalize(x){return{id:x.id||newId(),d:x.d||x.transaction_date||today(),t:x.t==="keluar"||x.type==="keluar"?"keluar":"masuk",a:Number(x.a??x.amount)||0,c:String(x.c??x.category??"Lain-lain"),x:String(x.x??x.description??"")}}
  function toast(m){const e=$("#toast");if(!e)return;e.textContent=m;e.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove("show"),2800)}
  async function cloudLoad(){if(!supabaseClient)throw Error("Supabase client tidak tersedia");const{data,error}=await supabaseClient.from("transactions").select("id,type,amount,category,description,transaction_date,created_at").order("transaction_date",{ascending:false}).order("created_at",{ascending:false});if(error)throw error;return(data||[]).map(normalize)}
  async function cloudInsert(t){if(!supabaseClient)throw Error("Supabase tidak tersedia");const{error}=await supabaseClient.from("transactions").insert({id:t.id,type:t.t,amount:t.a,category:t.c,description:t.x,transaction_date:t.d});if(error)throw error}
  async function cloudUpdate(t){if(!supabaseClient)throw Error("Supabase tidak tersedia");const{error}=await supabaseClient.from("transactions").update({type:t.t,amount:t.a,category:t.c,description:t.x,transaction_date:t.d}).eq("id",t.id);if(error)throw error}
  async function cloudDelete(id){if(!supabaseClient)throw Error("Supabase tidak tersedia");const{error}=await supabaseClient.from("transactions").delete().eq("id",id);if(error)throw error}
  async function boot(){try{if(!supabaseClient)throw Error("Supabase client tidak tersedia");transactions=await cloudLoad();cloudEnabled=true;setStatus()}catch(e){console.error("Supabase boot error:",e);cloudEnabled=false;transactions=[];setStatus();toast(`❌ Database tidak terhubung: ${e.message||"cek Supabase URL, key, tabel, dan RLS"}`)}finally{booting=false;renderAll()}}
  function setStatus(){const b=document.querySelector(".brand small");if(b)b.textContent=cloudEnabled?"Telur · Cloud":"Telur · Database Offline"}
  function go(page){$$(".page").forEach(e=>e.classList.toggle("active",e.id===page));if(page==="dashboard")renderDashboard();if(page==="transactions")renderTransactions();if(location.hash!=="#"+page)history.replaceState(null,"","#"+page);window.scrollTo({top:0,behavior:"smooth"})}
  $$('[data-page]').forEach(e=>e.addEventListener("click",ev=>{ev.preventDefault();go(e.dataset.page);if($(".topbar")?.classList.contains("menu-open"))$("#navToggle")?.click()}));
  $$(".seg").forEach(b=>b.addEventListener("click",()=>{$$(".seg").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeType=b.dataset.type}));
  window.addEventListener("opening-balance-changed",e=>{openingBalance=Number(e.detail)||0;renderDashboard()});
  const amount=$("#amount");
  amount?.addEventListener("input",()=>{const digits=amount.value.replace(/\D/g,"");amount.value=digits?Number(digits).toLocaleString("id-ID"):""});
  amount?.addEventListener("keydown",e=>{if(["e","E","+","-",".",","].includes(e.key))e.preventDefault()});
  if($("#date"))$("#date").value=today();
  $("#txForm")?.addEventListener("submit",async e=>{e.preventDefault();if(booting)return toast("⏳ Menghubungkan database...");if(!cloudEnabled)return toast("❌ Database offline. Transaksi tidak disimpan lokal.");const a=Number($("#amount").value.replace(/\D/g,"")),c=$("#category").value.trim()||"Lain-lain",x=$("#description").value.trim(),d=$("#date").value;if(!a)return toast("⚠ Isi nominal lebih dari 0");if(!d)return toast("⚠ Tanggal wajib diisi");const t={id:editingId||newId(),d:d,t:activeType,a:a,c:c,x:x},btn=e.submitter;if(btn)btn.disabled=true;try{if(editingId){const i=transactions.findIndex(z=>String(z.id)===String(editingId));if(i<0)throw Error("Transaksi tidak ditemukan");await cloudUpdate(t);transactions[i]=t;toast("✅ Transaksi diperbarui")}else{await cloudInsert(t);transactions.unshift(t);toast(`✅ ${activeType==="masuk"?"Uang masuk":"Uang keluar"} ${rupiah(a)} tersimpan`)}cancelEdit(false);renderAll()}catch(err){console.error(err);toast(`❌ Gagal menyimpan: ${err.message||"periksa Supabase"}`)}finally{if(btn)btn.disabled=false}});
  function startEdit(id){const t=transactions.find(z=>String(z.id)===String(id));if(!t)return;editingId=t.id;activeType=t.t;$$(".seg").forEach(b=>b.classList.toggle("active",b.dataset.type===activeType));$("#amount").value=Number(t.a).toLocaleString("id-ID");$("#category").value=t.c;$("#description").value=t.x;$("#date").value=t.d;const s=$("#txForm button[type=submit]");s.textContent="💾 Simpan Perubahan";let c=$("#cancelEdit");if(!c){c=document.createElement("button");c.type="button";c.id="cancelEdit";c.className="btn secondary";c.textContent="Batal Edit";c.onclick=()=>cancelEdit();s.parentElement.appendChild(c)}go("transactions");setTimeout(()=>$("#amount")?.focus(),100)}
  function cancelEdit(show=true){editingId=null;$("#txForm")?.reset();if($("#date"))$("#date").value=today();activeType="masuk";$$(".seg").forEach(b=>b.classList.toggle("active",b.dataset.type==="masuk"));const s=$("#txForm button[type=submit]");if(s)s.textContent="Simpan Transaksi";$("#cancelEdit")?.remove();if(show)toast("Edit dibatalkan")}
  $$(".filter").forEach(b=>b.addEventListener("click",()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;renderTransactions()}));
  $("#search")?.addEventListener("input",renderTransactions);
  $$(".period").forEach(b=>b.addEventListener("click",()=>{$$(".period").forEach(x=>x.classList.remove("active"));b.classList.add("active");dashboardPeriod=b.dataset.period;renderDonut()}));
  $$(".cash-filter-btn").forEach(b=>b.addEventListener("click",()=>{$$(".cash-filter-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");dashboardFilter=b.dataset.chartFilter;renderDonut()}));
  $$('[data-quick-type]').forEach(b=>b.addEventListener("click",()=>{activeType=b.dataset.quickType;$$(".seg").forEach(x=>x.classList.toggle("active",x.dataset.type===activeType));setTimeout(()=>$("#amount")?.focus(),150)}));
  function renderTransactions(){const list=$("#txList");if(!list)return;const q=$("#search")?.value.trim().toLowerCase()||"";const data=transactions.filter(t=>(activeFilter==="semua"||t.t===activeFilter)&&(!q||[t.c,t.x,t.a].some(v=>String(v).toLowerCase().includes(q))));if(!data.length){list.innerHTML='<div class="empty">Belum ada transaksi.</div>';return}list.innerHTML=data.map(t=>{const i=t.t==="masuk",d=new Date(t.d+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});return`<div class="tx ${i?"in":"out"}"><div class="tx-icon">${i?"↗":"↘"}</div><div class="tx-main"><b>${esc(t.x||t.c)}</b><small>${esc(t.c)} • ${esc(d)}</small><span class="tx-type">${i?"UANG MASUK":"UANG KELUAR"}</span></div><div class="tx-amount ${i?"positive":"negative"}">${i?"+":"−"} ${rupiah(t.a)}</div><div class="tx-actions"><button type="button" class="edit" data-id="${esc(t.id)}">✏️</button><button type="button" class="delete" data-id="${esc(t.id)}">🗑️</button></div></div>`}).join("");$$('button.edit').forEach(b=>b.onclick=()=>startEdit(b.dataset.id));$$('button.delete').forEach(b=>b.onclick=async()=>{const id=b.dataset.id,t=transactions.find(z=>String(z.id)===String(id));if(!t||!confirm(`Hapus transaksi ${rupiah(t.a)}?`))return;try{await cloudDelete(id);transactions=transactions.filter(z=>String(z.id)!==String(id));renderAll();toast("🗑️ Transaksi dihapus")}catch(err){toast(`❌ Gagal menghapus: ${err.message}`)}})}
  function inPeriod(date){if(dashboardPeriod==="month"){const n=new Date(),d=new Date(date+"T00:00:00");return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()}if(dashboardPeriod==="7days"){const n=new Date(),s=new Date();s.setHours(0,0,0,0);s.setDate(s.getDate()-6);const d=new Date(date+"T00:00:00");return d>=s&&d<=n}return date===today()}
  function renderDashboard(){const n=new Date(),m=transactions.filter(t=>{const d=new Date(t.d+"T00:00:00");return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()}),inc=transactions.filter(t=>t.t==="masuk").reduce((s,t)=>s+t.a,0),out=transactions.filter(t=>t.t==="keluar").reduce((s,t)=>s+t.a,0),mi=m.filter(t=>t.t==="masuk").reduce((s,t)=>s+t.a,0),mo=m.filter(t=>t.t==="keluar").reduce((s,t)=>s+t.a,0);$("#balance")&&($("#balance").textContent=rupiah(openingBalance+inc-out));$("#income")&&($("#income").textContent=rupiah(mi));$("#expense")&&($("#expense").textContent=rupiah(mo));$("#openingBalance")&&($("#openingBalance").textContent=rupiah(openingBalance));renderDonut()}
  function renderDonut(){
    const data=transactions.filter(t=>t.t===dashboardFilter&&inPeriod(t.d));
    const total=data.reduce((s,t)=>s+t.a,0);
    const amount=$("#donutAmount"),label=$("#donutLabel"),chart=$("#donutChart");
    if(amount)amount.textContent=rupiah(total);
    if(label)label.textContent=dashboardFilter==="keluar"?"keluar":"masuk";
    if(chart)chart.style.setProperty("--progress",total?"100%":"0%");

    const box=$("#categoryChart");
    if(!box)return;

    const map={};
    data.forEach(t=>{
      const category=(t.c||"Lain-lain").trim()||"Lain-lain";
      if(!map[category])map[category]={amount:0,count:0};
      map[category].amount+=t.a;
      map[category].count++;
    });

    const categories=Object.entries(map).sort((a,b)=>b[1].amount-a[1].amount);
    if(!categories.length){
      box.innerHTML='<div class="chart-empty">Belum ada kategori '+(dashboardFilter==="keluar"?"pengeluaran":"pemasukan")+' pada periode ini.</div>';
      return;
    }

    const title=dashboardFilter==="keluar"?"Kategori Pengeluaran":"Kategori Pemasukan";
    box.innerHTML='<div class="category-title">'+title+'</div>'+
      categories.map(([category,v])=>`<div class="category-row">
        <div class="label">
          <span>${esc(category)} <small>${v.count} transaksi</small></span>
          <b>${rupiah(v.amount)}</b>
        </div>
        <div class="track"><div class="fill" style="width:${total?Math.max(4,v.amount/total*100):0}%"></div></div>
      </div>`).join("");
  }
  async function getOpeningBalanceForBackup(){
    if(!supabaseClient) return Number(openingBalance)||0;
    const {data,error}=await supabaseClient.from("cash_settings").select("opening_balance").eq("id",true).maybeSingle();
    if(error) throw error;
    return Number(data?.opening_balance)||0;
  }

  function downloadJson(filename,payload){
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function saveData(){
    if(booting)return toast("⏳ Database masih dimuat...");
    if(!cloudEnabled)return toast("❌ Database offline. Data belum bisa disimpan sebagai backup.");
    try{
      const opening=await getOpeningBalanceForBackup();
      downloadJson(`catatanbarokah-backup-${today()}.json`,{
        app:"PT GOLD OVA RAYA",
        version:1,
        exported_at:new Date().toISOString(),
        opening_balance:opening,
        transactions:transactions.map(t=>({id:t.id,type:t.t,amount:t.a,category:t.c,description:t.x,transaction_date:t.d}))
      });
      toast("✅ Backup data berhasil disimpan");
    }catch(err){
      console.error(err);
      toast("❌ Gagal membuat backup: "+(err.message||"periksa Supabase"));
    }
  }

  function openRestore(){
    if(booting)return toast("⏳ Database masih dimuat...");
    $("#restoreDataInput")?.click();
  }

  async function restoreData(file){
    if(!file)return;
    if(!cloudEnabled)return toast("❌ Database offline. Tidak bisa memulihkan data.");
    try{
      const raw=await file.text();
      const backup=JSON.parse(raw);
      if(backup?.app!=="PT GOLD OVA RAYA"||!Array.isArray(backup.transactions))throw Error("File backup PT GOLD OVA RAYA tidak valid.");
      const restored=backup.transactions.map(normalize).filter(t=>t.a>0&&t.d);
      if(!confirm(`Pulihkan ${restored.length} transaksi dari backup? Data yang ada sekarang akan diganti.`))return;
      const existing=[...transactions];
      for(const t of existing)await cloudDelete(t.id);
      if(restored.length){
        const rows=restored.map(t=>({id:t.id,type:t.t,amount:t.a,category:t.c,description:t.x,transaction_date:t.d}));
        const {error}=await supabaseClient.from("transactions").insert(rows);
        if(error)throw error;
      }
      const opening=Number(backup.opening_balance)||0;
      const {error:openingError}=await supabaseClient.from("cash_settings").upsert({id:true,opening_balance:opening,updated_at:new Date().toISOString()},{onConflict:"id"});
      if(openingError)throw openingError;
      transactions=restored;
      openingBalance=opening;
      window.dispatchEvent(new CustomEvent("opening-balance-changed",{detail:opening}));
      renderAll();
      toast(`✅ ${restored.length} transaksi berhasil dipulihkan`);
    }catch(err){
      console.error(err);
      toast("❌ Gagal memulihkan data: "+(err.message||"file tidak valid"));
      try{transactions=await cloudLoad();renderAll()}catch{}
    }finally{
      if($("#restoreDataInput"))$("#restoreDataInput").value="";
    }
  }

  async function resetData(){
    if(booting)return toast("⏳ Database masih dimuat...");
    if(!cloudEnabled)return toast("❌ Database offline. Tidak bisa reset data.");
    if(!transactions.length&&Number(openingBalance)===0)return toast("ℹ️ Data sudah kosong");
    if(!confirm("⚠️ Reset semua data PT GOLD OVA RAYA? Semua transaksi dan saldo awal akan dihapus permanen."))return;
    if(!confirm("Konfirmasi terakhir: lanjutkan RESET SEMUA DATA?"))return;
    try{
      const existing=[...transactions];
      for(const t of existing)await cloudDelete(t.id);
      const {error}=await supabaseClient.from("cash_settings").upsert({id:true,opening_balance:0,updated_at:new Date().toISOString()},{onConflict:"id"});
      if(error)throw error;
      transactions=[];
      openingBalance=0;
      window.dispatchEvent(new CustomEvent("opening-balance-changed",{detail:0}));
      renderAll();
      toast("🗑️ Semua data berhasil direset");
    }catch(err){
      console.error(err);
      toast("❌ Reset gagal: "+(err.message||"periksa izin Supabase"));
      try{transactions=await cloudLoad();renderAll()}catch{}
    }
  }

  $("#saveDataBtn")?.addEventListener("click",saveData);
  $("#restoreDataBtn")?.addEventListener("click",openRestore);
  $("#resetDataBtn")?.addEventListener("click",resetData);
  $("#restoreDataInput")?.addEventListener("change",e=>restoreData(e.target.files?.[0]));

  window.printTransactionHistory=()=>{ 
    const q=$("#search")?.value.trim().toLowerCase()||"";
    const data=transactions.filter(t=>(activeFilter==="semua"||t.t===activeFilter)&&(!q||[t.c,t.x,t.a].some(v=>String(v).toLowerCase().includes(q))));
    const total=data.reduce((s,t)=>s+t.a,0);
    const typeLabel=activeFilter==="keluar"?"Pengeluaran":activeFilter==="masuk"?"Pemasukan":"Uang Masuk & Keluar";
    const summary=$("#printTransactionSummary");
    if(summary)summary.innerHTML=`<div class="print-meta">${typeLabel} • ${data.length} transaksi</div><div class="print-total">Total: ${rupiah(total)}</div>`;
    document.body.classList.add("print-transactions");
    window.print();
    setTimeout(()=>{document.body.classList.remove("print-transactions");if(summary)summary.innerHTML=""},700);
  };

  function renderAll(){renderTransactions();renderDashboard()}
  boot();
})();

// deployment sync: restored stable dashboard build
