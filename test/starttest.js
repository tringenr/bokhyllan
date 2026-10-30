// Starttest: kör index.html + js/app.js i en simulerad webbläsare med stubbad
// Supabase. Fångar fel som syntaxkontroll missar — t.ex. anrop till en funktion
// som råkat raderas, eller ett DOM-element som app.js förutsätter men som
// försvunnit ur index.html.
//
// Kör: node test/starttest.js

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const fel = [];

// ---- Stubbad Supabase -------------------------------------------------
// Kedjebar query utan nät. De publika bokraderna får två påhittade böcker, så
// att kod som går igenom katalogen (sökning, kategorier) faktiskt körs i testet.
const TESTRADER = {
  books_public: [
    { id: 1, title: "Psykologins grunder", author: "Test Testsson", cat: "Psykologi" },
    { id: 2, title: "Kokbok för nybörjare", author: "", cat: "Mat" },
  ],
};
function stubQuery(tabell) {
  const q = { __t: tabell,
    select: () => q, order: () => q, eq: () => q, in: () => q,
    insert: () => q, upsert: () => q, update: () => q, delete: () => q,
    limit: () => q, single: () => q, maybeSingle: () => q,
    then: (res) => Promise.resolve({ data: TESTRADER[q.__t] || [], error: null }).then(res),
  };
  return q;
}

const supabaseStub = {
  createClient: () => ({
    from: stubQuery,
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: "test-anon-user" } }, error: null }),
      signOut: async () => ({ error: null }),
    },
    storage: { from: () => ({ upload: async () => ({ data: null, error: null }),
                              getPublicUrl: () => ({ data: { publicUrl: "" } }),
                              createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }) }) },
  }),
};

// ---- Kör upp sidan ----------------------------------------------------
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => fel.push("jsdomError: " + (e.detail || e.message)));
vc.on("error", (m) => fel.push("console.error: " + m));

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const dom = new JSDOM(html, {
  runScripts: "outside-only",
  pretendToBeVisual: true,
  url: "https://tringenr.github.io/bokhyllan/",
  virtualConsole: vc,
});

const { window } = dom;
window.supabase = supabaseStub;
window.alert = () => {};
window.confirm = () => true;
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.fetch = async (u) => {
  // Servera repots egna data/*.json lokalt, allt annat blir tomt svar.
  const m = String(u).match(/data\/([\w.-]+\.json)/);
  if (m) {
    const p = path.join(ROOT, "data", m[1]);
    if (fs.existsSync(p)) {
      const txt = fs.readFileSync(p, "utf8");
      return { ok: true, status: 200, json: async () => JSON.parse(txt), text: async () => txt };
    }
  }
  return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
};

// ---- Ladda app.js i sidans kontext ------------------------------------
const appSrc = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
try {
  window.eval(appSrc);
} catch (e) {
  fel.push("app.js kastade vid laddning: " + e.stack);
}

// Trigga de livscykelhändelser en riktig webbläsare skickar.
try {
  window.document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
  window.dispatchEvent(new window.Event("load"));
} catch (e) {
  fel.push("fel vid DOMContentLoaded/load: " + e.stack);
}

// Skriv i sökfältet och tryck på några knappar, som en användare. Fel som
// bara uppstår efter en interaktion (t.ex. i en fördröjd sparning) fångas
// av jsdomError-lyssnaren ovan. Kontrollerna väntar tills timrarna gått.
setTimeout(() => {
  try {
    const d = window.document, q = d.getElementById("q");
    if (q) { q.value = "psyk"; q.dispatchEvent(new window.Event("input", { bubbles: true })); }
    for (const id of ["fBtn", "blBtn", "gearBtn"]) { const b = d.getElementById(id); if (b) b.click(); }
    const cat = d.querySelector("#catChips [data-c]"); if (cat) cat.click();
  } catch (e) { fel.push("fel vid simulerad användning: " + e.stack); }
}, 1000);
// Stäng listan först när den fördröjda sparningen av sökningen hunnit köras.
setTimeout(() => {
  try { const lw = window.document.getElementById("lwClose"); if (lw) lw.click(); }
  catch (e) { fel.push("fel vid simulerad användning: " + e.stack); }
}, 2800);

// ---- Kontroller -------------------------------------------------------
setTimeout(() => {
  // 1. Renderade appen något innehåll?
  const kropp = window.document.body.textContent.trim();
  if (kropp.length < 50) fel.push("body är i stort sett tom efter uppstart — renderingen kom aldrig igång");

  // 2. Finns de funktioner som anropas via onclick/oninput?
  // Nästan all interaktiv HTML genereras av app.js, så handlers står i
  // JS-strängar (både "..." och `...`). Skanna därför app.js OCH index.html.
  const kallor = html + "\n" + appSrc;
  const attrRe = /\bon(?:click|input|change|submit|keyup|keydown)\s*=\s*(?:\\?["'`])([^"'`\\]+)/g;
  const anropade = new Set();
  let m;
  while ((m = attrRe.exec(kallor))) {
    // Allt inuti ${...} körs när strängen byggs, inte när användaren klickar —
    // de anropen är alltså inte handlers. Nolla dem först.
    const handler = m[1].replace(/\$\{[^}]*\}/g, "0");
    // En handler kan innehålla flera anrop: "a();b()" — plocka alla.
    const namnRe = /([A-Za-z_$][\w$]*)\s*\(/g;
    let n;
    while ((n = namnRe.exec(handler))) {
      const namn = n[1];
      // Hoppa över inbyggda och metodanrop (obj.metod()).
      if (["if", "for", "while", "return", "typeof", "function", "catch", "switch"].includes(namn)) continue;
      if (handler[n.index - 1] === ".") continue;
      anropade.add(namn);
    }
  }
  const saknade = [];
  for (const namn of anropade) {
    if (typeof window[namn] !== "function") saknade.push(namn);
  }
  if (saknade.length) {
    fel.push(`onclick-handlers pekar på funktioner som inte finns i app.js: ${saknade.join(", ")}`);
  }
  if (anropade.size < 10) {
    fel.push(`hittade bara ${anropade.size} onclick-funktioner att kontrollera — testet skannar troligen fel ställe`);
  }

  // 2b. Den sparade hyllsidan (#nsDone) täcker hela appen och måste ha en
  //     väg ut. nsShowHylla ska vara exporterad och bygga en "Till Hem"-knapp.
  if (typeof window.nsShowHylla !== "function") fel.push("nsShowHylla är inte exporterad på window");
  if (!/id="nsDoneHome"/.test(appSrc)) fel.push('hyllsidan saknar "Till Hem"-knappen (#nsDoneHome) — man fastnar i saved-läge');

  // 2c. Inloggningsskärmen och fliklisten ska vara i rätt skick igen när man
  //     lämnar inloggningen utan att logga in (A): go() återställer dem.
  try {
    const d = window.document, vis = (id) => d.getElementById(id).style.display !== "none";
    window.showLoginScreen();
    if (!vis("view-login")) fel.push("showLoginScreen visade inte inloggningsskärmen");
    if (d.querySelector(".tabbar").style.display !== "none") fel.push("showLoginScreen dolde inte fliklisten");
    window.go("hem");
    if (vis("view-login")) fel.push("#view-login göms inte av go() — inloggningen ligger kvar över Hem");
    if (vis("view-forgot")) fel.push("#view-forgot göms inte av go()");
    if (d.querySelector(".tabbar").style.display === "none") fel.push("fliklisten återställs inte av go()");
  } catch (e) { fel.push("fel i kontrollen av inloggningsskärmens återställning: " + e.stack); }

  // 2d. Inloggningslänken på startsidan ska visas för gäster (anonym session)
  //     och bara döljas för ett riktigt konto, och ha en klickhanterare.
  if (!/homeEmptyLogin[\s\S]{0,200}is_anonymous[\s\S]{0,200}onclick=showLoginScreen/.test(appSrc))
    fel.push("afterAuthReady döljer inloggningslänken för gäster eller saknar klickhanterare (is_anonymous)");

  // 2e. Värdera-urvalsarket (prissökning) ska öppnas, räkna och stängas utan
  //     fel, och aldrig skriva över en skyddad rad utan bekräftelse.
  try {
    const d = window.document;
    // "Välj böcker" i listans huvud togs bort 30/10 - sökningen startas
    // från Värderas startsida. Testet går samma väg som användaren.
    window.openVard();
    if (!d.getElementById("vardSheet").classList.contains("open")) fel.push("openVard öppnade inte urvalsarket");
    const count = d.getElementById("vardCount").textContent;
    if (!/sökkrediter/.test(count)) fel.push("vardCount visar inte antal sökkrediter: " + JSON.stringify(count));
    d.getElementById("vardCancelBtn").click();
    if (d.getElementById("vardSheet").classList.contains("open")) fel.push("vardCancelBtn stängde inte urvalsarket");
  } catch (e) { fel.push("fel i Värdera-urvalsarket: " + e.stack); }
  if (!/confirm_overwrite/.test(appSrc) || !/redan fått en värdering/.test(appSrc))
    fel.push("prissökningen saknar bekräftelsedialogen för redan värderade böcker");

  // 3. Kunde data/*.json läsas och parsas?
  for (const f of fs.readdirSync(path.join(ROOT, "data"))) {
    if (!f.endsWith(".json")) continue;
    try { JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8")); }
    catch (e) { fel.push(`data/${f} är trasig JSON: ${e.message}`); }
  }

  // 4. Stämmer versionsnumren? Annars slår automatisk uppdatering aldrig
  //    till (MY == version.json) eller laddar om i onödan.
  try {
    const my = (html.match(/var MY="(\d+)"/) || [])[1];
    const vj = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "version.json"), "utf8")).v;
    const qs = [...new Set([...html.matchAll(/\?v=(\d+)/g)].map((x) => x[1]))];
    const dv = (appSrc.match(/const DV="\?v=(\d+)"/) || [])[1];
    if (!my || my !== vj || qs.length !== 1 || qs[0] !== vj || dv !== vj)
      fel.push(`versionsnumren stämmer inte: MY=${my}, version.json=${vj}, ?v=${qs.join("/")}, DV=${dv} — alla ska vara lika`);
  } catch (e) { fel.push("kunde inte kontrollera versionsnumren: " + e.message); }

  // ---- Utfall ---------------------------------------------------------
  if (fel.length) {
    console.error("\nSTARTTEST MISSLYCKADES\n");
    fel.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
    console.error(`\n${fel.length} problem. Pusha inte.\n`);
    process.exit(1);
  }
  console.log(`\nSTARTTEST OK — appen startar, ${anropade.size} onclick-funktioner finns, all JSON parsar.\n`);
  process.exit(0);
}, 3500);
