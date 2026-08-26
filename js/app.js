(async()=>{
const [booksRaw,photos,BOOK_INFO]=await Promise.all(
  ["data/books.json","data/photos.json","data/bookinfo.json"].map(u=>fetch(u).then(r=>r.json())));
const BOOKS=booksRaw.map(b=>[b.title,b.author,b.cat,b.shelf]);
const SHELF_IMGS=[];
photos.forEach(p=>{
  let g=SHELF_IMGS.find(x=>x.bc===p.bc&&x.label===p.label);
  if(!g){g={bc:p.bc,label:p.label,imgs:[]};SHELF_IMGS.push(g)}
  g.imgs.push({cap:p.cap,shelves:p.shelves,src:p.src,thumb:p.thumb});
});
const DEFAULT_BC={1:"Bokhylla 1 – vardagsrummet",2:"Bokhylla 2",3:"Bokskåpet",4:"Köket",5:"Sovrummet – vid sängen",6:"Sovrummet – gröna skåpet",7:"Sovrummet – fönsterbrädan",8:"Soffan"};
let bcNames={...DEFAULT_BC};
try{Object.assign(bcNames,JSON.parse(localStorage.getItem("bokhyllan-bcnames")||"{}"))}catch(e){}
const SEC={V:"vänster",H:"höger",S:"hylla",K:"hylla"};
function locLabel(shelf){const [bc,rest]=shelf.split(":");const sec=rest[0],plan=rest.slice(1);
  if(bc==="4"&&rest==="K3")return `${bcNames[bc]} · löst i köket`;
  return (sec==="S"||sec==="K")?`${bcNames[bc]} · hylla ${plan}`:`${bcNames[bc]} · ${SEC[sec]} · plan ${plan}`}
let data=BOOKS.map((b,i)=>({id:i,title:b[0],author:b[1],cat:b[2],shelf:b[3],status:"hylla",lentTo:""}));
try{const saved=JSON.parse(localStorage.getItem("bokhyllan-status")||"{}");data.forEach(d=>{if(saved[d.id]){d.status=saved[d.id].s;d.lentTo=saved[d.id].l||"";d.ts=saved[d.id].t||null}})}catch(e){}
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
function save(){try{const o={};data.forEach(d=>{if(d.status!=="hylla"||d.lentTo||d.ts)o[d.id]={s:d.status,l:d.lentTo,t:d.ts}});localStorage.setItem("bokhyllan-status",JSON.stringify(o))}catch(e){}}
function cycle(id){const d=data.find(x=>x.id===id);const order=["hylla","utlanad","flyter"];d.status=order[(order.indexOf(d.status)+1)%3];
d.ts=new Date().toISOString().slice(0,10);
if(d.status!=="utlanad")d.lentTo="";
save();render();
if(d.status==="utlanad"){const inp=document.querySelector(`input[data-lent="${id}"]`);if(inp)inp.focus()}}
function setLent(id,val){const d=data.find(x=>x.id===id);d.lentTo=val.trim();save();
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
$("#q").addEventListener("input",e=>{q=e.target.value;render()});
$("#fShelf").addEventListener("change",e=>{fShelf=e.target.value;render()});
$("#fCat").addEventListener("change",e=>{fCat=e.target.value;render()});
document.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>{document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));c.classList.add("active");fs=c.dataset.s;render()}));
render();
function renderBcEditor(){
  const el=$("#bcEditor");if(!el)return;
  el.innerHTML=Object.keys(bcNames).map(bc=>`<button class="bc-name" data-bc="${bc}" title="Klicka för att byta namn">✏️ ${bcNames[bc]}</button>`).join("")
    ;
  el.querySelectorAll("button.bc-name").forEach(b=>b.addEventListener("click",()=>{
    const bc=b.dataset.bc;
    const inp=document.createElement("input");inp.type="text";inp.value=bcNames[bc];inp.className="bc-input";
    b.replaceWith(inp);inp.focus();inp.select();
    const commit=()=>{const n=inp.value.trim();
      if(n){bcNames[bc]=n;try{localStorage.setItem("bokhyllan-bcnames",JSON.stringify(bcNames))}catch(e){}}
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
infoModal.innerHTML='<div class="info-box"><button class="info-close">✕</button><h3 id="ibTitle"></h3><div class="ib-auth" id="ibAuth"></div><div id="ibBody"></div><div class="ib-src" id="ibSrc"></div></div>';
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
  document.getElementById("ibSrc").textContent=info?"Sammanfattning skriven av Claude – kan innehålla fel.":"";
  infoModal.classList.add("open");
}
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
let lbIdx=0,scale=1,tx=0,ty=0,markFrac=null;
function updateMark(){
  if(!markFrac){lbMark.style.display="none";return}
  const r=lbImg.getBoundingClientRect();
  lbMark.style.display="block";
  lbMark.style.left=(r.left+r.width*markFrac.x0)+"px";
  lbMark.style.width=(r.width*(markFrac.x1-markFrac.x0))+"px";
  lbMark.style.top=(r.top+r.height*markFrac.y0)+"px";
  lbMark.style.height=(r.height*(markFrac.y1-markFrac.y0))+"px";
}
function applyT(){lbImg.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;lbImg.style.cursor=scale>1?"grab":"zoom-in";requestAnimationFrame(updateMark)}
function resetT(){scale=1;tx=0;ty=0;applyT()}
function lbShow(i){lbIdx=(i+FLAT.length)%FLAT.length;lbImg.src=FLAT[lbIdx].src;lbCap.textContent=FLAT[lbIdx].cap;markFrac=null;resetT();lbImg.onload=updateMark}
function lbOpen(i){lb.classList.add("open");document.body.style.overflow="hidden";lbShow(i)}
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
  /* ungefärlig markering: katalogordningen är vänster→höger per hylla */
  if(bookId!==undefined){
    const sib=data.filter(d=>d.shelf===shelf);
    const rank=sib.findIndex(d=>d.id===bookId);
    if(rank>=0&&sib.length>1){
      const w=1/sib.length,pad=Math.min(.02,w*.3);
      markFrac={x0:Math.max(0,rank*w-pad),x1:Math.min(1,(rank+1)*w+pad),y0:.08,y1:.95};
      /* köksfotot & skåpfotot visar två hyllplan i samma bild */
      if(bc==="4"||bc==="6"){markFrac.y0=(plan==="2"?.08:.52);markFrac.y1=(plan==="2"?.48:.95)}
      updateMark()
    }
  }
}
function lbClose(){lb.classList.remove("open");document.body.style.overflow=""}
lb.querySelector(".lb-close").addEventListener("click",lbClose);
lb.querySelector(".lb-prev").addEventListener("click",e=>{e.stopPropagation();lbShow(lbIdx-1)});
lb.querySelector(".lb-next").addEventListener("click",e=>{e.stopPropagation();lbShow(lbIdx+1)});
lb.addEventListener("click",e=>{if(e.target===lb||e.target===stage)lbClose()});
document.addEventListener("keydown",e=>{if(!lb.classList.contains("open"))return;
 if(e.key==="Escape")lbClose();if(e.key==="ArrowLeft")lbShow(lbIdx-1);if(e.key==="ArrowRight")lbShow(lbIdx+1)});
/* wheel zoom (desktop) – mjuk */
stage.addEventListener("wheel",e=>{e.preventDefault();
 lbImg.style.transition="transform .15s ease-out";
 const r=lbImg.getBoundingClientRect();
 const f=e.deltaY<0?1.06:1/1.06;const ns=Math.min(6,Math.max(1,scale*f));
 const px=(e.clientX-r.left)/scale,py=(e.clientY-r.top)/scale;
 tx+=px*(scale-ns);ty+=py*(scale-ns);scale=ns;if(scale===1){tx=0;ty=0}applyT()},{passive:false});
/* dubbelklick/dubbeltapp växlar zoom */
lbImg.addEventListener("dblclick",e=>{e.preventDefault();
 lbImg.style.transition="transform .25s ease-out";
 if(scale>1){resetT()}else{const r=lbImg.getBoundingClientRect();
  const px=(e.clientX-r.left)/scale,py=(e.clientY-r.top)/scale;
  const ns=2.5;tx+=px*(scale-ns);ty+=py*(scale-ns);scale=ns;applyT()}});
/* pointer: pan, pinch, svep */
const pts=new Map();let start=null,pinch=null,swipeX=null;
lbImg.addEventListener("pointerdown",e=>{e.preventDefault();lbImg.style.transition="";lbImg.setPointerCapture(e.pointerId);
 pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pts.size===1){start={x:e.clientX,y:e.clientY,tx,ty};swipeX=e.clientX}
 if(pts.size===2){const a=[...pts.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),scale,
  cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2,tx,ty};start=null}});
lbImg.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;
 pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pts.size===2&&pinch){const a=[...pts.values()];
  const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
  const ns=Math.min(6,Math.max(1,pinch.scale*d/pinch.d));
  const r=lbImg.getBoundingClientRect();
  const cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2;
  const px=(pinch.cx-(r.left-tx)-0)/pinch.scale, py=(pinch.cy-(r.top-ty))/pinch.scale;
  tx=pinch.tx+cx-pinch.cx+px*(pinch.scale-ns);ty=pinch.ty+cy-pinch.cy+py*(pinch.scale-ns);
  scale=ns;applyT()}
 else if(pts.size===1&&start&&scale>1){tx=start.tx+e.clientX-start.x;ty=start.ty+e.clientY-start.y;applyT()}});
function up(e){if(pts.has(e.pointerId)){
 if(pts.size===1&&scale===1&&swipeX!==null){const dx=e.clientX-swipeX;
  if(dx<-60)lbShow(lbIdx+1);else if(dx>60)lbShow(lbIdx-1)}
 pts.delete(e.pointerId)}
 if(pts.size<2)pinch=null;if(pts.size===0){start=null;swipeX=null}}
lbImg.addEventListener("pointerup",up);lbImg.addEventListener("pointercancel",up);
/* till toppen-knapp */
const toTop=document.createElement("button");toTop.id="toTop";toTop.setAttribute("aria-label","Till toppen");toTop.textContent="↑";
document.body.appendChild(toTop);
toTop.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
addEventListener("scroll",()=>toTop.classList.toggle("show",scrollY>600),{passive:true});

window.cycle=cycle;window.setLent=setLent;window.lbShelf=lbShelf;window.lbOpen=lbOpen;window.showInfo=showInfo;window.openShelfView=openShelfView;
})();