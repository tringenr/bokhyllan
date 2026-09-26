(async()=>{
window.__appStarted=true;
const DV="?v=20260926161936";
const SB_URL="https://zuesxdqifsnvhleiukum.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZXN4ZHFpZnNudmhsZWl1a3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTAxNjcsImV4cCI6MjEwMzI2NjE2N30.PyutAHmY_he3VoPTT7r67oHOY5P75YpQSThqy4mO8ZI";
let sbOnline=true;
function dummyQuery(){const q={select(){return q},order(){return q},eq(){return q},
  upsert:async()=>({error:{message:"offline"}}),insert:async()=>({error:{message:"offline"}}),
  then(res){return Promise.resolve({data:[],error:null}).then(res)}};return q}
const sbFallback={from:dummyQuery,
  auth:{getSession:async()=>({data:{}}),signOut:async()=>({}),
        signInWithPassword:async()=>({error:{message:"Kan inte nå inloggningstjänsten just nu."}})},
  channel:()=>({on(){return this},subscribe(){}}),
  storage:{from:()=>({upload:async()=>({error:{message:"offline"}}),getPublicUrl:()=>({data:{publicUrl:""}})})}};
let sb;
try{
  if(!window.supabase||!window.supabase.createClient)throw new Error("supabase-js laddades inte");
  sb=window.supabase.createClient(SB_URL,SB_KEY);
}catch(e){
  console.warn("Supabase otillgängligt – appen körs i läsläge:",e.message);
  sb=sbFallback;sbOnline=false;
}
let sbUser=null;

/* ---------- Designhjälpare (ikoner, färger, profil) ---------- */
const ICONS={"settings":"<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/> <circle cx=\"9\" cy=\"7\" r=\"4\"/> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/> <path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>","library":"<path d=\"m16 6 4 14\"/> <path d=\"M12 6v14\"/> <path d=\"M8 8v12\"/> <path d=\"M4 4v16\"/>","tag":"<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"/> <circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>","pencil":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/> <path d=\"m15 5 4 4\"/>","camera":"<path d=\"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z\"/> <circle cx=\"12\" cy=\"13\" r=\"3\"/>","x":"<path d=\"M18 6 6 18\"/> <path d=\"m6 6 12 12\"/>","chevron-right":"<path d=\"m9 18 6-6-6-6\"/>","map-pin":"<path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"/> <circle cx=\"12\" cy=\"10\" r=\"3\"/>","folder":"<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>","play":"<polygon points=\"6 3 20 12 6 21 6 3\"/>","scan-search":"<path d=\"M3 7V5a2 2 0 0 1 2-2h2\"/> <path d=\"M17 3h2a2 2 0 0 1 2 2v2\"/> <path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"/> <path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/> <path d=\"m16 16-1.9-1.9\"/>","search":"<circle cx=\"11\" cy=\"11\" r=\"8\"/> <path d=\"m21 21-4.3-4.3\"/>","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/> <circle cx=\"12\" cy=\"7\" r=\"4\"/>","info":"<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 16v-4\"/> <path d=\"M12 8h.01\"/>"};
function ic(n){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||""}</svg>`}
function fillIcons(root){(root||document).querySelectorAll("i[data-ic]").forEach(el=>{if(!el.firstChild)el.innerHTML=ic(el.dataset.ic)})}
fillIcons();
const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const PAL=["#F24B78","#BF348E","#F29441","#F26D3D","#4A3D41","#D474BB","#F6B878","#F486A3","#F6935F","#7D6D72"];
function catColor(c){let h=0;for(const ch of String(c||""))h=(h*31+ch.charCodeAt(0))|0;return PAL[Math.abs(h)%PAL.length]}
const fmtN=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"\u2009");
let toastT=null;
function toast(msg){const t=document.getElementById("toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2600)}
/* Hyllans namn och bild. Sparas i webbläsaren tills vidare - i databasen
   behövs en egen tabell (per konto) innan det kan följa med vid delning. */
const PROFILE_KEY="minbokhylla-profile";
let profile={name:"Min Bokhylla",avatar:null};
try{const pr=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null");if(pr)profile={name:pr.name||"Min Bokhylla",avatar:pr.avatar||null}}catch(e){}
const initials=n=>(n||"MB").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
function paintAvatar(el,av,name){if(!el)return;el.style.backgroundImage=av?`url("${av}")`:"none";el.textContent=av?"":initials(name)}
function renderProfile(){
  ["homeAvatar","shareAvatar"].forEach(id=>paintAvatar(document.getElementById(id),profile.avatar,profile.name));
  const set=(id,t)=>{const el=document.getElementById(id);if(el)el.textContent=t};
  set("homeName",profile.name);set("shareName",profile.name);set("splashTitle",profile.name);set("setNameSub",profile.name);
}
renderProfile();
/* ---------- Startsida: 5 s, tryck = hoppa över ---------- */
const splashEl=document.getElementById("splash");
let splashT=[];
function playSplash(){
  if(!splashEl)return;
  splashT.forEach(clearTimeout);splashT=[];
  splashEl.style.display="";splashEl.classList.remove("fade","go");document.body.classList.add("splashing");
  void splashEl.offsetWidth;
  splashT.push(setTimeout(()=>splashEl.classList.add("go"),60));
  splashT.push(setTimeout(fadeSplash,5000));
}
function fadeSplash(){
  if(!splashEl||splashEl.classList.contains("fade"))return;
  splashT.forEach(clearTimeout);splashT=[];
  splashEl.classList.add("fade");document.body.classList.remove("splashing");
  splashT.push(setTimeout(()=>{splashEl.style.display="none"},1100));
}
if(splashEl){splashEl.addEventListener("click",fadeSplash);playSplash()}

/* Efter Fas 2.6: bocker och beskrivningar bor i databasen (manual_books /
   books_public). Endast photos.json (hyllfotons metadata) laser vi fortfarande
   fran fil - photos.json arkiveras i Fas 3a. BOOK_INFO fylls nu av
   loadManualBooks, inte fran fil. */
const photos=await fetch("data/photos.json"+DV).then(r=>r.json());
const BOOK_INFO={};
const SHELF_IMGS=[];
photos.forEach(p=>{
  let g=SHELF_IMGS.find(x=>x.bc===p.bc&&x.label===p.label);
  if(!g){g={bc:p.bc,label:p.label,imgs:[]};SHELF_IMGS.push(g)}
  g.imgs.push({cap:p.cap,shelves:p.shelves,src:p.src,thumb:p.thumb});
});
const DEFAULT_BC={1:"Bokhylla 1 – vardagsrummet",2:"Bokhylla 2",3:"Bokskåpet",4:"Köket",5:"Sovrummet – vid sängen",6:"Sovrummet – gröna skåpet",7:"Sovrummet – fönsterbrädan",8:"Soffan"};
let bcNames={...DEFAULT_BC};
const FLAT=[];SHELF_IMGS.forEach(g=>g.imgs.forEach(im=>FLAT.push({src:im.src,cap:(g.bc?bcNames[g.bc]+" · ":"")+im.cap})));
function flatIndex(gi,ii){let n=0;for(let k=0;k<gi;k++)n+=SHELF_IMGS[k].imgs.length;return n+ii}
/* Alla foton i en platt lista, i samma ordning som helskärmsvyn (FLAT). */
const PH=[];SHELF_IMGS.forEach(g=>g.imgs.forEach(im=>PH.push({bc:g.bc,cap:im.cap,src:im.src,thumb:im.thumb,shelves:im.shelves||[],fi:PH.length})));
let curView="hem";
async function loadBcNames(){const {data:rows}=await sb.from("bc_names").select("*");if(rows)rows.forEach(r=>bcNames[r.bc]=r.name)}
/* Losa platser: bocker som ligger utanfor ett hyllplan. Kod <bc>:L<n>. */
let spotNames={};
async function loadSpotNames(){
  const {data:rows}=await sb.from("spot_names").select("*");
  if(rows)rows.forEach(r=>spotNames[r.code]=r.name);
}
const SEC={V:"vänster",H:"höger",S:"hylla",K:"hylla"};
function locLabel(shelf){
  if(!shelf)return "plats dold – logga in för att se";
  const [bc,rest]=shelf.split(":");const sec=rest[0],plan=rest.slice(1);
  if(bc==="4"&&rest==="K3")return `${bcNames[bc]} · löst i köket`;
  if(sec==="L")return `${bcNames[bc]} · ${spotNames[shelf]||"löst"}`;
  return (sec==="S"||sec==="K")?`${bcNames[bc]} · hylla ${plan}`:`${bcNames[bc]} · ${SEC[sec]} · plan ${plan}`}
/* Efter Fas 2.6: alla bocker kommer fran databasen via loadManualBooks. */
let data=[];
async function loadStatuses(){
  const {data:rows,error}=await sb.from("book_status").select("*");
  if(error||!rows)return;
  const map={};rows.forEach(r=>map[r.book_id]=r);
  data.forEach(d=>{const r=map[d.id];if(r){d.status=r.status;d.lentTo=r.lent_to||"";d.ts=r.seen_date||null}else{d.status="hylla";d.lentTo="";d.ts=null}});
  render();
}
const $=s=>document.querySelector(s);
let fs="",fShelf="",fCat="",q="";
function buildShelfOptions(){
  const sel=$("#fShelf");sel.innerHTML='<option value="">Alla platser</option>';
  const shelves=[...new Set(data.map(d=>d.shelf).filter(Boolean))].sort();
  let lastBc="";
  let grp=null;
  shelves.forEach(s=>{const bc=s.split(":")[0];
    if(bc!==lastBc){grp=document.createElement("optgroup");grp.label=bcNames[bc];sel.appendChild(grp);lastBc=bc}
    const o=document.createElement("option");o.value=s;o.textContent=locLabel(s).split("· ").slice(1).join("· ");grp.appendChild(o)});
  // bookcase-level options
  Object.keys(bcNames).forEach(bc=>{const o=document.createElement("option");o.value="bc:"+bc;o.textContent="Hela "+bcNames[bc];sel.insertBefore(o,sel.children[1])});
}
buildShelfOptions();
[...new Set(data.map(d=>d.cat))].sort((a,b)=>a.localeCompare(b,"sv")).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;$("#fCat").appendChild(o)});
const STATUS={hylla:["På plats","s-hylla"],utlanad:["Utlånad","s-utlanad"],flyter:["Flyter runt","s-flyter"]};
async function saveBook(d){
  if(!sbUser)return;
  await sb.from("book_status").upsert({book_id:d.id,status:d.status,lent_to:d.lentTo||"",seen_date:d.ts,updated_at:new Date().toISOString(),updated_by:sbUser.id});
}
function save(){}
function cycle(id){if(!sbUser){alert("Logga in för att ändra status.");return}const d=data.find(x=>x.id===id);const order=["hylla","utlanad","flyter"];d.status=order[(order.indexOf(d.status)+1)%3];
d.ts=new Date().toISOString().slice(0,10);
if(d.status!=="utlanad")d.lentTo="";
saveBook(d);render();
if(d.status==="utlanad"){const inp=document.querySelector(`input[data-lent="${id}"]`);if(inp)inp.focus()}}
function setLent(id,val){if(!sbUser)return;const d=data.find(x=>x.id===id);d.lentTo=val.trim();saveBook(d);
document.querySelectorAll(`button[data-sbtn="${id}"]`).forEach(btn=>btn.textContent="Utlånad"+(d.lentTo?" → "+d.lentTo:""))}
/* En bokrad: färgstreck efter kategori, titel (öppnar bokinfo), byline och
   status som badge. Tryck på badgen byter status. */
function bookRow(d,opts){
  const [label]=STATUS[d.status]||STATUS.hylla;
  const tone={hylla:"b-success",utlanad:"b-warning",flyter:"b-brand"}[d.status]||"b-success";
  const lent=d.status==="utlanad"&&d.lentTo?` → ${esc(d.lentTo)}`:"";
  const lentInp=d.status==="utlanad"?`<input class="lent-input" data-lent="${d.id}" placeholder="Utlånad till…" value="${esc(d.lentTo||"")}" onchange="setLent(${d.id},this.value)">`:"";
  const showLoc=!(opts&&opts.noLoc);
  const loc=showLoc?`<div class="bk-loc"><span class="${d.shelf?"":"loc-dold"}">${esc(locLabel(d.shelf))}</span>${d.shelf?`<a class="var-link" onclick="lbShelf('${d.shelf}',${d.id})">${ic("map-pin")}sågs senast${d.ts?" "+d.ts:""}</a>`:""}</div>`:"";
  return `<div class="bk"><span class="bk-stripe" style="background:${catColor(d.cat)}"></span>
    <div class="bk-main"><button class="bk-title" onclick="showInfo(${d.id})">${esc(d.title)}</button>
      <span class="bk-by">${esc([d.author,d.cat].filter(Boolean).join(" · "))}</span>${loc}${lentInp}</div>
    <button class="badge ${tone}" data-sbtn="${d.id}" onclick="cycle(${d.id})">${label}${lent}</button></div>`;
}
function renderSummary(){
  const n=k=>data.filter(d=>d.status===k).length;
  const segs=[[n("hylla"),"var(--pink-500)"],[n("utlanad"),"var(--orange-500)"],[n("flyter"),"var(--magenta-300)"]];
  const bar=document.getElementById("sumBar");
  if(bar)bar.innerHTML=segs.filter(x=>x[0]>0).map(([v,c])=>`<span style="flex:${v};background:${c}"></span>`).join("");
  $("#stTot").textContent=fmtN(data.length);
  const np=placeList().length;
  const sp=document.getElementById("stPlaces");if(sp)sp.textContent=`böcker på ${np} platser`;
  const sm=document.getElementById("shareMeta");if(sm)sm.textContent=`${fmtN(data.length)} böcker · ${np} platser`;
}
function render(){
  const norm=s=>s.toLowerCase();
  const shelfOk=d=>!fShelf||(fShelf.startsWith("bc:")?d.shelf.split(":")[0]===fShelf.slice(3):d.shelf===fShelf);
  const list=data.filter(d=>(!fs||d.status===fs)&&shelfOk(d)&&(!fCat||d.cat===fCat)&&(!q||norm(d.title+" "+d.author).includes(norm(q))));
  $("#stTot").textContent=data.length;
  $("#stHylla").textContent=data.filter(d=>d.status==="hylla").length;
  $("#stUt").textContent=data.filter(d=>d.status==="utlanad").length;
  $("#stFly").textContent=data.filter(d=>d.status==="flyter").length;
  $("#count").textContent=list.length+" böcker visas";
  if(window.__lt)window.__lt();
  $("#grid").innerHTML=list.length?list.map(bookRow).join(""):`<p class="pl-empty">Inga böcker matchar.</p>`;
  renderSummary();renderHome();
  if(curView==="place")renderPlace();
  renderBcEditor();
}
$("#q").addEventListener("input",e=>{q=e.target.value;render();if(q)setList(true)});
$("#fShelf").addEventListener("change",e=>{fShelf=e.target.value;render()});
$("#fCat").addEventListener("change",e=>{fCat=e.target.value;render()});
document.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");fs=c.dataset.s;render()}));
render();
function renderBcEditor(){
  const el=$("#bcEditorIns")||$("#bcEditor");if(!el)return;
  el.innerHTML=Object.keys(bcNames).map(bc=>`<button class="bc-name" data-bc="${bc}" title="Tryck för att byta namn">${ic("pencil")}<span>${esc(bcNames[bc])}</span></button>`).join("")
    ;
  el.querySelectorAll("button.bc-name").forEach(b=>b.addEventListener("click",()=>{
    const bc=b.dataset.bc;
    const inp=document.createElement("input");inp.type="text";inp.value=bcNames[bc];inp.className="bc-input";
    b.replaceWith(inp);inp.focus();inp.select();
    const commit=()=>{const n=inp.value.trim();
      if(n){bcNames[bc]=n;if(sbUser)sb.from("bc_names").upsert({bc,name:n}).then(()=>{})}
      buildShelfOptions();render();renderPhotoTabs()};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){buildShelfOptions();render()}});
    inp.addEventListener("blur",commit)}))
}
function renderPhotoTabs(){renderHome();if(curView==="place")renderPlace()}
function placeList(){
  const bcs=new Set([...Object.keys(bcNames),...PH.map(p=>p.bc)]);
  return [...bcs].sort((a,b)=>Number(a)-Number(b)).map(bc=>{
    const ph=PH.filter(p=>p.bc===bc);
    const big=ph.find(p=>p.src);
    return {bc,name:bcNames[bc]||("Plats "+bc),photos:ph,cover:big?big.src:(ph[0]?ph[0].thumb:""),
            count:data.filter(d=>d.shelf&&d.shelf.split(":")[0]===bc).length};
  });
}
function renderHome(){
  const el=document.getElementById("placeGrid");if(!el)return;
  const known=data.some(d=>d.shelf);
  el.innerHTML=placeList().map(p=>`<button class="tile" onclick="openPlace('${p.bc}')">
      ${p.cover?`<img src="${p.cover}" alt="" loading="lazy" decoding="async">`:""}
      <span class="tile-bar"><span class="tile-name">${esc(p.name)}</span>${known?`<span class="tile-n">${p.count}</span>`:""}</span></button>`).join("");
  const ps=document.getElementById("setPlacesSub");if(ps)ps.textContent=placeList().length+" platser · byt namn eller lägg till";
}
let curPlace=null,curPhoto=null;
function openPlace(bc,fi){
  curPlace=String(bc);
  const p=placeList().find(x=>x.bc===curPlace);
  curPhoto=(fi!=null)?fi:(p&&p.photos[0]?p.photos[0].fi:null);
  go("place");
}
function pickPhoto(fi){curPhoto=fi;renderPlace()}
function renderPlace(){
  const el=document.getElementById("view-place");if(!el)return;
  const p=placeList().find(x=>x.bc===curPlace);if(!p){el.innerHTML="";return}
  const sel=PH[curPhoto]&&PH[curPhoto].bc===p.bc?PH[curPhoto]:p.photos[0];
  const inPlace=data.filter(d=>d.shelf&&d.shelf.split(":")[0]===p.bc);
  const cm={};inPlace.forEach(d=>cm[d.cat]=(cm[d.cat]||0)+1);
  const cats=Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,5);const cMax=cats.length?cats[0][1]:1;
  const books=sel?data.filter(d=>sel.shelves.includes(d.shelf)):inPlace;
  const loggedOut=!data.some(d=>d.shelf);
  el.innerHTML=`<div class="pl-cover">${p.cover?`<img src="${p.cover}" alt="">`:`<div class="no-img"></div>`}
      <button class="pill-back" onclick="go('hem')">← Hem</button></div>
    <div class="pl-head"><h1>${esc(p.name)}</h1><span>${loggedOut?"":p.count+" böcker · "}${p.photos.length} foton</span></div>
    ${p.photos.length?`<div class="thumbs">${p.photos.map(ph=>`<button class="th${sel&&ph.fi===sel.fi?" on":""}" onclick="pickPhoto(${ph.fi})">
        <img src="${ph.thumb}" alt="" loading="lazy"><span>${esc(ph.cap)}</span></button>`).join("")}</div>`:""}
    ${cats.length?`<div class="card pl-cats"><h2>Vad står här</h2>${cats.map(([c,n])=>`<div class="cat-bar"><span>${esc(c)}</span>
        <span class="track"><span style="width:${Math.round(n/cMax*100)}%;background:${catColor(c)}"></span></span><b>${n}</b></div>`).join("")}</div>`:""}
    <div class="pl-books">
      ${sel?`<div class="pl-sel"><span>${esc(sel.cap)}${books.length?" · tryck på status för att byta":""}</span><button onclick="lbOpen(${sel.fi})">Visa foto</button></div>`:""}
      <div class="booklist">${loggedOut?`<p class="pl-empty">Logga in för att se vilka böcker som står här.</p>`
        :(books.length?books.map(d=>bookRow(d,{noLoc:true})).join(""):`<p class="pl-empty">Inga böcker registrerade för det här fotot ännu.</p>`)}</div>
    </div>`;
}
/* Äldre ingång: öppna ett foto ur SHELF_IMGS - leder nu till platsvyn. */
function openShelfView(gi,j){const g=SHELF_IMGS[gi];if(!g)return;openPlace(g.bc,flatIndex(gi,j))}
renderBcEditor();

/* ---------- Bokinfo ---------- */
const infoModal=document.createElement("div");infoModal.className="info-modal";
infoModal.innerHTML='<div class="info-box"><button class="info-close">✕</button><div class="ib-top"><div id="ibCover" class="ib-cover"></div><div class="ib-head"><h3 id="ibTitle"></h3><div class="ib-auth" id="ibAuth"></div></div></div><div id="ibBody"></div><div class="ib-src" id="ibSrc"></div></div>';
document.body.appendChild(infoModal);
infoModal.addEventListener("click",e=>{if(e.target===infoModal||e.target.classList.contains("info-close"))infoModal.classList.remove("open")});
document.addEventListener("keydown",e=>{if(e.key==="Escape")infoModal.classList.remove("open")});
function showInfo(id){
  const d=data.find(x=>x.id===id);if(!d)return;
  const info=BOOK_INFO[d.title];
  document.getElementById("ibTitle").textContent=d.title;
  document.getElementById("ibAuth").textContent=(d.author||"")+" · "+d.cat;
  const q=encodeURIComponent(d.title+" "+(d.author||""));
  document.getElementById("ibBody").innerHTML=(info?`<p>${info}</p>`:`<p style="color:var(--muted)">Ingen beskrivning inlagd ännu för den här boken.</p>`)+
    `<p><a href="https://www.goodreads.com/search?q=${q}" target="_blank" rel="noopener">Sök på Goodreads →</a> · <a href="https://www.adlibris.com/se/sok?q=${q}" target="_blank" rel="noopener">Adlibris →</a></p>`;
  const cats=[...new Set(data.map(x=>x.cat))].sort((a,b)=>a.localeCompare(b,"sv"));
  document.getElementById("ibBody").insertAdjacentHTML("beforeend",
    `<div class="info-cat"><label style="font-size:.8rem;color:var(--muted)">Kategori:</label>
     <select onchange="setBookCat(${id},this.value)">${cats.map(c=>`<option${c===d.cat?" selected":""}>${c}</option>`).join("")}</select></div>`);
  document.getElementById("ibSrc").textContent=info?"Sammanfattning skriven av Claude – kan innehålla fel.":"";
  const slot=document.getElementById("ibCover");
  slot.innerHTML='<div class="ib-ph">…</div>';
  findCover(d).then(url=>{
    slot.innerHTML = url
      ? `<img src="${url}" alt="Omslag" onerror="this.parentNode.innerHTML=coverUploadHtml(${d.id})">`
      : coverUploadHtml(d.id);
  });
  infoModal.classList.add("open");
}
function coverUploadHtml(id){
  return `<label class="ib-ph up">${ic("camera")}<span>Lägg till omslag</span>
    <input type="file" accept="image/*" style="display:none" onchange="uploadCover(${id},this)"></label>`;
}
window.coverUploadHtml=coverUploadHtml;
/* ---------- Lightbox ---------- */
const lb=document.createElement("div");lb.className="lb";lb.innerHTML=
 `<div class="lb-stage"><img id="lbImg" alt=""></div>
  <button class="lb-btn lb-close" aria-label="Stäng">✕</button>
  <button class="lb-btn lb-prev" aria-label="Föregående">‹</button>
  <button class="lb-btn lb-next" aria-label="Nästa">›</button>
  <div class="lb-cap" id="lbCap"></div>`;
document.body.appendChild(lb);
const lbImg=lb.querySelector("#lbImg"),lbCap=lb.querySelector("#lbCap"),stage=lb.querySelector(".lb-stage");
const lbMark=document.createElement("div");lbMark.className="lb-mark";lb.appendChild(lbMark);
let lbIdx=0,scale=1,tx=0,ty=0,markFrac=null,baseRect=null;
function measureBase(){
  const prev=lbImg.style.transform;
  lbImg.style.transition="none";lbImg.style.transform="none";
  baseRect=lbImg.getBoundingClientRect();
  lbImg.style.transform=prev;
}
function updateMark(){
  if(!markFrac||!baseRect){lbMark.style.display="none";return}
  const L=baseRect.left+tx, T=baseRect.top+ty, W=baseRect.width*scale, H=baseRect.height*scale;
  lbMark.style.display="block";
  lbMark.style.left=(L+W*markFrac.x0)+"px";
  lbMark.style.width=(W*(markFrac.x1-markFrac.x0))+"px";
  lbMark.style.top=(T+H*markFrac.y0)+"px";
  lbMark.style.height=(H*(markFrac.y1-markFrac.y0))+"px";
}
function applyT(){
  lbImg.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
  lbImg.style.cursor=scale>1?"grab":"zoom-in";
  requestAnimationFrame(updateMark);
}
function resetT(){scale=1;tx=0;ty=0;lbImg.style.transition="";applyT()}
/* zooma mot en punkt på skärmen */
function zoomAt(clientX,clientY,ns){
  if(!baseRect)measureBase();
  ns=Math.min(6,Math.max(1,ns));
  const localX=(clientX-baseRect.left-tx)/scale;
  const localY=(clientY-baseRect.top-ty)/scale;
  tx=clientX-baseRect.left-localX*ns;
  ty=clientY-baseRect.top-localY*ns;
  scale=ns;
  if(scale===1){tx=0;ty=0}
  applyT();
}
function lbShow(i){
  lbIdx=(i+FLAT.length)%FLAT.length;
  lbImg.src=FLAT[lbIdx].src;lbCap.textContent=FLAT[lbIdx].cap;markFrac=null;
  scale=1;tx=0;ty=0;lbImg.style.transition="";lbImg.style.transform="none";
  lbImg.onload=()=>{measureBase();applyT()};
}
function lbOpen(i){lb.classList.add("open");document.body.style.overflow="hidden";lbShow(i)}
function lbClose(){lb.classList.remove("open");document.body.style.overflow=""}
addEventListener("resize",()=>{if(lb.classList.contains("open")){measureBase();applyT()}});
lb.querySelector(".lb-close").addEventListener("click",lbClose);
lb.querySelector(".lb-prev").addEventListener("click",e=>{e.stopPropagation();lbShow(lbIdx-1)});
lb.querySelector(".lb-next").addEventListener("click",e=>{e.stopPropagation();lbShow(lbIdx+1)});
lb.addEventListener("click",e=>{if(e.target===lb||e.target===stage)lbClose()});
document.addEventListener("keydown",e=>{if(!lb.classList.contains("open"))return;
 if(e.key==="Escape")lbClose();
 if(e.key==="ArrowLeft"&&scale===1)lbShow(lbIdx-1);
 if(e.key==="ArrowRight"&&scale===1)lbShow(lbIdx+1);
 if(e.key==="0")resetT();});
/* Styrplatta/mus: ctrl+scroll (nyp) = zoom, vanlig scroll = panorera */
stage.addEventListener("wheel",e=>{
  e.preventDefault();
  if(!baseRect)measureBase();
  if(e.ctrlKey||e.metaKey){
    lbImg.style.transition="";
    zoomAt(e.clientX,e.clientY,scale*Math.pow(0.99,e.deltaY));
  }else if(scale>1){
    lbImg.style.transition="";
    tx-=e.deltaX;ty-=e.deltaY;applyT();
  }else{
    lbImg.style.transition="transform .12s ease-out";
    zoomAt(e.clientX,e.clientY,scale*Math.pow(0.995,e.deltaY));
  }
},{passive:false});
lbImg.addEventListener("dblclick",e=>{e.preventDefault();
  lbImg.style.transition="transform .25s ease-out";
  if(scale>1)resetT();else zoomAt(e.clientX,e.clientY,2.5);});
/* Pekskärm: dra = panorera, nyp = zooma, svep = bläddra */
const pts=new Map();let start=null,pinch=null,swipeX=null;
lbImg.addEventListener("pointerdown",e=>{
  e.preventDefault();lbImg.style.transition="";lbImg.setPointerCapture(e.pointerId);
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===1){start={x:e.clientX,y:e.clientY,tx,ty};swipeX=e.clientX}
  if(pts.size===2){const a=[...pts.values()];
    pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),s:scale,
           cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};start=null}});
lbImg.addEventListener("pointermove",e=>{
  if(!pts.has(e.pointerId))return;
  pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pts.size===2&&pinch){
    const a=[...pts.values()];
    const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    zoomAt(pinch.cx,pinch.cy,pinch.s*d/pinch.d);
  }else if(pts.size===1&&start&&scale>1){
    tx=start.tx+e.clientX-start.x;ty=start.ty+e.clientY-start.y;applyT();
  }});
function up(e){
  if(pts.has(e.pointerId)){
    if(pts.size===1&&scale===1&&swipeX!==null){
      const dx=e.clientX-swipeX;
      if(dx<-60)lbShow(lbIdx+1);else if(dx>60)lbShow(lbIdx-1);
    }
    pts.delete(e.pointerId);
  }
  if(pts.size<2)pinch=null;
  if(pts.size===0){start=null;swipeX=null}
}
lbImg.addEventListener("pointerup",up);lbImg.addEventListener("pointercancel",up);

/* till toppen-knapp */
const toTop=document.createElement("button");toTop.id="toTop";toTop.setAttribute("aria-label","Till toppen");toTop.textContent="↑";
document.body.appendChild(toTop);
toTop.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
addEventListener("scroll",()=>toTop.classList.toggle("show",scrollY>600),{passive:true});


function renderAuth(){
  const el=document.getElementById("authBar");if(!el)return;
  const sub=document.getElementById("setAuthSub");
  if(sub)sub.textContent=sbUser?("Inloggad: "+sbUser.email):(sbOnline?"Inte inloggad · logga in för att ändra":"Servern går inte att nå");
  if(sbUser){el.innerHTML=`<span class="who">Inloggad som <b>${esc(sbUser.email)}</b></span><button id="btnOut">Logga ut</button>`;
    el.querySelector("#btnOut").onclick=async()=>{await sb.auth.signOut();location.reload()};}
  else if(!sbOnline){el.innerHTML='<span class="who">Inloggningen går inte att nå just nu. Ladda om sidan.</span>'}
  else{el.innerHTML=`<input id="aEmail" type="email" placeholder="E-post" autocomplete="username"><input id="aPass" type="password" placeholder="Lösenord" autocomplete="current-password"><button id="btnIn">Logga in</button><span class="err" id="aErr"></span>`;
    const doIn=async()=>{
      const {data:res,error}=await sb.auth.signInWithPassword({email:el.querySelector("#aEmail").value,password:el.querySelector("#aPass").value});
      if(error){el.querySelector("#aErr").textContent=error.message||"Inloggningen misslyckades";console.warn("login",error);return}
      /* Inloggad läser hela katalogen med hyllplatser - enklast och säkrast
         att ladda om, så att alla vyer bygger på samma data. */
      sbUser=res.user;location.reload();};
    el.querySelector("#btnIn").onclick=doIn;
    el.querySelector("#aPass").addEventListener("keydown",e=>{if(e.key==="Enter")doIn()});}
}


function lbShelf(shelf,bookId){
  const [bc,rest]=shelf.split(":");const sec=rest[0],plan=rest.slice(1);
  let idx=0,found=-1;
  SHELF_IMGS.forEach(g=>{g.imgs.forEach((im,j)=>{
    if(found<0&&g.bc===bc){
      if((bc==="1"||bc==="2")&&g.label==="plan "+plan&&j===(sec==="V"?0:1))found=idx;
      else if(bc==="3"&&g.label==="hylla "+plan)found=idx;
      else if(bc==="4"&&j===0&&g.label===(plan==="3"?"löst i köket":"kokbokshyllan"))found=idx;
      else if(bc!=="1"&&bc!=="2"&&bc!=="3"&&bc!=="4")found=(found<0?idx:found);
    }
    idx++})});
  if(found<0)found=0;
  lbOpen(found);
  lbCap.textContent=locLabel(shelf);
  if(bookId!==undefined){
    const sib=data.filter(d=>d.shelf===shelf);
    const rank=sib.findIndex(d=>d.id===bookId);
    if(rank>=0&&sib.length>1){
      const w=1/sib.length,pad=Math.min(.02,w*.3);
      markFrac={x0:Math.max(0,rank*w-pad),x1:Math.min(1,(rank+1)*w+pad),y0:.08,y1:.95};
      if(bc==="4"||bc==="6"){markFrac.y0=(plan==="2"?.08:.52);markFrac.y1=(plan==="2"?.48:.95)}
      requestAnimationFrame(updateMark);
    }
  }
}

/* exportera klickhanterare tidigt så UI aldrig dör av ett misslyckat DB-anrop */
window.cycle=cycle;window.setLent=setLent;window.lbShelf=lbShelf;window.lbOpen=lbOpen;
window.showInfo=showInfo;window.openShelfView=openShelfView;
window.gapSet=gapSet;window.gapUpload=gapUpload;window.gapNext=gapNext;window.gapSkip=gapSkip;window.gapGo=gapGo;window.gapDelBook=gapDelBook;window.gapRestart=gapRestart;
window.openPlace=openPlace;window.pickPhoto=pickPhoto;window.go=go;window.runAnalys=runAnalys;window.toggleNote=toggleNote;window.saveNote=saveNote;
window.analysEdit=analysEdit;window.analysKeep=analysKeep;window.analysRotate=analysRotate;window.analysDrop=analysDrop;window.analysSetCode=analysSetCode;
window.analysSetSpot=analysSetSpot;window.analysClose=analysClose;window.analysSave=analysSave;
window.setBookCat=setBookCat;window.uploadCover=uploadCover;

const {data:sess}=await sb.auth.getSession();
if(sess&&sess.session)sbUser=sess.session.user;
renderAuth();
try{await loadBcNames()}catch(e){console.warn("bcNames",e)}
try{await loadSpotNames()}catch(e){console.warn("spotNames",e)}
buildShelfOptions();
try{await loadStatuses()}catch(e){console.warn("statuses",e)}
sb.channel("book_status").on("postgres_changes",{event:"*",schema:"public",table:"book_status"},p=>{
  const r=p.new;if(!r)return;const d=data.find(x=>x.id===r.book_id);
  if(d){d.status=r.status;d.lentTo=r.lent_to||"";d.ts=r.seen_date||null;render()}
}).subscribe();

/* ---------- Navigering ---------- */
const VIEWS=["hem","place","delade","salj","gaps","set"];
function go(v,opts){
  curView=v;
  VIEWS.forEach(k=>{const el=document.getElementById("view-"+k);if(el)el.style.display=(k===v?"":"none")});
  const homeish=["hem","place","gaps","set"].includes(v);
  document.querySelectorAll(".tabbar [data-tab]").forEach(t=>{
    const k=t.dataset.tab;t.classList.toggle("active",k==="hem"?homeish:k===v)});
  if(v==="place")renderPlace();
  if(v==="gaps")renderGaps();
  closePanel();
  if(!(opts&&opts.keepScroll))scrollTo({top:0});
}
document.querySelectorAll(".tabbar [data-tab]").forEach(t=>t.addEventListener("click",()=>go(t.dataset.tab)));
/* ---------- Inställningar (sidopanel + undersidor) ---------- */
const panel=document.getElementById("panel"),panelScrim=document.getElementById("panelScrim");
function openPanel(){panel.classList.add("open");panelScrim.classList.add("open")}
function closePanel(){panel.classList.remove("open");panelScrim.classList.remove("open")}
document.getElementById("gearBtn").addEventListener("click",openPanel);
document.getElementById("panelClose").addEventListener("click",closePanel);
panelScrim.addEventListener("click",closePanel);
go("hem",{keepScroll:true});
function openSet(page){
  document.querySelectorAll("#view-set .set-page").forEach(el=>el.classList.toggle("on",el.dataset.page===page));
  go("set");
}
document.querySelectorAll("[data-set]").forEach(b=>b.addEventListener("click",()=>openSet(b.dataset.set)));
document.querySelectorAll("[data-back-settings]").forEach(b=>b.addEventListener("click",()=>{go("hem");openPanel()}));
document.getElementById("replaySplash").addEventListener("click",()=>{closePanel();playSplash()});
/* ---------- Redigera hylla (namn och bild) ---------- */
const sheet=document.getElementById("editSheet"),sheetScrim=document.getElementById("editScrim");
let draft={name:"",avatar:null};
function renderDraft(){
  paintAvatar(document.getElementById("edAvatar"),draft.avatar,draft.name||"Min Bokhylla");
  const picks=placeList().filter(p=>p.photos[0]).map(p=>p.photos[0].thumb);
  document.getElementById("edPicks").innerHTML=picks.map(t=>`<button class="${draft.avatar===t?"on":""}" data-pick="${t}" style="background-image:url('${t}')" aria-label="Välj foto"></button>`).join("");
  document.querySelectorAll("#edPicks [data-pick]").forEach(b=>b.addEventListener("click",()=>{draft.avatar=b.dataset.pick;renderDraft()}));
}
function openEdit(){
  closePanel();draft={name:profile.name,avatar:profile.avatar};
  document.getElementById("edName").value=profile.name;
  renderDraft();sheet.classList.add("open");sheetScrim.classList.add("open");
}
function closeEdit(){sheet.classList.remove("open");sheetScrim.classList.remove("open")}
document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",openEdit));
sheetScrim.addEventListener("click",closeEdit);
document.getElementById("edCancel").addEventListener("click",closeEdit);
document.getElementById("edName").addEventListener("input",e=>{draft.name=e.target.value;if(!draft.avatar)renderDraft()});
document.getElementById("edClear").addEventListener("click",()=>{draft.avatar=null;renderDraft()});
document.getElementById("edFile").addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const url=URL.createObjectURL(f),img=new Image();
  img.onload=()=>{const z=240,sc=Math.max(z/img.width,z/img.height),c=document.createElement("canvas");c.width=z;c.height=z;
    c.getContext("2d").drawImage(img,(z-img.width*sc)/2,(z-img.height*sc)/2,img.width*sc,img.height*sc);
    URL.revokeObjectURL(url);draft.avatar=c.toDataURL("image/jpeg",0.85);renderDraft()};
  img.onerror=()=>{URL.revokeObjectURL(url);alert("Kunde inte läsa bilden. Prova en annan.")};
  img.src=url;e.target.value="";
});
document.getElementById("edSave").addEventListener("click",()=>{
  profile={name:(document.getElementById("edName").value||"").trim()||"Min Bokhylla",avatar:draft.avatar};
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}catch(e){alert("Kunde inte spara i webbläsaren - bilden kan vara för stor.")}
  renderProfile();closeEdit();toast("Sparat");
});
/* ---------- Boklistan (sök) ---------- */
const listWrap=document.getElementById("listWrap"),listToggle=document.getElementById("listToggle");
function setList(open){listWrap.style.display=open?"":"none";
  listToggle.textContent=open?"Dölj boklistan":`Visa hela boklistan (${fmtN(data.length)})`;}
listToggle.addEventListener("click",()=>setList(listWrap.style.display==="none"));
/* ---------- Snabbknappar ---------- */
const QUICK=["Psykologi","Terapi","Religion","Buddhism","Skönlitteratur","Mat","Ledarskap","Organisation","Filosofi"];
const qr=document.getElementById("quickRow");
qr.innerHTML=`<button class="quick" data-q="utlanad">Utlånade</button>`+QUICK.map(c=>`<button class="quick" data-cat="${c}">${c}</button>`).join("");
qr.querySelectorAll(".quick").forEach(b=>b.addEventListener("click",()=>{
  const on=b.classList.contains("on");
  qr.querySelectorAll(".quick").forEach(x=>x.classList.remove("on"));
  fCat="";fs="";
  if(!on){b.classList.add("on");if(b.dataset.cat){fCat=b.dataset.cat;$("#fCat").value=fCat}else{fs="utlanad"}}
  else{$("#fCat").value=""}
  render();setList(!on);
}));
/* ---------- Sälj ---------- */
const HEAT={het:["Het","var(--pink-600)"],medel:["Medel","var(--orange-600)"],lag:["Låg efterfrågan","var(--ink-500)"],
            "kolla-upplaga":["Kolla upplaga","var(--ink-500)"],kolla:["Ej prisverifierad","var(--ink-500)"]};
let SELL=null;
function renderSell(){
  const el=document.getElementById("sellList");if(!el||!SELL)return;
  const s=SELL,sum=s.summary;
  const maxLow=Math.max(1,...s.items.map(it=>it.low||0));
  el.innerHTML=(sum?`<div class="card sell-sum"><span class="fine">Försiktig uppskattning, lägsta pris per titel</span>
      <span class="kr">ca ${fmtN(sum.summa)} kr</span>
      <span class="fine"><span class="mono">${sum.antal_i_summan}</span> prisverifierade titlar · <span class="mono">${sum.heta}</span> heta just nu${sum.kvar_att_kolla?` · <span class="mono">${sum.kvar_att_kolla}</span> kvar att kolla`:""}</span>
      </div>`:"")+
    `<div>`+s.items.map((it,i)=>{
      const h=HEAT[it.heat]||HEAT.kolla;
      const d=data.find(x=>x.title===it.match)||data.find(x=>x.title.startsWith(it.match));
      const loc=d&&d.shelf?locLabel(d.shelf):"";
      return `<div class="sell-row" id="sr-${i}"><button class="sell-head" onclick="toggleSell(${i})">
          <span class="t">${esc(it.title)}</span><span class="p">${esc(shortPrice(it.price))}</span>
          <span class="track"><span style="width:${Math.round((it.low||0)/maxLow*100)}%"></span></span>
          <span class="h" style="color:${h[1]}">${h[0]}</span></button>
        <div class="sell-more">${shortPrice(it.price)!==it.price?`<p><b>Pris:</b> ${esc(it.price)}</p>`:""}${it.why?`<p>${esc(it.why)}</p>`:""}${loc?`<p>Står i: ${esc(loc)}</p>`:""}
          ${it.url?`<a href="${it.url}" target="_blank" rel="noopener">Öppna på Studentapan</a>`:""}</div></div>`}).join("")+`</div>`;
  document.getElementById("sellNote").textContent=(sum&&sum.kommentar?sum.kommentar+" ":"")+(s.note?s.note+" ":"")+"Uppdaterad "+s.updated+".";
}
/* Kortpris till listan: första ledet, utan parentes. Hela priset visas när
   raden fälls ut. "359 kr (uppl 5) / 175 kr (uppl 4)" -> "359 kr". */
function shortPrice(p){return String(p||"").split(/\s\/\s|\s—\s/)[0].replace(/\s*\([^)]*\)/g,"").trim()||p}
function toggleSell(i){const r=document.getElementById("sr-"+i);if(r)r.classList.toggle("open")}
window.toggleSell=toggleSell;
fetch("data/sell.json"+DV).then(r=>r.json()).then(s=>{SELL=s;renderSell()})
  .catch(()=>{document.getElementById("sellList").innerHTML="<p class='fine'>Kunde inte ladda säljlistan.</p>"});

/* ---------- Luckor ---------- */
let GAPS=[],gapState={},gapFilter="open";
async function loadGaps(){
  /* Efter Fas 2.5/2.6: luckdefinitionerna bor i public.gaps. Fältet
     heter `full_img` i tabellen; mappa till `full` for att inte behova
     rora alla lucklasare i UI:t. */
  const {data:gapsRows}=await sb.from("gaps").select("*");
  GAPS=(gapsRows||[]).map(g=>({
    id:g.id, shelf:g.shelf, cap:g.cap, crop:g.crop, full:g.full_img,
    reviewed:g.reviewed, auto:g.auto, note:g.note
  }));
  const {data:statusRows}=await sb.from("gap_status").select("*");
  if(statusRows)statusRows.forEach(r=>gapState[r.gap_id]={state:r.state,photo:r.photo_path,note:r.note,claude:r.claude_note});
  updateGapCount();renderGaps();
}
function gapStateOf(id){
  if(gapState[id]&&gapState[id].state)return gapState[id].state;
  const g=GAPS.find(x=>x.id===id);
  return (g&&g.auto)||"open";
}
/* ---------- Luckflödet: en lucka i taget ---------- */
let gapCur=null,gapText={},gapCat={},gapNewCat={},gapMsg="";
const gapSkipped=new Set();
const gapOpenList=()=>GAPS.filter(g=>gapStateOf(g.id)!=="done");
function updateGapCount(){
  const total=GAPS.length,open=gapOpenList().length,solved=total-open;
  const pct=total?Math.round(solved/total*100):0;
  const set=(id,t)=>{const el=document.getElementById(id);if(el)el.textContent=t};
  set("gapCount",open+" kvar");
  set("gapCardTxt",total?(open?`${solved} av ${total} olästa partier lösta. De som är kvar behöver närbild.`:`Alla ${total} olästa partier är lösta.`):"Inga luckor inlästa.");
  set("gapSolvedTxt",`${solved} / ${total} lösta`);
  ["gapCardProg","gapProg"].forEach(id=>{const el=document.getElementById(id);if(el)el.style.width=pct+"%"});
  const dot=document.getElementById("gearDot");if(dot)dot.classList.toggle("on",open>0);
}
function shelfDefaultCat(shelf){
  const cm={};data.filter(d=>d.shelf===shelf).forEach(d=>cm[d.cat]=(cm[d.cat]||0)+1);
  const top=Object.entries(cm).sort((a,b)=>b[1]-a[1])[0];return top?top[0]:"";
}
function renderGaps(){
  updateGapCount();
  const flow=document.getElementById("gapFlow"),all=document.getElementById("gapList");
  if(!flow)return;
  const open=gapOpenList();
  let g=GAPS.find(x=>x.id===gapCur);
  if(!g){g=open.find(x=>!gapSkipped.has(x.id));gapCur=g?g.id:null}
  const msg=gapMsg?`<span class="g-ok">${esc(gapMsg)}</span>`:"";
  if(!g){
    flow.innerHTML=msg+`<div class="g-done"><b>Alla luckor är genomgångna</b>
      <span>${open.length?`${open.length} hoppade luckor ligger kvar till nästa gång.`:"Nya böcker finns nu i katalogen."}</span>
      ${open.length?`<button class="btn btn-outline btn-sm" onclick="gapRestart()">Börja om</button>`:""}</div>`;
  }else{
    const st=gapStateOf(g.id),S=gapState[g.id]||{},ph=S.photo;
    const idx=open.findIndex(x=>x.id===g.id);
    const bc=g.shelf?g.shelf.split(":")[0]:"";
    if(!(g.id in gapCat))gapCat[g.id]=shelfDefaultCat(g.shelf);
    const added=gapAdded[g.id]||[];
    const stTag=st==="waiting"?`<span class="badge b-warning">${S.claude?"Avläst – kontrollera":"Foto skickat – väntar på avläsning"}</span>`
               :st==="done"?`<span class="badge b-success">Klar</span>`:"";
    flow.innerHTML=`<div class="gap-one">
      <div class="g-title"><b>${idx>=0?`Lucka ${idx+1} av ${open.length} · `:""}${esc(g.cap||locLabel(g.shelf))}</b><span>${esc(bcNames[bc]||"")}</span></div>
      <div class="g-full"><img src="${ph||g.full||g.crop}" alt="Hela hyllfotot" onclick="lbGap('${ph||g.full||g.crop}')"></div>
      <div class="g-crop"><img src="${g.crop}" alt="Utsnitt av luckan" onclick="lbGap('${g.crop}')">
        <div class="g-note">${stTag}${g.note?`<span>${esc(g.note)}</span>`:`<span class="muted">Ryggarna här gick inte att läsa på det stora fotot. En närbild brukar räcka.</span>`}
          ${S.claude?`<span class="g-claude">Avläsning: ${esc(S.claude)}</span>`:""}</div></div>
      ${S.claude?`<div class="note-edit" id="ne-gap-${g.id}" style="display:none">
          <textarea class="note-ta" id="nt-gap-${g.id}">${esc(S.claude)}</textarea>
          <div class="gap-actions" style="margin-top:.4rem"><button onclick="saveNote('gap','${g.id}',this)">Spara ändringar</button>
          <button class="ghost" onclick="toggleNote('gap','${g.id}')">Avbryt</button></div></div>`:""}
      <div class="g-tools">
        <label class="btn btn-outline btn-sm btn-ic">${ic("camera")}Fota närbild<input type="file" accept="image/*" hidden onchange="gapUpload('${g.id}',this)"></label>
        ${ph?`<button class="btn btn-outline btn-sm" onclick="runAnalys('gap','${g.id}',this)">Läs av fotot</button>`:""}
        ${S.claude?`<button class="btn btn-ghost btn-sm" onclick="toggleNote('gap','${g.id}')">Rätta avläsningen</button>`:""}
      </div>
      <div class="analys-box" id="ab-gap-${g.id}" style="display:none"></div>
      <span class="fine">Skriv in böckerna du ser — en rad per bok.</span>
      <textarea class="g-text" id="gt-${g.id}" rows="3" placeholder="Titel – Författare">${esc(gapText[g.id]||"")}</textarea>
      <div class="g-cat"><select class="inp" id="gc-${g.id}">${catOptions(gapCat[g.id])}</select>
        <input class="inp" id="gn-${g.id}" placeholder="Ny kategoris namn" value="${esc(gapNewCat[g.id]||"")}" style="display:${gapCat[g.id]==="__new"?"":"none"}"></div>
      ${added.length?`<div class="g-added"><span class="lbl">Inskrivna här</span><ul>${added.map(b=>`<li><span>${esc(b.title)}${b.author?" – "+esc(b.author):""}</span>
          <button onclick="gapDelBook('${g.id}',${b.id})" aria-label="Ta bort">✕</button></li>`).join("")}</ul></div>`:""}
      <div class="btn-row">
        ${st==="done"?`<button class="btn btn-outline" onclick="gapSet('${g.id}','open')">Öppna igen</button><button class="btn btn-ghost" onclick="gapSkip('${g.id}')">Nästa lucka</button>`
          :`<button class="btn btn-primary" onclick="gapNext('${g.id}',this)">Spara och nästa</button><button class="btn btn-ghost" onclick="gapSkip('${g.id}')">Hoppa över</button>`}
      </div>${msg}</div>`;
    const ta=document.getElementById("gt-"+g.id),sel=document.getElementById("gc-"+g.id),nc=document.getElementById("gn-"+g.id);
    ta.addEventListener("input",()=>gapText[g.id]=ta.value);
    sel.addEventListener("change",()=>{gapCat[g.id]=sel.value;nc.style.display=sel.value==="__new"?"":"none";if(sel.value==="__new")nc.focus()});
    nc.addEventListener("input",()=>gapNewCat[g.id]=nc.value);
  }
  if(all)all.innerHTML=GAPS.map(x=>{const st=gapStateOf(x.id);
    return `<button class="ga-row" onclick="gapGo('${x.id}')"><img src="${x.crop}" alt="" loading="lazy">
      <span>${esc(x.cap||"")}<small>${esc(bcNames[(x.shelf||"").split(":")[0]]||"")}</small></span>
      <span class="badge ${st==="done"?"b-success":st==="waiting"?"b-warning":"b-brand"}" style="flex:none">${st==="done"?"Klar":st==="waiting"?"Väntar":"Kvar"}</span></button>`}).join("");
}
function gapGo(id){gapCur=id;gapMsg="";renderGaps();scrollTo({top:0,behavior:"smooth"})}
function gapSkip(id){gapSkipped.add(id);gapCur=null;gapMsg="";renderGaps();scrollTo({top:0,behavior:"smooth"})}
function gapRestart(){gapSkipped.clear();gapCur=null;gapMsg="";renderGaps()}
/* "Titel – Författare", en per rad. Tankstreck, bindestreck med mellanslag
   runt, eller " av " skiljer titel från författare. */
function parseGapLines(txt){
  return (txt||"").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    const m=l.split(/\s[–—-]\s|\s+av\s+/i);
    return {title:m[0].trim(),author:(m.slice(1).join(" – ")||"").trim()};
  }).filter(r=>r.title);
}
let gapSkippedN=0;
async function gapNext(id,btn){
  gapSkippedN=0;
  if(!sbUser){alert("Logga in för att spara luckor.");return}
  const g=GAPS.find(x=>x.id===id);if(!g)return;
  let cat=gapCat[id]||"";
  if(cat==="__new")cat=(gapNewCat[id]||"").trim();
  const existing=new Set((gapAdded[id]||[]).map(x=>x.title.toLowerCase()));
  const rows=parseGapLines(gapText[id]).filter(r=>!existing.has(r.title.toLowerCase()));
  if(btn){btn.disabled=true;btn.textContent="Sparar…"}
  try{
    if(rows.length){
      const res=await insertBooks(rows.map(r=>({title:r.title,author:r.author,cat:cat||"Okategoriserad",shelf:g.shelf,gap_id:id,created_by:sbUser.id})));
      gapSkippedN=res.skipped.length;
      res.inserted.forEach(r=>(gapAdded[id]=gapAdded[id]||[]).push({id:r.id,title:r.title,author:r.author||"",cat:r.cat||""}));
      rows.length=res.inserted.length;
      buildShelfOptions();rebuildCatFilter();render();
    }
    gapText[id]="";
    gapMsg=(gapSkippedN?`${gapSkippedN} fanns redan och hoppades över. `:"")+(rows.length?`${rows.length} ${rows.length>1?"böcker":"bok"} tillagd${rows.length>1?"a":""} i ${g.cap||locLabel(g.shelf)}`:"Luckan markerad som löst");
    gapCur=null;
    await gapSet(id,"done");
    scrollTo({top:0,behavior:"smooth"});
  }catch(e){
    alert("Kunde inte spara: "+(e.message||e));
    if(btn){btn.disabled=false;btn.textContent="Spara och nästa"}
  }
}
async function gapDelBook(gid,rowId){
  if(!sbUser){alert("Logga in för att ändra.");return}
  const b=(gapAdded[gid]||[]).find(x=>x.id===rowId);if(!b)return;
  if(!confirm(`Ta bort "${b.title}" ur katalogen?`))return;
  const {error}=await sb.from("manual_books").delete().eq("id",rowId);
  if(error){alert("Kunde inte ta bort: "+error.message);return}
  gapAdded[gid]=(gapAdded[gid]||[]).filter(x=>x.id!==rowId);
  const k=data.findIndex(d=>d.id===1e6+rowId);if(k>=0)data.splice(k,1);
  render();renderGaps();
}
function catOptions(sel){
  const cats=[...new Set(data.map(d=>d.cat))].sort((a,b)=>a.localeCompare(b,"sv"));
  return `<option value="">Kategori…</option>`+cats.map(c=>`<option${c===sel?" selected":""}>${c}</option>`).join("")+`<option value="__new">➕ Ny kategori…</option>`;
}
async function gapSet(id,state,photo){
  if(!sbUser){alert("Logga in för att ändra luckor.");return}
  gapState[id]={state,photo:(photo||(gapState[id]&&gapState[id].photo)),
                claude:(gapState[id]&&gapState[id].claude)};
  await sb.from("gap_status").upsert({gap_id:id,state,photo_path:gapState[id].photo||null,updated_at:new Date().toISOString(),updated_by:sbUser.id});
  updateGapCount();renderGaps();
}
function shrinkToDataURL(file,maxW,quality){
  return new Promise((res,rej)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      const r=Math.min(1,maxW/img.width);
      const c=document.createElement("canvas");
      c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg",quality));
    };
    img.onerror=e=>{URL.revokeObjectURL(url);rej(e)};
    img.src=url;
  });
}
async function gapUpload(id,input){
  if(!sbUser){alert("Logga in för att ladda upp foto.");return}
  const f=input.files[0];if(!f)return;
  const path=`${id}-${Date.now()}.jpg`;
  const {error}=await sb.storage.from("gap-photos").upload(path,f,{upsert:true});
  if(error){alert("Kunde inte ladda upp: "+error.message);return}
  const {data:pub}=sb.storage.from("gap-photos").getPublicUrl(path);
  let dataUrl=null;
  try{dataUrl=await shrinkToDataURL(f,1100,0.62)}
  catch(e){
    console.warn("nedskalning misslyckades, sparar original",e);
    try{dataUrl=await new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.onerror=rej;rd.readAsDataURL(f)})}
    catch(e2){console.warn("kunde inte läsa filen",e2)}
  }
  if(!dataUrl){alert("Varning: bilden kunde inte förberedas för avläsning. Prova igen eller välj bild ur biblioteket.");}
  gapState[id]={state:"waiting",photo:pub.publicUrl};
  await sb.from("gap_status").upsert({gap_id:id,state:"waiting",photo_path:pub.publicUrl,
    photo_data:dataUrl,updated_at:new Date().toISOString(),updated_by:sbUser.id});
  updateGapCount();renderGaps();
  alert("Foto skickat! Luckan står kvar i listan.\n\nJag läser av bilden och fyller i böckerna – sedan kontrollerar du dem och trycker ✓ Klar.");
}
/* ---------- Hyllkoder ur fria etiketter ---------- */
/* "Vänster plan 3" -> 1:V3 · "Plan 2" -> 1:S2 · "Skrivbordet" -> 1:L1
   Returnerar null nar etiketten inte beskriver ett hyllplan alls - da ar det
   en los plats och koden tilldelas av nextSpotCode(). */
function guessShelfCode(bc,label){
  const raw=(label||"").trim();
  if(/^\d+:[VHSKL]\d+$/i.test(raw))return raw.toUpperCase();
  const t=raw.toLowerCase();
  const num=(t.match(/(\d+)/)||[])[1];
  if(!num)return null;
  if(/v[aä]nster|^v\b/.test(t))return bc+":V"+num;
  if(/h[oö]ger|^h\b/.test(t))return bc+":H"+num;
  if(/plan|hylla|rad|niv[aå]/.test(t))return bc+":S"+num;
  if(/^\d+$/.test(t))return bc+":S"+num;
  return null;
}
/* Los plats: aterbruka koden om platsen redan har en. Utan det far
   skrivbordet en ny kod vid varje avlasning, och bockerna sprids ut. */
function spotCodeFor(bc,label){
  const lbl=(label||"").trim().toLowerCase();
  if(lbl){
    const known=Object.keys(spotNames).find(c=>
      c.startsWith(bc+":L")&&(spotNames[c]||"").trim().toLowerCase()===lbl);
    if(known)return known;
  }
  let n=1;while(spotNames[bc+":L"+n])n++;
  return bc+":L"+n;
}
function nextSpotCode(bc){return spotCodeFor(bc,"")}

/* ---------- Granska avlasta bocker ---------- */
/* Ar boken redan katalogiserad? Jamfor normaliserat pa titel + forfattare.
   OBS: taeker bade de 737 ur filen och raderna ur databasen, eftersom bada
   ligger i `data` vid det har laget. Databasens unik-regel skyddar daremot
   bara manual_books - filens bocker ar oskyddade tills Fas 2 ar klar. */
function normTitle(s){return (s||"").toLowerCase().trim().replace(/\s+/g," ")}
/* Kort namn utan undertitlar och parenteser. Anvands for att jamfora bocker
   som star med undertiteln i ena avlasningen men inte den andra, och for att
   samma bok inte ska rakans som olika bara for att en parentes lagts till.
   Bade "Kommunikation i praktiken" och "Kommunikation i praktiken – ..."
   krymper till samma strang, och "En Garde!" krymper likadant som
   "Avancerat rollspel ... – En Garde!" om vi tittar pa bada halvorna. */
function baseTitle(s){
  let t=normTitle(s).replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim();
  const cut=t.split(/\s[–—-]\s|:\s/)[0].trim();
  return cut.length>=4?cut:t;
}
/* Halvorna kring ett tankstreck, i normaliserad form. "En Garde! – Avancerat
   rollspel" ger ["en garde!","avancerat rollspel"]. En bok raknas som kand om
   nagon halva matchar en befintlig titel. */
function titleParts(s){
  const t=normTitle(s).replace(/\s*\([^)]*\)\s*/g," ").replace(/\s+/g," ").trim();
  return t.split(/\s[–—-]\s|:\s/).map(x=>x.trim()).filter(x=>x.length>=4);
}
/* Efternamnet ur ett forfattarnamn - "Johan Egerkrans" -> "egerkrans".
   Anvands for att tolerera att avlasningen ibland tappar sista bokstaverna
   ("Johan Egerk") eller bara ger efternamnet. */
function authorKey(s){
  const t=normTitle(s).replace(/[.,]/g,"").trim();
  if(!t)return "";
  const parts=t.split(/\s+/);
  return parts[parts.length-1];
}
/* Ar tva forfattarnamn "samma nog"? Bagge tomma -> ja (kan inte saga emot).
   En prefix pa den andra pa minst tre tecken -> ja ("egerk" mot "egerkrans").
   Annars: samma efternamn ger ja. */
function authorMatch(a,b){
  const x=normTitle(a),y=normTitle(b);
  if(!x||!y)return true;
  if(x===y)return true;
  const short=x.length<y.length?x:y, long=x.length<y.length?y:x;
  if(short.length>=3&&long.startsWith(short))return true;
  const ka=authorKey(a), kb=authorKey(b);
  return ka&&kb&&ka===kb;
}
function knownBook(title,author,shelf){
  const t=normTitle(title);
  if(!t)return null;
  const parts=titleParts(title);
  const hit=data.find(d=>{
    if(!authorMatch(d.author,author))return false;
    if(normTitle(d.title)===t)return true;
    /* Nagon del av den nya titeln ska matcha nagon del av den gamla. */
    const dp=titleParts(d.title);
    return parts.some(p=>dp.includes(p));
  });
  if(!hit)return null;
  return {sameShelf:hit.shelf===shelf, where:locLabel(hit.shelf)};
}
let analysBooks={};   /* key -> {books, shelf, spotLabel, kind, id} */

function analysKey(kind,id){return kind+"-"+id}

function renderAnalys(kind,id){
  const key=analysKey(kind,id);
  const wrap=document.getElementById("ab-"+key);
  const st=analysBooks[key];
  if(!wrap||!st)return;
  const isSpot=/:L\d+$/.test(st.shelf||"");
  const kanda=st.books.filter(b=>knownBook(b.title,b.author,st.shelf)).length;
  wrap.innerHTML=`${st.src?`<div class="ab-photo">
      <img src="${st.src}" alt="Fotot som lästes av" style="transform:rotate(${st.rot||0}deg)"
           onclick="lbGap('${st.src}')" title="Klicka för att zooma">
      <button class="ghost ab-rot" onclick="analysRotate('${kind}','${id}')">↻ Vrid</button>
    </div>`:""}<div class="ab-list"><p class="gap-help">${st.books.length} böcker avlästa. Rätta det som blivit fel, stryk det som inte är en bok, och spara. Gulmarkerade rader var osäkra.${kanda?` <b>${kanda} finns redan i katalogen</b> och är förvalt bortvalda.`:""}</p>
    <div class="ab-place">
      <label>Hyllkod <input class="ab-code" value="${(st.shelf||"").replace(/"/g,'&quot;')}" onchange="analysSetCode('${kind}','${id}',this.value)"></label>
      ${isSpot?`<label>Platsens namn <input class="ab-spot" value="${(st.spotLabel||"").replace(/"/g,'&quot;')}" onchange="analysSetSpot('${kind}','${id}',this.value)" placeholder="T.ex. Skrivbordet"></label>`:""}
    </div>
    <div class="ab-rows">${st.books.map((b,i)=>{
      const known=knownBook(b.title,b.author,st.shelf);
      return `<div class="ab-row${b.uncertain?" unsure":""}${known?" known":""}">
        <label class="ab-keep" title="${b.skip?"Sparas inte":"Sparas"}">
          <input type="checkbox" ${b.skip?"":"checked"} onchange="analysKeep('${kind}','${id}',${i},this.checked)"></label>
        <input class="ab-t" value="${(b.title||"").replace(/"/g,'&quot;')}" placeholder="Titel" onchange="analysEdit('${kind}','${id}',${i},'title',this.value)">
        <input class="ab-a" value="${(b.author||"").replace(/"/g,'&quot;')}" placeholder="Författare" onchange="analysEdit('${kind}','${id}',${i},'author',this.value)">
        <select class="ab-c" onchange="analysEdit('${kind}','${id}',${i},'cat',this.value)">${catOptions(b.cat)}</select>
        <button class="ab-x" title="Stryk raden helt" onclick="analysDrop('${kind}','${id}',${i})">✕</button>
        ${known?`<span class="ab-known">Finns redan${known.sameShelf?" här":" – "+known.where}</span>`:""}
      </div>`}).join("")}</div>
    <div class="gap-actions" style="margin-top:.5rem">
      <button onclick="analysSave('${kind}','${id}',this)">💾 Lägg in ${st.books.filter(b=>!b.skip&&(b.title||"").trim()).length} böcker</button>
      <button class="ghost" onclick="analysClose('${kind}','${id}')">Avbryt</button>
    </div></div>`;
  wrap.style.display="";
}
function analysEdit(kind,id,i,field,v){
  const st=analysBooks[analysKey(kind,id)];if(!st)return;
  st.books[i][field]=v;
  if(field==="title"||field==="author"){
    st.books[i].uncertain=false;
    /* En rattad titel kan gora en okand bok kand, eller tvartom. */
    st.books[i].skip=!!knownBook(st.books[i].title,st.books[i].author,st.shelf);
    renderAnalys(kind,id);
  }
}
function analysRotate(kind,id){
  const st=analysBooks[analysKey(kind,id)];if(!st)return;
  st.rot=((st.rot||0)+90)%360;renderAnalys(kind,id);
}
function analysKeep(kind,id,i,checked){
  const st=analysBooks[analysKey(kind,id)];if(!st)return;
  st.books[i].skip=!checked;renderAnalys(kind,id);
}
function analysDrop(kind,id,i){
  const st=analysBooks[analysKey(kind,id)];if(!st)return;
  st.books.splice(i,1);renderAnalys(kind,id);
}
function analysSetCode(kind,id,v){
  const st=analysBooks[analysKey(kind,id)];if(!st)return;
  st.shelf=(v||"").trim().toUpperCase();renderAnalys(kind,id);
}
function analysSetSpot(kind,id,v){
  const st=analysBooks[analysKey(kind,id)];if(!st)return;
  st.spotLabel=(v||"").trim();
}
function analysClose(kind,id){
  const w=document.getElementById("ab-"+analysKey(kind,id));
  if(w){w.style.display="none"}
}
/* Lägg in böcker utan att en enda dubblett fäller hela sparningen.
   Databasen tillåter samma titel + författare bara en gång per hyllkod
   (manual_books_unik_bok, normaliserat på gemener och trimmad text).
   Vi sorterar bort sådana rader i förväg, och skulle någon ändå slinka
   igenom sparar vi rad för rad och hoppar över just den. */
const bookKey=(t,a,sh)=>[(t||"").trim().toLowerCase(),(a||"").trim().toLowerCase(),sh||""].join("|");
async function insertBooks(payload){
  const have=new Set(data.filter(d=>d.shelf).map(d=>bookKey(d.title,d.author,d.shelf)));
  const fresh=[],skipped=[];
  payload.forEach(r=>{const k=bookKey(r.title,r.author,r.shelf);
    if(have.has(k)){skipped.push(r.title)}else{have.add(k);fresh.push(r)}});
  let inserted=[];
  if(fresh.length){
    const {data:ins,error}=await sb.from("manual_books").insert(fresh).select();
    if(!error)inserted=ins||[];
    else if(error.code==="23505"||/unik_bok|duplicate key/i.test(error.message||"")){
      for(const r of fresh){
        const {data:one,error:e1}=await sb.from("manual_books").insert(r).select();
        if(!e1)inserted=inserted.concat(one||[]);
        else if(e1.code==="23505"||/unik_bok|duplicate key/i.test(e1.message||""))skipped.push(r.title);
        else throw e1;
      }
    }else throw error;
  }
  inserted.forEach(r=>{
    data.push({id:1e6+r.id,title:r.title,author:r.author||"",cat:r.cat||"Okategoriserad",
               shelf:r.shelf,status:"hylla",lentTo:"",ts:null});
    if(r.description)BOOK_INFO[r.title]=r.description;
  });
  return {inserted,skipped};
}
const skippedTxt=sk=>sk.length?` ${sk.length} fanns redan på hyllan och hoppades över.`:"";
async function analysSave(kind,id,btn){
  const key=analysKey(kind,id),st=analysBooks[key];
  if(!st)return;
  if(!sbUser){alert("Logga in för att spara.");return}
  const shelf=(st.shelf||"").trim().toUpperCase();
  if(!/^\d+:[VHSKL]\d+$/.test(shelf)){
    alert("Hyllkoden ser inte rätt ut. Den ska se ut som 10:S3, 1:V2 eller 10:L1.");return;
  }
  const rows=st.books.filter(b=>!b.skip&&(b.title||"").trim());
  if(!rows.length){alert("Inga böcker är valda att läggas in.");return}
  const label=btn?btn.textContent:null;
  if(btn){btn.disabled=true;btn.textContent="Sparar…"}
  try{
    if(/:L\d+$/.test(shelf)&&st.spotLabel){
      await sb.from("spot_names").upsert({code:shelf,name:st.spotLabel});
      spotNames[shelf]=st.spotLabel;
    }
    const payload=rows.map(b=>({
      title:(b.title||"").trim(), author:(b.author||"").trim(),
      cat:(b.cat||"Okategoriserad"), shelf,
      description:(b.description||"").trim()||null,
      source:"claude", uncertain:!!b.uncertain, created_by:sbUser.id}));
    const {inserted:ins,skipped}=await insertBooks(payload);
    delete analysBooks[key];
    analysClose(kind,id);
    buildShelfOptions();rebuildCatFilter();render();
    if(kind==="gap")renderGaps();else await loadNewShelves();
    alert(`${ins.length} ${ins.length===1?"bok":"böcker"} inlagda på ${locLabel(shelf)}.${skippedTxt(skipped)}\n\nKontrollera dem i boklistan och klarmarkera hyllan när du är nöjd.`);
  }catch(e){
    alert("Kunde inte spara: "+(e.message||e));
    if(btn){btn.disabled=false;btn.textContent=label}
  }
}

/* ---------- Analysera foto med Claude (edge function) ---------- */
const ANALYS_URL=SB_URL.replace(".supabase.co",".functions.supabase.co")+"/analysera";
async function runAnalys(kind,id,btn){
  if(!sbUser){alert("Logga in för att analysera.");return}
  const label=btn?btn.textContent:null;
  if(btn){btn.disabled=true;btn.textContent="🤖 Läser av…"}
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)throw new Error("Sessionen har gått ut – logga in igen.");
    const cats=[...new Set(data.map(d=>d.cat))].sort((a,b)=>a.localeCompare(b,"sv"));
    const res=await fetch(ANALYS_URL,{method:"POST",
      headers:{Authorization:"Bearer "+session.access_token,"content-type":"application/json"},
      body:JSON.stringify({kind,id:String(id),cats})});
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.error||("Analysen misslyckades ("+res.status+")"));
    /* Bockerna ar ett forslag. De sparas inte forran du granskat dem. */
    if(out.books&&out.books.length){
      const g=(kind==="gap")?GAPS.find(x=>x.id===id):null;
      const row=(kind==="shelf")?(window.__nsRows||[]).find(x=>String(x.id)===String(id)):null;
      const bc=g&&g.shelf?g.shelf.split(":")[0]:(row?row.bc:null);
      let shelf=g&&g.shelf?g.shelf:(row?(guessShelfCode(row.bc,row.shelf_code||row.label)):null);
      let spotLabel="";
      if(!shelf&&bc){
        spotLabel=(row&&row.label)||"";
        shelf=spotCodeFor(bc,spotLabel);
      }
      /* Bocker som redan star i katalogen valjs bort direkt - du far bocka i
         dem sjalv om du verkligen vill ha en till. */
      out.books.forEach(b=>{b.skip=!!knownBook(b.title,b.author,shelf||"")});
      /* Fotot foljer med sa att granskningen kan visa bild och lista bredvid
         varandra - utan bilden gar listan inte att kontrollera. */
      const src=(kind==="gap")
        ? ((gapState[id]&&gapState[id].photo)||(g&&(g.full||g.crop))||null)
        : (row?(row.photo_data||row.photo_url):null);
      analysBooks[analysKey(kind,id)]={books:out.books,shelf:shelf||"",spotLabel,kind,id,src,rot:0};
    }
    if(kind==="gap"){
      gapState[id]={state:"waiting",photo:(gapState[id]&&gapState[id].photo),claude:out.note};
      updateGapCount();renderGaps();
    }else{
      await loadNewShelves();
    }
    if(analysBooks[analysKey(kind,id)])renderAnalys(kind,id);
  }catch(e){
    alert("Kunde inte analysera: "+(e.message||e));
    if(btn){btn.disabled=false;btn.textContent=label}
  }
}
function toggleNote(kind,id){
  const box=document.getElementById("ne-"+kind+"-"+id);if(!box)return;
  box.style.display = box.style.display==="none" ? "" : "none";
}
async function saveNote(kind,id,btn){
  if(!sbUser){alert("Logga in för att spara.");return}
  const ta=document.getElementById("nt-"+kind+"-"+id);if(!ta)return;
  const text=ta.value.trim();
  const label=btn?btn.textContent:null;
  if(btn){btn.disabled=true;btn.textContent="Sparar…"}
  try{
    if(kind==="gap"){
      const {error}=await sb.from("gap_status")
        .upsert({gap_id:id,claude_note:text,updated_at:new Date().toISOString(),updated_by:sbUser.id});
      if(error)throw error;
      gapState[id]=Object.assign({},gapState[id],{claude:text});
      renderGaps();
    }else{
      const {error}=await sb.from("new_shelves").update({claude_note:text}).eq("id",Number(id));
      if(error)throw error;
      await loadNewShelves();
    }
  }catch(e){
    alert("Kunde inte spara: "+(e.message||e));
    if(btn){btn.disabled=false;btn.textContent=label}
  }
}
let gapAdded={};
/* Utloggade laser via vyn books_public - bara titel, forfattare, kategori,
   beskrivning och kalla. Inloggade laser hela manual_books med hyllplats,
   lucksignal och skaparinfo. Vyn ar oppen for anon, tabellen ar det inte. */
async function loadManualBooks(){
  if(sbUser){
    const {data:rows}=await sb.from("manual_books").select("*");
    if(rows)rows.forEach(r=>{
      data.push({id:1e6+r.id,title:r.title,author:r.author||"",cat:r.cat||"Okategoriserad",shelf:r.shelf,status:"hylla",lentTo:"",ts:null});
      if(r.description&&!BOOK_INFO[r.title])BOOK_INFO[r.title]=r.description;
      if(r.gap_id){(gapAdded[r.gap_id]=gapAdded[r.gap_id]||[]).push({id:r.id,title:r.title,author:r.author||"",cat:r.cat||""})}
    });
  }else{
    const {data:rows}=await sb.from("books_public").select("*");
    if(rows)rows.forEach(r=>{
      /* Ingen hyllplats - utloggade ska inte veta var bocker star. */
      data.push({id:1e6+r.id,title:r.title,author:r.author||"",cat:r.cat||"Okategoriserad",shelf:"",status:"hylla",lentTo:"",ts:null});
      if(r.description&&!BOOK_INFO[r.title])BOOK_INFO[r.title]=r.description;
    });
  }
}
document.getElementById("openGaps").addEventListener("click",()=>{gapCur=null;gapMsg="";go("gaps")});
window.lbGap=(src)=>{lb.classList.add("open");document.body.style.overflow="hidden";markFrac=null;scale=1;tx=0;ty=0;lbImg.style.transform="none";lbImg.src=src;lbCap.textContent="Lucka – scrolla för att zooma, dra för att flytta";lbImg.onload=()=>{measureBase();applyT()}};

/* ---------- Kategoriredigering ---------- */
let catRenames={};
async function loadCatEdits(){
  const [{data:rn},{data:bc}]=await Promise.all([
    sb.from("cat_renames").select("*"), sb.from("book_cat").select("*")]);
  if(rn)rn.forEach(r=>catRenames[r.old_name]=r.new_name);
  data.forEach(d=>{if(catRenames[d.cat])d.cat=catRenames[d.cat]});
  if(bc){const m={};bc.forEach(r=>m[r.book_id]=r.cat);
    data.forEach(d=>{if(m[d.id])d.cat=m[d.id]})}
  rebuildCatFilter();render();renderCatEditor();
}
function rebuildCatFilter(){
  const sel=$("#fCat"),cur=sel.value;
  sel.innerHTML='<option value="">Alla kategorier</option>'+
    [...new Set(data.map(d=>d.cat))].sort((a,b)=>a.localeCompare(b,"sv")).map(c=>`<option>${c}</option>`).join("");
  sel.value=cur;
}
function renderCatEditor(){
  const el=document.getElementById("catEditor");if(!el)return;
  const counts={};data.forEach(d=>counts[d.cat]=(counts[d.cat]||0)+1);
  const cats=Object.keys(counts).sort((a,b)=>counts[b]-counts[a]);
  el.innerHTML=`<div class="cat-list">`+cats.map(c=>
    `<div class="cat-row"><input value="${c.replace(/"/g,'&quot;')}" data-old="${c.replace(/"/g,'&quot;')}"><span class="cat-n">${counts[c]}</span></div>`).join("")+`</div>`;
  el.querySelectorAll(".cat-row input").forEach(inp=>{
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")inp.blur()});
    inp.addEventListener("blur",async()=>{
      const oldN=inp.dataset.old,newN=inp.value.trim();
      if(!newN||newN===oldN){inp.value=oldN;return}
      if(!sbUser){alert("Logga in för att ändra kategorier.");inp.value=oldN;return}
      data.forEach(d=>{if(d.cat===oldN)d.cat=newN});
      catRenames[oldN]=newN;
      await sb.from("cat_renames").upsert({old_name:oldN,new_name:newN,updated_at:new Date().toISOString()});
      rebuildCatFilter();render();renderCatEditor();
    })});
}
async function setBookCat(id,cat){
  if(!sbUser){alert("Logga in för att ändra kategori.");return}
  const d=data.find(x=>x.id===id);if(!d)return;
  d.cat=cat;
  await sb.from("book_cat").upsert({book_id:id,cat,updated_at:new Date().toISOString()});
  rebuildCatFilter();render();renderCatEditor();
}

/* ---------- Bokomslag ---------- */
let coverCache={};
try{coverCache=JSON.parse(localStorage.getItem("bokhyllan-covers")||"{}")}catch(e){}
let coverOverrides={};
async function loadCoverOverrides(){
  const {data:rows}=await sb.from("book_cover").select("*");
  if(rows)rows.forEach(r=>coverOverrides[r.book_id]=r.url);
}
async function findCover(d){
  if(coverOverrides[d.id])return coverOverrides[d.id];
  const key=d.title+"|"+(d.author||"");
  if(key in coverCache)return coverCache[key];
  try{
    const q=encodeURIComponent(d.title+(d.author?" "+d.author:""));
    const r=await fetch(`https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i`);
    const js=await r.json();
    const ci=js.docs&&js.docs[0]&&js.docs[0].cover_i;
    const url=ci?`https://covers.openlibrary.org/b/id/${ci}-M.jpg`:null;
    coverCache[key]=url;
    try{localStorage.setItem("bokhyllan-covers",JSON.stringify(coverCache))}catch(e){}
    return url;
  }catch(e){return null}
}
async function uploadCover(id,input){
  if(!sbUser){alert("Logga in för att ladda upp omslag.");return}
  const f=input.files[0];if(!f)return;
  const path=`cover-${id}-${Date.now()}.jpg`;
  const {error}=await sb.storage.from("gap-photos").upload(path,f,{upsert:true});
  if(error){alert("Kunde inte ladda upp: "+error.message);return}
  const {data:pub}=sb.storage.from("gap-photos").getPublicUrl(path);
  coverOverrides[id]=pub.publicUrl;
  await sb.from("book_cover").upsert({book_id:id,url:pub.publicUrl});
  const slot=document.getElementById("ibCover");
  if(slot)slot.innerHTML=`<img src="${pub.publicUrl}" alt="Omslag">`;
}


/* ---------- Ny hylla (guide) ---------- */
let nsState=null;

function nextFreeBc(){
  const used=new Set([...Object.keys(bcNames),...data.map(d=>d.shelf.split(":")[0])].map(Number).filter(n=>!isNaN(n)));
  let n=1; while(used.has(n)) n++; return String(n);
}
function nsRender(){
  const el=document.getElementById("nsWizard");if(!el)return;
  if(!nsState){el.innerHTML="";el.classList.remove("open");return}
  el.classList.add("open");
  const S=nsState;
  let html=`<div class="ns-head"><strong>${S.mode==="new"?"Ny plats":"Nytt foto"}</strong>
    <button class="ns-x" onclick="nsCancel()">✕</button></div>`;

  if(S.step===1){
    html+=`<p class="ns-q">Vad vill du göra?</p>
      <div class="ns-choices">
        <button onclick="nsPick('new')">🆕 Lägg till en ny plats<small>En bokhylla eller ett rum som inte finns i appen</small></button>
        <button onclick="nsPick('update')">🔄 Nytt foto av en hylla som finns<small>Hyllan har ändrats sedan sist</small></button>
      </div>`;
  }
  else if(S.step===2&&S.mode==="new"){
    html+=`<p class="ns-q">Vad heter platsen?</p>
      <input id="nsNameInp" class="ns-inp" placeholder="T.ex. Arbetsrummet" value="${(S.name||"").replace(/"/g,'&quot;')}">
      <p class="ns-hint">Får platsnummer <strong>${S.bc}</strong> — används i hyllkoderna, t.ex. <code>${S.bc}:V3</code>.</p>
      <div class="ns-nav"><button class="ghost" onclick="nsBack()">← Tillbaka</button>
        <button onclick="nsSaveName()">Nästa →</button></div>`;
  }
  else if(S.step===2&&S.mode==="update"){
    const places=Object.keys(bcNames).sort((a,b)=>Number(a)-Number(b));
    html+=`<p class="ns-q">Vilken hylla gäller det?</p>
      <select id="nsBcSel" class="ns-inp">${places.map(b=>`<option value="${b}">${bcNames[b]}</option>`).join("")}</select>
      <input id="nsCodeInp" class="ns-inp" placeholder="Hyllkod, t.ex. 1:V3 (valfritt)">
      <p class="ns-hint">Plan räknas nedifrån. Lämnar du koden tom listar jag ut den från fotot.</p>
      <div class="ns-nav"><button class="ghost" onclick="nsBack()">← Tillbaka</button>
        <button onclick="nsPickExisting()">Nästa →</button></div>`;
  }
  else if(S.step===3){
    html+=`<p class="ns-q">Hur är ${S.name} uppbyggd?</p>
      <div class="ns-choices">
        <button onclick="nsType('VH')">📚 Sektioner + hyllplan<small>Som Bokhylla 1–2: vänster och höger sektion, flera plan. Koder som <code>${S.bc}:V3</code></small></button>
        <button onclick="nsType('S')">🗄 Enkla hyllor<small>Som Bokskåpet: bara hyllplan utan sektioner. Koder som <code>${S.bc}:S1</code></small></button>
      </div>
      <div class="ns-nav"><button class="ghost" onclick="nsBack()">← Tillbaka</button></div>`;
  }
  else if(S.step===4){
    html+=`<p class="ns-q">Fota ${S.mode==="new"?"varje hyllplan":"hyllan"}</p>
      <p class="ns-hint">${S.mode==="new"
        ? (S.type==="VH"
           ? "Ett foto per sektion och plan. Plan 1 är nederst."
           : "Ett foto per hylla. Hylla 1 är nederst.")
        : "Ta ett foto rakt framifrån så att ryggarna syns."}</p>
      <div class="ns-shots" id="nsShots"></div>
      <button class="ghost ns-add" onclick="nsAddShot()">➕ Lägg till foto</button>
      <div class="ns-nav"><button class="ghost" onclick="nsBack()">← Tillbaka</button>
        <button onclick="nsFinish()">✓ Skicka <span id="nsCount"></span></button></div>`;
  }
  el.innerHTML=html;
  if(S.step===4)nsRenderShots();
}
function nsRenderShots(){
  const wrap=document.getElementById("nsShots");if(!wrap)return;
  const S=nsState;
  wrap.innerHTML=S.shots.map((s,i)=>`
    <div class="ns-shot${s.dataUrl?" has":""}">
      <label class="ns-thumb">
        ${s.dataUrl?`<img src="${s.dataUrl}" alt="">`:`<span>📷</span>`}
        <input type="file" accept="image/*" style="display:none" onchange="nsShotFile(${i},this)">
      </label>
      <input class="ns-lbl" placeholder="${S.type==="VH"?"T.ex. Vänster plan 3":"T.ex. Hylla 2"}"
             value="${(s.label||"").replace(/"/g,'&quot;')}" onchange="nsShotLabel(${i},this.value)">
      <button class="ns-x" onclick="nsDelShot(${i})">✕</button>
    </div>`).join("");
  const n=S.shots.filter(s=>s.dataUrl).length;
  const c=document.getElementById("nsCount");
  if(c)c.textContent=n?`(${n} foto${n>1?"n":""})`:"";
}
function nsStartWizard(){nsState={step:1,mode:null,shots:[],bc:nextFreeBc()};nsRender();
  document.getElementById("nsWizard").scrollIntoView({behavior:"smooth",block:"nearest"})}
function nsCancel(){nsState=null;nsRender()}
function nsBack(){if(!nsState)return;
  if(nsState.step===4&&nsState.mode==="update")nsState.step=2;
  else nsState.step=Math.max(1,nsState.step-1);
  nsRender()}
function nsPick(mode){nsState.mode=mode;nsState.step=2;nsRender()}
function nsSaveName(){
  const v=(document.getElementById("nsNameInp").value||"").trim();
  if(!v){alert("Skriv ett namn på platsen.");return}
  nsState.name=v;nsState.step=3;nsRender();
}
function nsPickExisting(){
  const bc=document.getElementById("nsBcSel").value;
  const code=(document.getElementById("nsCodeInp").value||"").trim();
  nsState.bc=bc;nsState.name=bcNames[bc];nsState.code=code;
  nsState.type=code&&/^\d+:[VH]/.test(code)?"VH":"S";
  nsState.step=4;nsState.shots=[{label:code||"",dataUrl:null,file:null}];nsRender();
}
function nsType(t){nsState.type=t;nsState.step=4;
  nsState.shots=[{label:"",dataUrl:null,file:null}];nsRender()}
function nsAddShot(){nsState.shots.push({label:"",dataUrl:null,file:null});nsRenderShots()}
function nsDelShot(i){nsState.shots.splice(i,1);if(!nsState.shots.length)nsAddShot();else nsRenderShots()}
function nsShotLabel(i,v){nsState.shots[i].label=v}
async function nsShotFile(i,input){
  const f=input.files[0];if(!f)return;
  nsState.shots[i].file=f;
  try{nsState.shots[i].dataUrl=await shrinkToDataURL(f,1100,0.62)}
  catch(e){
    try{nsState.shots[i].dataUrl=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
    catch(e2){alert("Kunde inte läsa bilden. Prova en annan.");return}
  }
  nsRenderShots();
}
async function nsFinish(){
  if(!sbUser){alert("Logga in för att skicka hyllan.");return}
  const S=nsState;
  const shots=S.shots.filter(s=>s.dataUrl);
  if(!shots.length){alert("Lägg till minst ett foto först.");return}
  const btn=document.querySelector("#nsWizard .ns-nav button:last-child");
  if(btn){btn.disabled=true;btn.style.opacity=".6";btn.textContent="Skickar…"}
  try{
    if(S.mode==="new"&&!bcNames[S.bc]){
      bcNames[S.bc]=S.name;
      await sb.from("bc_names").upsert({bc:S.bc,name:S.name});
    }
    for(let i=0;i<shots.length;i++){
      const s=shots[i];
      let url=null;
      try{
        const path=`shelf-${S.bc}-${Date.now()}-${i}.jpg`;
        const {error}=await sb.storage.from("gap-photos").upload(path,s.file,{upsert:true});
        if(!error){const {data:pub}=sb.storage.from("gap-photos").getPublicUrl(path);url=pub.publicUrl}
      }catch(e){console.warn("storage",e)}
      await sb.from("new_shelves").insert({
        name:S.name, bc:S.bc, shelf_code:S.code||null, label:s.label||null,
        photo_url:url, photo_data:s.dataUrl, state:"waiting", created_by:sbUser.id});
    }
    nsState=null;nsRender();
    buildShelfOptions();renderBcEditor();
    await loadNewShelves();
    alert(`Skickat! ${shots.length} foto${shots.length>1?"n":""} ligger i kö.\n\nJag läser av bokryggarna och lägger in böckerna – sedan kontrollerar du och trycker ✓ Klar.`);
  }catch(e){
    alert("Något gick fel: "+(e.message||e));
  }finally{
    const b2=document.querySelector("#nsWizard .ns-nav button:last-child");
    if(b2){b2.disabled=false;b2.style.opacity=""}
  }
}
async function loadNewShelves(){
  const {data:rows}=await sb.from("new_shelves").select("*").order("created_at",{ascending:false});
  const el=document.getElementById("nsList");if(!el)return;
  if(!rows||!rows.length){el.innerHTML="";return}
  el.innerHTML=`<h4 class="ns-listh">Inskickade hyllfoton</h4>`+rows.map(r=>{
    const done=r.state==="done";
    /* Miniatyr och en rad status. Hela avlasningstexten gjorde listan
       olasbar - den finns kvar bakom Visa och Ratta. */
    const thumb=r.photo_data||r.photo_url;
    const code=shelfCodeForRow(r);
    const antal=code?data.filter(d=>d.shelf===code).length:0;
    const status=antal?`${antal} böcker i katalogen`
      :(r.claude_note?"Avläst – inga böcker inlagda än":"Väntar på avläsning");
    return `<div class="ns-item">
      <div class="ns-head-row">
        ${thumb?`<img class="ns-thumb-img" src="${thumb}" alt="" onclick="nsView(${r.id})">`:""}
        <div class="ns-titles"><span>${done?"✅":"⏳"} ${r.name}${r.label?" · "+r.label:""}</span>
          <div class="ns-note">${status}${code?` · <span class="mono">${code}</span>`:""}</div>
        </div>
        ${r.claude_note?`<div class="note-edit" id="ne-shelf-${r.id}" style="display:none">
          <textarea class="note-ta" id="nt-shelf-${r.id}">${(r.claude_note||"").replace(/</g,"&lt;")}</textarea>
          <div class="ns-item-acts" style="margin-top:.4rem">
            <button onclick="saveNote('shelf',${r.id},this)">💾 Spara ändringar</button>
            <button class="ghost" onclick="toggleNote('shelf',${r.id})">Avbryt</button>
          </div></div>`:""}</div>
      <div class="analys-box" id="ab-shelf-${r.id}" style="display:none"></div>
      <div class="ns-item-acts">
        ${r.photo_data||r.photo_url?`<button class="ghost" onclick="nsView(${r.id})">Visa</button>`:""}
        ${r.photo_data?`<button class="ghost" onclick="runAnalys('shelf',${r.id},this)">🤖 Analysera</button>`:""}
        ${r.claude_note?`<button class="ghost" onclick="toggleNote('shelf',${r.id})">✏️ Rätta</button>`:""}
        ${done?"":`<button onclick="nsDone(${r.id})">✓ Klar</button>`}
      </div></div>`}).join("");
  window.__nsRows=rows;
}
/* Vilken hyllkod hor det har fotot till? Forst den gissade koden ur
   etiketten, annars en los plats vars namn matchar etiketten. */
function shelfCodeForRow(r){
  const guess=guessShelfCode(r.bc,r.shelf_code||r.label);
  if(guess)return guess;
  const lbl=(r.label||"").trim().toLowerCase();
  const hit=Object.keys(spotNames).find(c=>
    c.startsWith(r.bc+":L")&&(spotNames[c]||"").trim().toLowerCase()===lbl);
  return hit||null;
}

/* Visa: fotot och bockerna som star dar, bredvid varandra. Att bara oppna
   bilden racker inte - man vill jamfora den mot listan. */
let nsViewOpen={};
function nsView(id){
  const r=(window.__nsRows||[]).find(x=>x.id===id);if(!r)return;
  const src=r.photo_data||r.photo_url;if(!src)return;
  const wrap=document.getElementById("ab-shelf-"+id);if(!wrap)return;
  if(nsViewOpen[id]){nsViewOpen[id]=false;wrap.style.display="none";wrap.innerHTML="";return}
  /* En pagaende granskning far inte skrivas over. */
  if(analysBooks[analysKey("shelf",id)]){renderAnalys("shelf",id);return}
  nsViewOpen[id]=true;
  const code=shelfCodeForRow(r);
  const list=code?data.filter(d=>d.shelf===code):[];
  nsRot[id]=nsRot[id]||0;
  wrap.innerHTML=`<div class="ab-photo">
      <img src="${src}" alt="${r.name}" style="transform:rotate(${nsRot[id]}deg)"
           onclick="lbGap('${src}')" title="Klicka för att zooma">
      <button class="ghost ab-rot" onclick="nsViewRotate(${id})">↻ Vrid</button>
    </div>
    <div class="ab-list">
      <p class="gap-help">${code?`${locLabel(code)} — <b>${list.length} böcker</b> i katalogen.`
        :"Den här platsen har ingen hyllkod ännu. Läs av fotot så får den en."}</p>
      ${list.length?`<ul class="ns-booklist">${list.map(d=>
        `<li><a class="var-link" onclick="showInfo(${d.id})">${d.title.replace(/'/g,"’")}</a>
         <span class="bk-cat">${d.cat}</span></li>`).join("")}</ul>`
        :(code?`<p class="gap-help">Inga böcker inlagda här ännu. Tryck Analysera.</p>`:"")}
      <div class="gap-actions"><button class="ghost" onclick="nsView(${id})">Stäng</button></div>
    </div>`;
  wrap.style.display="";
}
let nsRot={};
function nsViewRotate(id){nsRot[id]=((nsRot[id]||0)+90)%360;nsViewOpen[id]=false;nsView(id)}
async function nsDone(id){
  if(!sbUser){alert("Logga in först.");return}
  await sb.from("new_shelves").update({state:"done"}).eq("id",id);
  await loadNewShelves();
}
const nsBtn=document.getElementById("nsStart");
if(nsBtn)nsBtn.addEventListener("click",nsStartWizard);
window.nsPick=nsPick;window.nsBack=nsBack;window.nsCancel=nsCancel;window.nsSaveName=nsSaveName;
window.nsPickExisting=nsPickExisting;window.nsType=nsType;window.nsAddShot=nsAddShot;
window.nsDelShot=nsDelShot;window.nsShotLabel=nsShotLabel;window.nsShotFile=nsShotFile;
window.nsFinish=nsFinish;window.nsView=nsView;window.nsViewRotate=nsViewRotate;window.nsDone=nsDone;

/* ---------- Dela ---------- */
const shareSheet=document.createElement("div");shareSheet.className="share-sheet";
shareSheet.innerHTML=`<div class="share-box"><h3>Dela hyllan</h3>
  <textarea id="shareTxt"></textarea>
  <div class="share-acts">
    <button id="shareNative">Dela…</button>
    <button class="ghost" id="shareCopy">Kopiera text</button>
    <button class="ghost" id="shareClose">Stäng</button>
  </div></div>`;
document.body.appendChild(shareSheet);
shareSheet.addEventListener("click",e=>{if(e.target===shareSheet)shareSheet.classList.remove("open")});
document.getElementById("shareClose")&&0;
shareSheet.querySelector("#shareClose").onclick=()=>shareSheet.classList.remove("open");
shareSheet.querySelector("#shareCopy").onclick=()=>{
  navigator.clipboard.writeText(shareSheet.querySelector("#shareTxt").value)
    .then(()=>toast("Texten är kopierad"),()=>alert("Kunde inte kopiera"))};
shareSheet.querySelector("#shareNative").onclick=async()=>{
  const text=shareSheet.querySelector("#shareTxt").value;
  if(navigator.share){try{await navigator.share({title:profile.name,text})}catch(e){}}
  else shareSheet.querySelector("#shareCopy").click();
};
document.getElementById("shareBtn").addEventListener("click",()=>{
  const n=data.length, cats=[...new Set(data.map(d=>d.cat))].length;
  shareSheet.querySelector("#shareTxt").value=
`Titta i min bokhylla! ${n} böcker i ${cats} kategorier — allt från buddhism och terapi till kokböcker och fantasy.

Vill du låna någon? Eller bara prata om en? Hör av dig.

${location.href}`;
  shareSheet.classList.add("open");
});
document.getElementById("copyLink").addEventListener("click",()=>{
  const url=location.origin+location.pathname;
  (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject())
    .then(()=>toast("Länken är kopierad"),()=>prompt("Kopiera länken:",url));
});
window.__lt=()=>{const lw=document.getElementById("listWrap");if(lw&&lw.style.display==="none")document.getElementById("listToggle").textContent=`Visa hela boklistan (${fmtN(data.length)})`};window.__lt();

for(const [name,fn] of [["manualBooks",loadManualBooks],["statuses",loadStatuses],["gaps",loadGaps],["catEdits",loadCatEdits],["covers",loadCoverOverrides],["newShelves",loadNewShelves]]){
  try{await fn()}catch(e){console.warn(name+" misslyckades:",e)}
}
})();
