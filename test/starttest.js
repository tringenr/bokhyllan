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
// Kedjebar query som alltid svarar tomt, så app.js får köra sina await utan nät.
function stubQuery() {
  const q = {
    select: () => q, order: () => q, eq: () => q, in: () => q,
    insert: () => q, upsert: () => q, update: () => q, delete: () => q,
    limit: () => q, single: () => q, maybeSingle: () => q,
    then: (res) => Promise.resolve({ data: [], error: null }).then(res),
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
      signOut: async () => ({ error: null }),
    },
    storage: { from: () => ({ upload: async () => ({ data: null, error: null }),
                              getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
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

  // 3. Kunde data/*.json läsas och parsas?
  for (const f of fs.readdirSync(path.join(ROOT, "data"))) {
    if (!f.endsWith(".json")) continue;
    try { JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8")); }
    catch (e) { fel.push(`data/${f} är trasig JSON: ${e.message}`); }
  }

  // ---- Utfall ---------------------------------------------------------
  if (fel.length) {
    console.error("\nSTARTTEST MISSLYCKADES\n");
    fel.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
    console.error(`\n${fel.length} problem. Pusha inte.\n`);
    process.exit(1);
  }
  console.log(`\nSTARTTEST OK — appen startar, ${anropade.size} onclick-funktioner finns, all JSON parsar.\n`);
  process.exit(0);
}, 1500);
