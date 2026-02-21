let META=null, CURRENT_TABLE=null, calCursor=new Date();
const PAGE_TITLE=document.getElementById("pageTitle");
const NAV_BTNS=[...document.querySelectorAll(".nav-item")];
const pageDashboard=document.getElementById("page-dashboard");
const pageList=document.getElementById("page-list");
const dashCards=document.getElementById("dashCards");
const recentTBody=document.querySelector("#recentTable tbody");
const btnNew=document.getElementById("btnNew");
const btnExport=document.getElementById("btnExport");
const importFile=document.getElementById("importFile");
const btnImportLabel=document.getElementById("btnImportLabel");
const searchInput=document.getElementById("searchInput");
const statusFilters=document.getElementById("statusFilters");
const dataHead=document.getElementById("dataHead");
const dataBody=document.getElementById("dataBody");
const modal=document.getElementById("modal");
const modalBody=document.getElementById("modalBody");
const modalTitle=document.getElementById("modalTitle");
const modalClose=document.getElementById("modalClose");
const modalCancel=document.getElementById("modalCancel");
const modalSave=document.getElementById("modalSave");
const calEl=document.getElementById("calendar");
const legendEl=document.getElementById("legend");
const remindersEl=document.getElementById("reminders");
const calPrev=document.getElementById("calPrev");
const calNext=document.getElementById("calNext");
const calToday=document.getElementById("calToday");
const btnBackupExport=document.getElementById("btnBackupExport");
const backupImportFile=document.getElementById("backupImportFile");

const api=async(url,opts)=>{const r=await fetch(url,opts); if(!r.ok) throw new Error(await r.text()); const ct=r.headers.get("content-type")||""; return ct.includes("application/json")?r.json():r;};
const isoToTR=(iso)=>{if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${d}.${m}.${y}`;};
const trToISO=(s)=>{if(!s) return null; s=String(s).trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; const m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/); if(!m) return null; const dd=m[1].padStart(2,"0"), mm=m[2].padStart(2,"0"); let yy=m[3]; if(yy.length===2) yy="20"+yy; return `${yy}-${mm}-${dd}`;};
let SORT_DIR=1;
const esc=(s)=>String(s??"").replace(/[&<>"']/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
const badge=(st)=>`<span class="badge" style="background:${META.status_bg[st]};color:${META.status_fg[st]}">${st}</span>`;
const rowColors=(st)=>({bg:META.status_bg[st]||"#fff", fg:META.status_fg[st]||"#111"});

function saveFilter(obj){try{localStorage.setItem("filter:"+CURRENT_TABLE,JSON.stringify(obj));}catch{}}
function loadFilter(){try{const r=localStorage.getItem("filter:"+CURRENT_TABLE);return r?JSON.parse(r):null;}catch{return null;}}

function setPage(page){
  NAV_BTNS.forEach(b=>b.classList.toggle("active", b.dataset.page===page));
  if(page==="dashboard"){
    PAGE_TITLE.textContent="ANA SAYFA";
    pageDashboard.classList.remove("hidden"); pageList.classList.add("hidden");
    btnExport.style.display="none"; btnImportLabel.style.display="none"; btnNew.style.display="none";
    CURRENT_TABLE=null; refreshDashboard(true); return;
  }
  pageDashboard.classList.add("hidden"); pageList.classList.remove("hidden");
  btnExport.style.display="inline-flex"; btnImportLabel.style.display="inline-flex"; btnNew.style.display="inline-flex";
  if(page==="calisma"){PAGE_TITLE.textContent="ÇALIŞMA İZNİ"; CURRENT_TABLE="calisma_izni";}
  if(page==="ikamet"){PAGE_TITLE.textContent="İKAMET İZNİ"; CURRENT_TABLE="ikamet_izni";}
  if(page==="sgk"){PAGE_TITLE.textContent="SGK"; CURRENT_TABLE="sgk";}
  if(page==="eimza"){PAGE_TITLE.textContent="E-İMZA"; CURRENT_TABLE="eimza";}
  searchInput.value=""; buildStatusFilters(); refreshList();
}

function buildStatusFilters(){
  statusFilters.innerHTML="";
  if(!(CURRENT_TABLE==="calisma_izni"||CURRENT_TABLE==="ikamet_izni")) return;
  const on=new Set((loadFilter()?.statuses)||META.statuses);
  META.statuses.forEach(st=>{
    const chip=document.createElement("span");
    chip.className="chip"+(on.has(st)?"":" off");
    chip.innerHTML=badge(st);
    chip.onclick=(e)=>{e.preventDefault(); on.has(st)?on.delete(st):on.add(st); chip.classList.toggle("off",!on.has(st)); saveFilter({statuses:[...on]}); refreshList();};
    statusFilters.appendChild(chip);
  });
}

function buildHead(cols){
  const tr=document.createElement("tr");
  cols.forEach((c,i)=>{
    const th=document.createElement("th");
    th.textContent=c;
    if(i===0){
      th.style.cursor="pointer";
      th.title="Tarihe göre sırala";
      th.onclick=()=>{SORT_DIR*=-1; refreshList();};
    }
    tr.appendChild(th);
  });
  const th=document.createElement("th"); th.textContent="İşlemler"; tr.appendChild(th);
  dataHead.innerHTML=""; dataHead.appendChild(tr);
}

function addActions(td,row){
  const wrap=document.createElement("div"); wrap.className="row-actions";
  const e=document.createElement("button"); e.className="smallbtn"; e.textContent="✎"; e.onclick=()=>openModal("edit",row);
  const d=document.createElement("button"); d.className="smallbtn danger"; d.textContent="🗑"; d.onclick=async()=>{if(!confirm("Silinsin mi?")) return; await api(`/api/delete/${CURRENT_TABLE}/${row.id}`,{method:"POST"}); await refreshList(); await refreshDashboard(false);};
  wrap.appendChild(e); wrap.appendChild(d); td.appendChild(wrap);
}

async function refreshList(){
  if(!CURRENT_TABLE) return;
  const q=encodeURIComponent(searchInput.value.trim());
  let url=`/api/list/${CURRENT_TABLE}?q=${q}`;
  const f=loadFilter();
  if(f?.statuses && (CURRENT_TABLE==="calisma_izni"||CURRENT_TABLE==="ikamet_izni")) url+=`&statuses=${encodeURIComponent(f.statuses.join(","))}`;
  const rows=await api(url);

  if(CURRENT_TABLE==="calisma_izni"){
    rows.sort((a,b)=> (a.tarih||"").localeCompare(b.tarih||"") * SORT_DIR);
    buildHead(["Tarih","Firma / Müşteri","Başvuru No","Yabancı İsim","Kimlik No","Ülke","Durum"]);
    dataBody.innerHTML="";
    rows.forEach(r=>{
      const tr=document.createElement("tr"); const c=rowColors(r.durum); tr.style.background=c.bg; tr.style.color=c.fg;
      tr.innerHTML=`<td>${isoToTR(r.tarih)}</td><td><b>${esc(r.firma)}</b></td><td>${esc(r.basvuru_no)}</td><td>${esc(r.yabanci_isim)}</td><td>${esc(r.kimlik_no)}</td><td>${esc(r.ulke)}</td><td>${badge(r.durum)}</td>`;
      const td=document.createElement("td"); addActions(td,r); tr.appendChild(td); dataBody.appendChild(tr);
    });
  } else if(CURRENT_TABLE==="ikamet_izni"){
    rows.sort((a,b)=> (a.tarih||"").localeCompare(b.tarih||"") * SORT_DIR);
    buildHead(["Tarih","Ad Soyad","Referans","İletişim","Pasaport / T.C.","Durum"]);
    dataBody.innerHTML="";
    rows.forEach(r=>{
      const tr=document.createElement("tr"); const c=rowColors(r.durum); tr.style.background=c.bg; tr.style.color=c.fg;
      tr.innerHTML=`<td>${isoToTR(r.tarih)}</td><td><b>${esc(r.ad_soyad)}</b></td><td>${esc(r.referans)}</td><td>${esc(r.iletisim)}</td><td>${esc(r.pasaport_tc)}</td><td>${badge(r.durum)}</td>`;
      const td=document.createElement("td"); addActions(td,r); tr.appendChild(td); dataBody.appendChild(tr);
    });
  } else if(CURRENT_TABLE==="sgk"){
    buildHead(["Tarih","İşveren İsim","T.C.","#","SİSTEM Ş.","İŞYERİ Ş."]);
    dataBody.innerHTML="";
    rows.forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${isoToTR(r.tarih)}</td><td><b>${esc(r.isveren_isim)}</b></td><td>${esc(r.tc)}</td><td class="mono">${esc(r.dosya_no||"")}</td><td class="mono">${esc(r.sistem_sifre)}</td><td class="mono">${esc(r.isyeri_sifre)}</td>`;
      const td=document.createElement("td"); addActions(td,r); tr.appendChild(td); dataBody.appendChild(tr);
    });
  } else {
    buildHead(["Tarih","Müşteri Adı","Süresi","Ödeme","Kargo Durumu"]);
    dataBody.innerHTML="";
    rows.forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${isoToTR(r.tarih)}</td><td><b>${esc(r.musteri_adi)}</b></td><td>${esc(r.suresi)}</td><td>${esc(r.odeme)}</td><td>${esc(r.kargo_durumu)}</td>`;
      const td=document.createElement("td"); addActions(td,r); tr.appendChild(td); dataBody.appendChild(tr);
    });
  }
}

function openModal(mode,row){
  const edit=mode==="edit";
  modalTitle.textContent=edit?"Kaydı Düzenle":"Yeni Kayıt";
  modal.classList.remove("hidden");
  const stOpts=META.statuses.map(s=>`<option value="${s}">${s}</option>`).join("");
  if(CURRENT_TABLE==="calisma_izni"){
    modalBody.innerHTML=`
      <div class="field"><label>Tarih</label><input id="f_tarih" placeholder="dd.mm.yyyy" value="${edit?isoToTR(row.tarih):""}"></div>
      <div class="field"><label>Durum</label><select id="f_durum">${stOpts}</select></div>
      <div class="field"><label>Firma / Müşteri</label><input id="f_firma" value="${edit?esc(row.firma):""}"></div>
      <div class="field"><label>Başvuru No</label><input id="f_basv" value="${edit?esc(row.basvuru_no):""}"></div>
      <div class="field"><label>Yabancı İsim</label><input id="f_isim" value="${edit?esc(row.yabanci_isim):""}"></div>
      <div class="field"><label>Kimlik No</label><input id="f_kimlik" value="${edit?esc(row.kimlik_no):""}"></div>
      <div class="field"><label>Ülke</label><input id="f_ulke" value="${edit?esc(row.ulke):""}"></div>
      <div class="field"><label>Notlar</label><textarea id="f_notlar">${edit?esc(row.notlar):""}</textarea></div>`;
    document.getElementById("f_durum").value=edit?row.durum:"DEĞERLENDİRME";
  } else if(CURRENT_TABLE==="ikamet_izni"){
    modalBody.innerHTML=`
      <div class="field"><label>Tarih</label><input id="f_tarih" placeholder="dd.mm.yyyy" value="${edit?isoToTR(row.tarih):""}"></div>
      <div class="field"><label>Durum</label><select id="f_durum">${stOpts}</select></div>
      <div class="field"><label>Ad Soyad</label><input id="f_ad" value="${edit?esc(row.ad_soyad):""}"></div>
      <div class="field"><label>Referans</label><input id="f_ref" value="${edit?esc(row.referans):""}"></div>
      <div class="field"><label>İletişim</label><input id="f_ilet" value="${edit?esc(row.iletisim):""}"></div>
      <div class="field"><label>Pasaport / T.C.</label><input id="f_pass" value="${edit?esc(row.pasaport_tc):""}"></div>
      <div class="field"><label>Notlar</label><textarea id="f_notlar">${edit?esc(row.notlar):""}</textarea></div>`;
    document.getElementById("f_durum").value=edit?row.durum:"DEĞERLENDİRME";
  } else if(CURRENT_TABLE==="sgk"){
    modalBody.innerHTML=`
      <div class="field"><label>Tarih</label><input id="f_tarih" placeholder="dd.mm.yyyy" value="${edit?isoToTR(row.tarih):""}"></div>
      <div class="field"><label>İşveren İsim</label><input id="f_isv" value="${edit?esc(row.isveren_isim):""}"></div>
      <div class="field"><label>T.C.</label><input id="f_tc" value="${edit?esc(row.tc):""}"></div>
      <div class="field"><label>#</label><input id="f_no" class="mono" value="${edit?esc(row.dosya_no||""):""}"></div>
      <div class="field"><label>SİSTEM Ş.</label><input id="f_sys" class="mono" value="${edit?esc(row.sistem_sifre):""}"></div>
      <div class="field"><label>İŞYERİ Ş.</label><input id="f_isy" class="mono" value="${edit?esc(row.isyeri_sifre):""}"></div>
      <div class="field"><label>Notlar</label><textarea id="f_notlar">${edit?esc(row.notlar):""}</textarea></div>`;
  } else {
    modalBody.innerHTML=`
      <div class="field"><label>Tarih</label><input id="f_tarih" placeholder="dd.mm.yyyy" value="${edit?isoToTR(row.tarih):""}"></div>
      <div class="field"><label>Müşteri Adı</label><input id="f_mus" value="${edit?esc(row.musteri_adi):""}"></div>
      <div class="field"><label>Süresi</label><input id="f_sur" value="${edit?esc(row.suresi):""}"></div>
      <div class="field"><label>Ödeme</label><input id="f_ode" value="${edit?esc(row.odeme):""}"></div>
      <div class="field"><label>Kargo Durumu</label><input id="f_kar" value="${edit?esc(row.kargo_durumu):""}"></div>
      <div class="field"><label>Notlar</label><textarea id="f_notlar">${edit?esc(row.notlar):""}</textarea></div>`;
  }

  modalSave.onclick=async()=>{
    const payload={id:edit?row.id:undefined};
    payload.tarih=trToISO(document.getElementById("f_tarih").value);
    if(CURRENT_TABLE==="calisma_izni"){
      payload.firma=document.getElementById("f_firma").value.trim();
      payload.basvuru_no=document.getElementById("f_basv").value.trim();
      payload.yabanci_isim=document.getElementById("f_isim").value.trim();
      payload.kimlik_no=document.getElementById("f_kimlik").value.trim();
      payload.ulke=document.getElementById("f_ulke").value.trim();
      payload.durum=document.getElementById("f_durum").value;
      payload.notlar=document.getElementById("f_notlar").value;
    } else if(CURRENT_TABLE==="ikamet_izni"){
      payload.ad_soyad=document.getElementById("f_ad").value.trim();
      payload.referans=document.getElementById("f_ref").value.trim();
      payload.iletisim=document.getElementById("f_ilet").value.trim();
      payload.pasaport_tc=document.getElementById("f_pass").value.trim();
      payload.durum=document.getElementById("f_durum").value;
      payload.notlar=document.getElementById("f_notlar").value;
    } else if(CURRENT_TABLE==="sgk"){
      payload.isveren_isim=document.getElementById("f_isv").value.trim();
      payload.tc=document.getElementById("f_tc").value.trim();
      payload.dosya_no=document.getElementById("f_no").value.trim();
      payload.sistem_sifre=document.getElementById("f_sys").value.trim();
      payload.isyeri_sifre=document.getElementById("f_isy").value.trim();
      payload.notlar=document.getElementById("f_notlar").value;
    } else {
      payload.musteri_adi=document.getElementById("f_mus").value.trim();
      payload.suresi=document.getElementById("f_sur").value.trim();
      payload.odeme=document.getElementById("f_ode").value.trim();
      payload.kargo_durumu=document.getElementById("f_kar").value.trim();
      payload.notlar=document.getElementById("f_notlar").value;
    }
    await api(`/api/save/${CURRENT_TABLE}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    closeModal(); await refreshList(); await refreshDashboard(false);
  };
}

function closeModal(){modal.classList.add("hidden");}
modalClose.onclick=closeModal; modalCancel.onclick=closeModal;
btnNew.onclick=()=>openModal("new",{});
btnExport.onclick=()=>{if(CURRENT_TABLE) window.location.href=`/api/export/${CURRENT_TABLE}`;};
importFile.onchange=async(e)=>{const f=e.target.files[0]; if(!f||!CURRENT_TABLE) return; const fd=new FormData(); fd.append("file",f);
  try{const r=await api(`/api/import/${CURRENT_TABLE}`,{method:"POST",body:fd}); alert(`İçe aktarıldı: ${r.inserted} kayıt`); await refreshList(); await refreshDashboard(false);}
  catch(err){alert("İçe aktarma hatası: "+err.message);} finally{importFile.value="";}};
searchInput.oninput=()=>refreshList();
NAV_BTNS.forEach(b=>b.onclick=()=>setPage(b.dataset.page));
btnBackupExport.onclick=()=>{window.location.href="/api/backup/export";};
backupImportFile.onchange=async(e)=>{const f=e.target.files[0]; if(!f) return; if(!confirm("Mevcut veriler silinip yedek yüklenecek. Devam?")){backupImportFile.value="";return;}
  const fd=new FormData(); fd.append("file",f);
  try{await api("/api/backup/import",{method:"POST",body:fd}); alert("Yedek yüklendi."); setPage("dashboard");}
  catch(err){alert("Yedek yükleme hatası: "+err.message);} finally{backupImportFile.value="";}};

function toISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),da=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${da}`;}
function startOfMonth(d){return new Date(d.getFullYear(),d.getMonth(),1);}
function endOfMonth(d){return new Date(d.getFullYear(),d.getMonth()+1,0);}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}

async function refreshDashboard(full){
  if(full) META=await api("/api/meta");
  const stats=await api("/api/stats");
  const tot={}; META.statuses.forEach(s=>tot[s]=(stats.calisma[s]||0)+(stats.ikamet[s]||0));
  dashCards.innerHTML="";
  META.statuses.forEach(s=>{
    const c=document.createElement("div"); c.className="card";
    c.style.background=`linear-gradient(180deg, ${META.status_bg[s]}, rgba(255,255,255,.92))`;
    c.innerHTML=`<div class="t">${s}</div><div class="k" style="color:${META.status_fg[s]}">${tot[s]||0}</div><div class="small" style="color:#6b7280;margin-top:6px">Çalışma + İkamet</div>`;
    dashCards.appendChild(c);
  });
  const recent=await api("/api/recent");
  recentTBody.innerHTML="";
  recent.forEach(r=>{
    const tr=document.createElement("tr"); const c=rowColors(r.durum); tr.style.background=c.bg; tr.style.color=c.fg;
    tr.innerHTML=`<td><b>${r.tip}</b></td><td>${isoToTR(r.tarih)}</td><td>${esc((r.ana||r.no)||"")}</td><td>${esc(r.isim||"")}</td><td>${esc(r.ulke||"")}</td><td>${badge(r.durum)}</td>`;
    recentTBody.appendChild(tr);
  });
  await renderCalendarAndReminders();
}

async function renderCalendarAndReminders(){
  const calisma=await api("/api/list/calisma_izni?q=");
  const ikamet=await api("/api/list/ikamet_izni?q=");
  const apiReminders=await api("/api/reminders");

  const events=[];
  calisma.forEach(r=>{if(r.tarih) events.push({date:r.tarih,status:r.durum,label:`${r.firma||""} • ${r.yabanci_isim||""}`.trim()});});
  ikamet.forEach(r=>{if(r.tarih) events.push({date:r.tarih,status:r.durum,label:`${r.ad_soyad||""} • ${r.referans||""}`.trim()});});
  apiReminders.forEach(r=>{if(r.tarih) events.push({date:r.tarih,status:"HATIRLATICI",label:`🔔 ${r.baslik||""}`.trim(), id:r.id});});

  const cursor=new Date(calCursor.getFullYear(),calCursor.getMonth(),1);
  const first=startOfMonth(cursor), last=endOfMonth(cursor);
  const monthName=cursor.toLocaleString("tr-TR",{month:"long",year:"numeric"});
  const dow=["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
  const grid=document.createElement("div"); grid.style.display="grid"; grid.style.gridTemplateColumns="repeat(7,1fr)"; grid.style.gap="6px";
  
  dow.forEach(d=>{const el=document.createElement("div"); el.style.textAlign="center"; el.style.fontWeight="900"; el.style.fontSize="11px"; el.style.color="#6b7280"; el.textContent=d; grid.appendChild(el);});
  const pad=(first.getDay()+6)%7;
  for(let i=0;i<pad;i++){const b=document.createElement("div"); b.style.minHeight="64px"; b.style.border="1px solid var(--border)"; b.style.borderRadius="14px"; b.style.opacity=".35"; b.style.background="#fff"; grid.appendChild(b);}
  
  for(let day=1; day<=last.getDate(); day++){
    const d=new Date(cursor.getFullYear(),cursor.getMonth(),day); const iso=toISO(d);
    const cell=document.createElement("div"); cell.style.minHeight="64px"; cell.style.border="1px solid var(--border)"; cell.style.borderRadius="14px"; cell.style.padding="8px"; cell.style.background="#fff";
    
    // TAKVİM TIKLAMA (MODAL)
    cell.style.cursor="pointer";
    cell.onclick = () => openReminderModal(iso);

    if(sameDay(d,new Date())){cell.style.outline="3px solid rgba(245,158,11,.55)"; cell.style.outlineOffset="2px";}
    const evs=events.filter(e=>e.date===iso);
    const seen=new Set(); const dots=document.createElement("div"); dots.style.display="flex"; dots.style.gap="6px"; dots.style.flexWrap="wrap"; dots.style.marginTop="8px";
    evs.forEach(e=>{
        if(seen.has(e.status)) return; seen.add(e.status); 
        const dot=document.createElement("span"); dot.style.width="10px"; dot.style.height="10px"; dot.style.borderRadius="999px"; 
        dot.style.border="1px solid rgba(0,0,0,.08)"; 
        dot.style.background= e.status==="HATIRLATICI" ? "#10b981" : META.status_bg[e.status]; 
        dots.appendChild(dot);
    });
    const dateEl=document.createElement("div"); dateEl.style.fontWeight="900"; dateEl.textContent=day;
    cell.appendChild(dateEl); cell.appendChild(dots);
    cell.title=evs.slice(0,6).map(e=>`${e.status}: ${e.label}`).join("\n");
    grid.appendChild(cell);
  }
  calEl.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:900">${monthName}</div></div>`;
  calEl.appendChild(grid);

  legendEl.innerHTML="";
  META.statuses.forEach(s=>{const item=document.createElement("div"); item.style.display="flex"; item.style.gap="6px"; item.style.alignItems="center"; item.style.fontSize="12px"; item.style.fontWeight="800"; item.style.color="#111827cc";
    const dot=document.createElement("span"); dot.style.width="10px"; dot.style.height="10px"; dot.style.borderRadius="999px"; dot.style.border="1px solid rgba(0,0,0,.08)"; dot.style.background=META.status_bg[s];
    item.appendChild(dot); item.appendChild(document.createTextNode(s)); legendEl.appendChild(item);
  });

  // YAKLAŞAN HATIRLATICI LİSTESİ VE SİLME BUTONU
  const todayISO=toISO(new Date());
  const upcoming=events
    .filter(e => e.status === "HATIRLATICI" || e.date >= todayISO) // Geçmiş hatırlatıcıları da gösterir
    .sort((a,b)=>a.date.localeCompare(b.date))
    .slice(0,15);

  remindersEl.innerHTML="";
  if(!upcoming.length){remindersEl.innerHTML='<div class="small" style="color:#6b7280">Yaklaşan kayıt bulunamadı.</div>'; return;}
  upcoming.forEach(e=>{
    const row=document.createElement("div"); 
    row.style.border="1px solid var(--border)"; row.style.background="#fff"; row.style.borderRadius="16px"; row.style.padding="12px"; row.style.display="flex"; row.style.justifyContent="space-between"; row.style.gap="10px"; row.style.marginBottom="6px";
    
    const deleteBtnHTML = e.status === "HATIRLATICI" ? `<button onclick="deleteReminder(${e.id})" class="smallbtn danger" style="padding:4px 8px; font-size:11px; margin-top:4px;">Sil</button>` : "";
    
    row.innerHTML=`
      <div style="flex:1">
        <div style="font-weight:900">${esc(e.label)}</div>
        <div style="margin-top:6px">${e.status==="HATIRLATICI" ? "" : badge(e.status)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:900">${isoToTR(e.date)}</div>
        ${deleteBtnHTML}
      </div>
    `;
    remindersEl.appendChild(row);
  });
}

calPrev.onclick=()=>{calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()-1,1); renderCalendarAndReminders();};
calNext.onclick=()=>{calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+1,1); renderCalendarAndReminders();};
calToday.onclick=()=>{calCursor=new Date(); renderCalendarAndReminders();};

// --- YENİ MODAL VE SİLME FONKSİYONLARI ---
function openReminderModal(dateStr) {
  document.getElementById("reminderModal").classList.remove("hidden");
  document.getElementById("rem_tarih").value = dateStr || toISO(new Date());
  document.getElementById("rem_baslik").value = "";
  document.getElementById("rem_aciklama").value = "";
}

document.getElementById("reminderClose").onclick = () => document.getElementById("reminderModal").classList.add("hidden");
document.getElementById("reminderCancel").onclick = () => document.getElementById("reminderModal").classList.add("hidden");
document.getElementById("reminderSave").onclick = async () => {
  const data = {
    tarih: document.getElementById("rem_tarih").value,
    baslik: document.getElementById("rem_baslik").value.trim(),
    aciklama: document.getElementById("rem_aciklama").value.trim()
  };
  if(!data.tarih || !data.baslik) { alert("Tarih ve Başlık alanları zorunludur!"); return; }
  await fetch("/api/reminders/save", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
  document.getElementById("reminderModal").classList.add("hidden");
  refreshDashboard(false);
};

async function deleteReminder(id) {
  if(confirm("Bu hatırlatıcıyı silmek istediğinize emin misiniz?")) {
    await fetch(`/api/reminders/delete/${id}`, { method: 'POST' });
    refreshDashboard(false);
  }
}

// Otomatik Kapanma Sinyali (Her 5 saniyede)
setInterval(() => { fetch('/heartbeat', { method: 'POST' }).catch(() => {}); }, 5000);

(async()=>{META=await api("/api/meta"); setPage("dashboard");})();