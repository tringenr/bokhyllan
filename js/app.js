(async()=>{
window.__appStarted=true;
const DV="?v=20260829162510";
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

const [booksRaw,photos,BOOK_INFO]=await Promise.all(
  ["data/books.json"+DV,"data/photos.json"+DV,"data/bookinfo.json"+DV].map(u=>fetch(u).then(r=>r.json())));
const BOOKS=booksRaw.map(b=>[b.title,b.author,b.cat,b.shelf]);
const SHELF_IMGS=[];
photos.forEach(p=>{
  let g=SHELF_IMGS.find(x=>x.bc===p.bc&&x.label===p.label);
  if(!g){g={bc:p.bc,label:p.label,imgs:[]};SHELF_IMGS.push(g)}
  g.imgs.push({cap:p.cap,shelves:p.shelves,src:p.src,thumb:p.thumb});
});
const DEFAULT_BC={1:"Bokhylla 1 – vardagsrummet",2:"Bokhylla 2",3:"Bokskåpet",4:"Köket",5:"Sovrummet – vid sängen",6:"Sovrummet – gröna skåpet",7:"Sovrummet – fönsterbrädan",8:"Soffan"};
let bcNames={...DEFAULT_BC};
async function loadBcNames(){const {data:rows}=await sb.from("bc_names").select("*");if(rows)rows.forEach(r=>bcNames[r.bc]=r.name)}
/* Losa platser: bocker som ligger utanfor ett hyllplan. Kod <bc>:L<n>. */
let spotNames={};
async function loadSpotNames(){
  const {data:rows}=await sb.from("spot_names").select("*");
  if(rows)rows.forEach(r=>spotNames[r.code]=r.name);
}
const SEC={V:"vänster",H:"höger",S:"hylla",K:"hylla"};
function locLabel(shelf){const [bc,rest]=shelf.split(":");const sec=rest[0],plan=rest.slice(1);
  if(bc==="4"&&rest==="K3")return `${bcNames[bc]} · löst i köket`;
  if(sec==="L")return `${bcNames[bc]} · ${spotNames[shelf]||"löst"}`;
  return (sec==="S"||sec==="K")?`${bcNames[bc]} · hylla ${plan}`:`${bcNames[bc]} · ${SEC[sec]} · plan ${plan}`}
let data=BOOKS.map((b,i)=>({id:i,title:b[0],author:b[1],cat:b[2],shelf:b[3],status:"hylla",lentTo:""}));
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
  const shelves=[...new Set(data.map(d=>d.shelf))].sort();
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
const btn=document.querySelector(`button[data-sbtn="${id}"]`);if(btn)btn.textContent="Utlånad"+(d.lentTo?" → "+d.lentTo:"")}
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
  $("#grid").innerHTML=list.map(d=>{
    const [label,cls]=STATUS[d.status];
    const lent=d.status==="utlanad"&&d.lentTo?` → ${d.lentTo}`:"";
    const lentInp=d.status==="utlanad"?`<input class="lent-input" data-lent="${d.id}" placeholder="Utlånad till…" value="${(d.lentTo||"").replace(/"/g,'&quot;')}" onchange="setLent(${d.id},this.value)">`:"";
    return `<div class="book"><h3 onclick="showInfo(${d.id})" title="Visa beskrivning">${d.title}</h3><div class="auth">${d.author||"&nbsp;"}</div>
    <div class="row"><span class="loc">${locLabel(d.shelf)}</span>
    <button class="status ${cls}" data-sbtn="${d.id}" onclick="cycle(${d.id})">${label}${lent}</button></div>
    ${lentInp}<div class="cat">${d.cat} · <a class="var-link" onclick="lbShelf('${d.shelf}',${d.id})">📍 sågs senast${d.ts?" "+d.ts:""}</a></div></div>`}).join("");
  renderBcEditor();
}
$("#q").addEventListener("input",e=>{q=e.target.value;render();if(q)setList(true)});
$("#fShelf").addEventListener("change",e=>{fShelf=e.target.value;render()});
$("#fCat").addEventListener("change",e=>{fCat=e.target.value;render()});
document.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");fs=c.dataset.s;render()}));
render();
function renderBcEditor(){
  const el=$("#bcEditorIns")||$("#bcEditor");if(!el)return;
  el.innerHTML=Object.keys(bcNames).map(bc=>`<button class="bc-name" data-bc="${bc}" title="Klicka för att byta namn">✏️ ${bcNames[bc]}</button>`).join("")
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
function renderPhotoTabs(){renderPhotoGrid()}
const FLAT=[];SHELF_IMGS.forEach(g=>g.imgs.forEach(im=>FLAT.push({src:im.src,cap:(g.bc?bcNames[g.bc]+" · ":"")+im.cap})));
function flatIndex(gi,ii){let n=0;for(let k=0;k<gi;k++)n+=SHELF_IMGS[k].imgs.length;return n+ii}
function renderPhotoGrid(){
  const el=$("#photoGrid");el.style.display="";$("#shelfView").style.display="none";
  const byBc={};
  SHELF_IMGS.forEach((g,gi)=>{(byBc[g.bc]=byBc[g.bc]||[]).push([g,gi])});
  el.innerHTML=Object.keys(byBc).map(bc=>`<div class="bc-group"><h3>${bcNames[bc]}</h3><div class="thumb-row">`+
    byBc[bc].map(([g,gi])=>g.imgs.map((im,j)=>
      `<button class="thumb" onclick="openShelfView(${gi},${j})"><img src="${im.thumb}" alt="${im.cap}" loading="lazy" decoding="async"><span>${im.cap}</span></button>`).join("")).join("")+
    `</div></div>`).join("");
}
function openShelfView(gi,j){
  const g=SHELF_IMGS[gi],im=g.imgs[j];
  $("#photoGrid").style.display="none";$("#shelfView").style.display="";
  let booksHtml="";
  (im.shelves||[]).forEach(sh=>{
    const list=data.filter(d=>d.shelf===sh);
    if(!list.length)return;
    booksHtml+=`<h4>${locLabel(sh)} — ${list.length} böcker</h4><ul>`+
      list.map(d=>`<li><a class="var-link" onclick="showInfo(${d.id})">${d.title.replace(/'/g,"’")}</a><span class="bk-cat">${d.cat}</span></li>`).join("")+`</ul>`;
  });
  $("#shelfViewBody").innerHTML=
    `<img class="main" src="${im.src}" alt="${im.cap}" onclick="lbOpen(${flatIndex(gi,j)})">
     <div class="shelf-books"><div style="color:var(--muted);font-size:.8rem;margin-top:.3rem">${im.cap} · klicka på bilden för zoom</div>${booksHtml||"<p>Inga böcker registrerade för denna bild ännu.</p>"}</div>`;
  $("#shelfView").scrollIntoView({behavior:"smooth"});
}
document.addEventListener("click",e=>{if(e.target.id==="backToGrid")renderPhotoGrid()});
if(SHELF_IMGS.length)renderPhotoGrid();
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
  return `<label class="ib-ph up">📷<span>Lägg till omslag</span>
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
  if(sbUser){el.innerHTML=`<span class="who">Inloggad: ${sbUser.email}</span> <button id="btnOut">Logga ut</button>`;
    el.querySelector("#btnOut").onclick=async()=>{await sb.auth.signOut();sbUser=null;renderAuth();render()};}
  else if(!sbOnline){el.innerHTML='<span class="who">Inloggning otillgänglig – kunde inte nå servern. Ladda om sidan.</span>'}
  else{el.innerHTML=`<input id="aEmail" type="email" placeholder="e-post"><input id="aPass" type="password" placeholder="lösenord"><button id="btnIn">Logga in</button><span class="err" id="aErr"></span>`;
    el.querySelector("#btnIn").onclick=async()=>{
      const {data:res,error}=await sb.auth.signInWithPassword({email:el.querySelector("#aEmail").value,password:el.querySelector("#aPass").value});
      if(error){el.querySelector("#aErr").textContent=error.message||"Inloggning misslyckades";console.warn("login",error);return}
      sbUser=res.user;renderAuth();loadStatuses();};}
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
  lbCap.textContent="📍 "+locLabel(shelf);
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
window.gapWrite=gapWrite;window.gapSet=gapSet;window.gapUpload=gapUpload;window.gapSave=gapSave;window.runAnalys=runAnalys;window.toggleNote=toggleNote;window.saveNote=saveNote;
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

/* ---------- Flikar (bottennav) ---------- */
document.querySelectorAll(".tabbar .tab").forEach(t=>t.addEventListener("click",()=>{
  document.querySelectorAll(".tabbar .tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");
  const id=t.dataset.tab;
  ["sok","salj","install"].forEach(k=>document.getElementById("tab-"+k).style.display=(k===id?"":"none"));
  scrollTo({top:0});
}));
/* ---------- Konto-panel ---------- */
document.getElementById("authToggle").addEventListener("click",()=>document.getElementById("authPanel").classList.toggle("open"));
/* ---------- Hero + boklista ---------- */
const heroBtn=document.getElementById("heroShelves");
if(SHELF_IMGS.length&&SHELF_IMGS[0].imgs[0])
  heroBtn.insertAdjacentHTML("afterbegin",`<img src="${SHELF_IMGS[0].imgs[0].thumb}" alt="">`);
heroBtn.addEventListener("click",()=>{renderPhotoGrid();document.getElementById("photos").scrollIntoView({behavior:"smooth"})});
const listWrap=document.getElementById("listWrap"),listToggle=document.getElementById("listToggle");
function setList(open){listWrap.style.display=open?"":"none";
  listToggle.textContent=(open?"📖 Dölj boklistan ":"📖 Visa hela boklistan ")+(document.getElementById("count").textContent||"");}
listToggle.addEventListener("click",()=>setList(listWrap.style.display==="none"));
/* ---------- Snabbknappar ---------- */
const QUICK=["Psykologi","Terapi","Religion","Buddhism","Skönlitteratur","Mat","Ledarskap","Organisation","Filosofi"];
const qr=document.getElementById("quickRow");
qr.innerHTML=`<button class="quick" data-q="utlanad">📤 Utlånade</button>`+QUICK.map(c=>`<button class="quick" data-cat="${c}">${c}</button>`).join("");
qr.querySelectorAll(".quick").forEach(b=>b.addEventListener("click",()=>{
  const on=b.classList.contains("on");
  qr.querySelectorAll(".quick").forEach(x=>x.classList.remove("on"));
  fCat="";fs="";
  if(!on){b.classList.add("on");if(b.dataset.cat){fCat=b.dataset.cat;$("#fCat").value=fCat}else{fs="utlanad"}}
  else{$("#fCat").value=""}
  render();setList(!on);
}));
/* ---------- Sälj ---------- */
fetch("data/sell.json"+DV).then(r=>r.json()).then(s=>{
  document.getElementById("sellNote").textContent=s.note+" Uppdaterad "+s.updated+".";
  const sum=s.summary;
  const summaryHtml=sum?`<div class="sell-summary">
    <div class="sell-sum-top"><span class="sell-sum-kr">~${sum.summa.toLocaleString("sv-SE")} kr</span>
    <span class="sell-sum-lbl">försiktig uppskattning · ${sum.antal_i_summan} titlar</span></div>
    <div class="sell-sum-row">
      <span><b>${sum.poster}</b> kandidater</span>
      <span><b>${sum.heta}</b> heta</span>
      <span><b>${sum.kvar_att_kolla}</b> kvar att kolla</span>
    </div>
    <p class="sell-sum-note">${sum.kommentar}</p></div>`:"";
  document.getElementById("sellList").innerHTML=summaryHtml+s.items.map(it=>{
    const d=data.find(x=>x.title===it.match)||data.find(x=>x.title.startsWith(it.match));
    const loc=d?locLabel(d.shelf):"";
    return `<div class="sell-item"><h4>${it.title}<span class="heat heat-${it.heat}">${({het:"HET",medel:"MEDEL",lag:"LÅGT VÄRDE"})[it.heat]||"KOLLA"}</span></h4>
    <p><span class="sell-price">${it.price}</span>${loc?" · står i: "+loc:""}</p>
    <p>${it.why}</p>
    <p><a href="${it.url}" target="_blank" rel="noopener">Öppna på Studentapan →</a></p></div>`}).join("");
}).catch(()=>{document.getElementById("sellList").innerHTML="<p>Kunde inte ladda säljlistan.</p>"});

/* ---------- Luckor ---------- */
let GAPS=[],gapState={},gapFilter="open";
async function loadGaps(){
  GAPS=await fetch("data/gaps.json"+DV).then(r=>r.json());
  if(sbUser||true){const {data:rows}=await sb.from("gap_status").select("*");
    if(rows)rows.forEach(r=>gapState[r.gap_id]={state:r.state,photo:r.photo_path,note:r.note,claude:r.claude_note});}
  updateGapCount();renderGaps();
}
function gapStateOf(id){
  if(gapState[id]&&gapState[id].state)return gapState[id].state;
  const g=GAPS.find(x=>x.id===id);
  return (g&&g.auto)||"open";
}
function updateGapCount(){
  const open=GAPS.filter(g=>gapStateOf(g.id)!=="done").length;
  const el=document.getElementById("gapCount");if(el)el.textContent="("+open+")";
  const rem=document.getElementById("gapReminder");
  if(rem){if(open){rem.style.display="";rem.textContent=`🔍 ${open} luckor kvar att fylla i katalogen →`}else rem.style.display="none"}
}
function renderGaps(){
  const list=GAPS.filter(g=>{const s=gapStateOf(g.id);
    return gapFilter==="open" ? (s==="open"||s==="waiting") : s===gapFilter;});
  document.getElementById("gapIntro").textContent=
    `${GAPS.length} partier i hyllfotona gick inte att läsa av. Varje lucka rymmer ofta 3–10 böcker.`;
  document.getElementById("gapList").innerHTML=list.length?list.map(g=>{
    const st=gapStateOf(g.id),ph=gapState[g.id]&&gapState[g.id].photo;
    return `<div class="gap-card">
      <div class="gap-row">
        <img src="${ph||g.crop}" alt="Lucka" onclick="lbGap('${ph||g.full}')">
        <div class="gap-body">
          <div class="gap-loc">📍 ${g.shelf?locLabel(g.shelf):g.cap}${st!=="open"?`<span class="gap-state ${st}${(st==="waiting"&&gapState[g.id]&&gapState[g.id].claude)?" review":""}">${st==="waiting"?((gapState[g.id]&&gapState[g.id].claude)?"AVLÄST – KONTROLLERA":"FOTO SKICKAT – VÄNTAR PÅ CLAUDE"):"KLAR"}</span>`:""}${g.note?`<br><em style="font-size:.76rem">${g.note}</em>`:""}
            ${(gapState[g.id]&&gapState[g.id].claude)?`<br><span class="gap-claude">🤖 ${gapState[g.id].claude}</span>`:""}
            ${(gapState[g.id]&&gapState[g.id].claude)?`<div class="note-edit" id="ne-gap-${g.id}" style="display:none">
              <textarea class="note-ta" id="nt-gap-${g.id}">${(gapState[g.id].claude||"").replace(/</g,"&lt;")}</textarea>
              <div class="gap-actions" style="margin-top:.4rem">
                <button onclick="saveNote('gap','${g.id}',this)">💾 Spara ändringar</button>
                <button class="ghost" onclick="toggleNote('gap','${g.id}')">Avbryt</button>
              </div></div>`:""}
            ${(gapAdded[g.id]&&gapAdded[g.id].length)?`<br><span class="gap-added">✓ Inskrivna: ${gapAdded[g.id].map(x=>x.title).join(", ")}</span>`:""}</div>
          <div class="gap-saved" id="saved-${g.id}"></div>
          <div class="gap-actions">
            <button onclick="gapWrite('${g.id}')">✏️ Skriv in böcker</button>
            <label class="ghost">📷 Fota<input type="file" accept="image/*" style="display:none" onchange="gapUpload('${g.id}',this)"></label>
            ${ph?`<button class="ghost" onclick="runAnalys('gap','${g.id}',this)">🤖 Analysera</button>`:""}
            ${(gapState[g.id]&&gapState[g.id].claude)?`<button class="ghost" onclick="toggleNote('gap','${g.id}')">✏️ Rätta avläsningen</button>`:""}
            ${st!=="done"?`<button class="ghost" onclick="gapSet('${g.id}','done')">✓ Klar</button>`:`<button class="ghost" onclick="gapSet('${g.id}','open')">↩︎ Öppna</button>`}
          </div>
          <div class="analys-box" id="ab-gap-${g.id}" style="display:none"></div>
          <div class="gap-form" id="form-${g.id}" style="display:none">
            <p class="gap-help">Lägg till en rad per bok. Kategorin ärvs från raden ovanför – ändra där den skiljer sig.</p>
            <div class="gap-rows" id="rows-${g.id}"></div>
            <div class="gap-actions" style="margin-top:.5rem">
              <button class="ghost" onclick="gapAddRow('${g.id}')">➕ Rad till</button>
              <button onclick="gapSave('${g.id}')">💾 Spara <span id="cnt-${g.id}"></span></button>
            </div>
          </div>
        </div>
      </div></div>`}).join(""):"<p style='color:var(--muted)'>Inga luckor i den här vyn.</p>";
}
function catOptions(sel){
  const cats=[...new Set(data.map(d=>d.cat))].sort((a,b)=>a.localeCompare(b,"sv"));
  return `<option value="">Kategori…</option>`+cats.map(c=>`<option${c===sel?" selected":""}>${c}</option>`).join("")+`<option value="__new">➕ Ny kategori…</option>`;
}
function gapAddRow(id,inherit,saved){
  const wrap=document.getElementById("rows-"+id);if(!wrap)return;
  const prev=wrap.querySelector(".gap-brow:last-child select");
  const cat=inherit||(saved&&saved.cat)||(prev?prev.value:"");
  const div=document.createElement("div");div.className="gap-brow"+(saved?" saved":"");
  if(saved)div.dataset.rowid=saved.id;
  div.innerHTML=`<input class="gb-title" placeholder="Titel" value="${saved?(saved.title||"").replace(/"/g,'&quot;'):""}">
    <input class="gb-auth" placeholder="Författare (valfritt)" value="${saved?(saved.author||"").replace(/"/g,'&quot;'):""}">
    <select class="gb-cat">${catOptions(cat)}</select>
    <input class="gb-newcat" placeholder="Ny kategoris namn" style="display:none">
    <button class="gb-del" title="${saved?"Ta bort boken":"Ta bort rad"}">✕</button>`;
  wrap.appendChild(div);
  const sel=div.querySelector(".gb-cat"),nc=div.querySelector(".gb-newcat");
  sel.addEventListener("change",()=>{nc.style.display=sel.value==="__new"?"":"none";if(sel.value==="__new")nc.focus();
    if(saved)saveRowEdit(id,div)});
  div.querySelector(".gb-del").addEventListener("click",async()=>{
    if(saved){
      if(!confirm("Ta bort \""+saved.title+"\" ur katalogen?"))return;
      await sb.from("manual_books").delete().eq("id",saved.id);
      gapAdded[id]=(gapAdded[id]||[]).filter(x=>x.id!==saved.id);
      const k=data.findIndex(d=>d.title===saved.title&&d.shelf===GAPS.find(g=>g.id===id).shelf);
      if(k>=0)data.splice(k,1);
      render();
    }
    div.remove();gapCount(id);
  });
  const nextRow=()=>{const rows=[...wrap.querySelectorAll(".gap-brow")];const i=rows.indexOf(div);
    const nxt=rows[i+1]||gapAddRow(id);nxt.querySelector(".gb-title").focus()};
  div.querySelectorAll(".gb-title,.gb-auth,.gb-newcat").forEach(inp=>{
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();nextRow()}});
    inp.addEventListener("input",()=>gapCount(id));
    if(saved)inp.addEventListener("blur",()=>saveRowEdit(id,div));
  });
  gapCount(id);
  return div;
}
async function saveRowEdit(id,div){
  const rid=div.dataset.rowid;if(!rid||!sbUser)return;
  let cat=div.querySelector(".gb-cat").value;
  if(cat==="__new")cat=(div.querySelector(".gb-newcat").value||"").trim();
  const rec={title:div.querySelector(".gb-title").value.trim(),
             author:div.querySelector(".gb-auth").value.trim(),
             cat:cat||"Okategoriserad"};
  if(!rec.title)return;
  await sb.from("manual_books").update(rec).eq("id",rid);
  const e=(gapAdded[id]||[]).find(x=>String(x.id)===String(rid));
  if(e){const old=e.title;Object.assign(e,rec);
    const d=data.find(d=>d.title===old);if(d)Object.assign(d,{title:rec.title,author:rec.author,cat:rec.cat});}
  rebuildCatFilter();render();
}
function gapCount(id){
  const n=[...document.querySelectorAll(`#rows-${id} .gb-title`)].filter(i=>i.value.trim()).length;
  const el=document.getElementById("cnt-"+id);if(el)el.textContent=n?`(${n} ${n===1?"bok":"böcker"})`:"";
}
function gapWrite(id){
  const f=document.getElementById("form-"+id);
  const open=f.style.display==="none";f.style.display=open?"":"none";
  if(open&&!document.querySelector(`#rows-${id} .gap-brow`))fillRows(id);
}
function fillRows(id){
  const wrap=document.getElementById("rows-"+id);if(!wrap)return;
  wrap.innerHTML="";
  (gapAdded[id]||[]).forEach(s=>gapAddRow(id,null,s));
  gapAddRow(id);gapAddRow(id);
}
window.gapAddRow=gapAddRow;
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
/* Huvudtiteln utan undertitel: "Kommunikation i praktiken - relationer, ..."
   och "Kommunikation i praktiken" ar samma bok. Avlasningen tar ibland med
   undertiteln, ibland inte, beroende pa hur trang ryggen ar. */
function baseTitle(s){
  const t=normTitle(s);
  const cut=t.split(/\s[–—-]\s|:\s/)[0].trim();
  return cut.length>=4?cut:t;
}
function knownBook(title,author,shelf){
  const t=normTitle(title);
  if(!t)return null;
  const bt=baseTitle(title);
  const hit=data.find(d=>(normTitle(d.title)===t||baseTitle(d.title)===bt)&&
    (!author||!d.author||normTitle(d.author)===normTitle(author)));
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
    const {data:ins,error}=await sb.from("manual_books").insert(payload).select();
    if(error)throw error;
    (ins||[]).forEach(r=>{
      data.push({id:1e6+r.id,title:r.title,author:r.author||"",cat:r.cat||"Okategoriserad",
                 shelf:r.shelf,status:"hylla",lentTo:"",ts:null});
      if(r.description)BOOK_INFO[r.title]=r.description;
    });
    delete analysBooks[key];
    analysClose(kind,id);
    buildShelfOptions();rebuildCatFilter();render();
    if(kind==="gap")renderGaps();else await loadNewShelves();
    alert(`${ins.length} böcker inlagda på ${locLabel(shelf)}.\n\nKontrollera dem i boklistan och klarmarkera hyllan när du är nöjd.`);
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
async function gapSave(id){
  if(!sbUser){alert("Logga in för att spara.");return}
  if(saving[id])return; saving[id]=true;
  const btn=document.querySelector(`#form-${id} .gap-actions button:last-child`);
  if(btn){btn.disabled=true;btn.style.opacity=".6"}
  try{
    const g=GAPS.find(x=>x.id===id);
    const existing=new Set((gapAdded[id]||[]).map(x=>x.title.toLowerCase()));
    const rows=[...document.querySelectorAll(`#rows-${id} .gap-brow:not(.saved)`)].map(r=>{
      let cat=r.querySelector(".gb-cat").value;
      if(cat==="__new")cat=(r.querySelector(".gb-newcat").value||"").trim();
      return {title:r.querySelector(".gb-title").value.trim(),
              author:r.querySelector(".gb-auth").value.trim(),
              cat:cat||"Okategoriserad"}}).filter(r=>r.title);
    const seen=new Set(),fresh=[],dupes=[];
    rows.forEach(r=>{const k=r.title.toLowerCase();
      if(existing.has(k)||seen.has(k)){dupes.push(r.title);return}
      seen.add(k);fresh.push(r)});
    if(!fresh.length){
      alert(dupes.length?("Redan inskriven: "+dupes.join(", ")):"Skriv in minst en ny titel först.");
      return;
    }
    const {data:ins,error}=await sb.from("manual_books")
      .insert(fresh.map(r=>({...r,shelf:g.shelf,gap_id:id,created_by:sbUser.id}))).select();
    if(error){alert("Kunde inte spara: "+error.message);return}
    (ins||fresh).forEach((r,i)=>{
      const rec={id:r.id||Date.now()+i,title:fresh[i].title,author:fresh[i].author,cat:fresh[i].cat};
      data.push({id:1e6+data.length,title:rec.title,author:rec.author,cat:rec.cat,shelf:g.shelf,status:"hylla",lentTo:"",ts:null});
      (gapAdded[id]=gapAdded[id]||[]).push(rec);
    });
    buildShelfOptions();rebuildCatFilter();render();renderGaps();
    const f=document.getElementById("form-"+id);
    if(f){f.style.display="";fillRows(id)}
    const t=document.getElementById("saved-"+id);
    if(t){t.textContent=`✓ ${fresh.length} tillagd${fresh.length>1?"a":""}`+(dupes.length?` (hoppade över dubbletter: ${dupes.join(", ")})`:"")+` – tryck "✓ Klar" när luckan är avbetad.`;
          setTimeout(()=>{if(t)t.textContent=""},7000)}
  } finally {
    saving[id]=false;
    const b2=document.querySelector(`#form-${id} .gap-actions button:last-child`);
    if(b2){b2.disabled=false;b2.style.opacity=""}
  }
}
let gapAdded={};
async function loadManualBooks(){
  const {data:rows}=await sb.from("manual_books").select("*");
  if(rows)rows.forEach(r=>{
    data.push({id:1e6+r.id,title:r.title,author:r.author||"",cat:r.cat||"Okategoriserad",shelf:r.shelf,status:"hylla",lentTo:"",ts:null});
    if(r.description&&!BOOK_INFO[r.title])BOOK_INFO[r.title]=r.description;
    if(r.gap_id){(gapAdded[r.gap_id]=gapAdded[r.gap_id]||[]).push({id:r.id,title:r.title,author:r.author||"",cat:r.cat||""})}
  });
}
function openGapView(o){
  document.getElementById("gapView").classList.toggle("open",o);
  ["sok","salj","install"].forEach(k=>{if(o)document.getElementById("tab-"+k).style.display="none"});
  if(!o)document.querySelector('.tabbar .tab[data-tab="install"]').click();
  scrollTo({top:0})}
document.getElementById("openGaps").addEventListener("click",()=>openGapView(true));
document.getElementById("gapReminder").addEventListener("click",()=>openGapView(true));
document.getElementById("gapBack").addEventListener("click",()=>openGapView(false));
document.querySelectorAll(".gap-filter .quick").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".gap-filter .quick").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  gapFilter=b.dataset.g;renderGaps()}));
document.querySelectorAll(".tabbar .tab").forEach(t=>t.addEventListener("click",()=>document.getElementById("gapView").classList.remove("open")));
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
shareSheet.innerHTML=`<div class="share-box"><h3>🔗 Dela bokhyllan</h3>
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
    .then(()=>alert("Kopierat!"),()=>alert("Kunde inte kopiera"))};
shareSheet.querySelector("#shareNative").onclick=async()=>{
  const text=shareSheet.querySelector("#shareTxt").value;
  if(navigator.share){try{await navigator.share({title:"Min bokhylla",text,url:location.href})}catch(e){}}
  else shareSheet.querySelector("#shareCopy").click();
};
document.getElementById("shareBtn").addEventListener("click",()=>{
  const n=data.length, cats=[...new Set(data.map(d=>d.cat))].length;
  shareSheet.querySelector("#shareTxt").value=
`📚 Titta i min bokhylla! ${n} böcker i ${cats} kategorier — allt från buddhism och terapi till kokböcker och fantasy.

Vill du låna någon? Eller bara prata om en? Hör av dig.

${location.href}`;
  shareSheet.classList.add("open");
});
window.__lt=()=>{const lw=document.getElementById("listWrap");if(lw&&lw.style.display==="none")document.getElementById("listToggle").textContent="📖 Visa hela boklistan ("+data.length+")"};window.__lt();

for(const [name,fn] of [["manualBooks",loadManualBooks],["gaps",loadGaps],["catEdits",loadCatEdits],["covers",loadCoverOverrides],["newShelves",loadNewShelves]]){
  try{await fn()}catch(e){console.warn(name+" misslyckades:",e)}
}
})();
