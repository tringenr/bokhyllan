// Pekar ut var granserna mellan hyllplanen gar i ett foto av en hel bokhylla.
//
// Anropas med POST { image: "data:image/jpeg;base64,..." } och den inloggade
// anvandarens JWT i Authorization-headern. Svarar
// { cuts: number[], rotated: boolean, note: string } dar cuts ar y-koordinater
// i procent av bildhojden, uppifran och ner.
//
// Till skillnad fran `analysera` laser den har funktionen INTE nagon rad ur
// databasen: fotot ar annu inte uppladdat nar granserna ska foreslas, det
// ligger bara i webblasaren. Den skriver heller ingenting - svaret ar ett
// forslag som anvandaren drar i innan appen klipper bilden.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = Deno.env.get("ANALYZE_MODEL") ?? "claude-opus-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const PROMPT = `Du tittar pa ett foto av en bokhylla. Din enda uppgift ar att saga
var granserna mellan hyllplanen gar - inte att lasa av bockerna.

Ett hyllplan ar en vagrat avdelning med bocker. Granserna ar sjalva hyllbraderna:
glipan mellan det nedersta av bockerna pa ett plan och det oversta av bockerna pa
planet under.

Svara med cuts: en lista y-koordinater i PROCENT av bildhojden, uppifran och ner,
en per grans. Toppen av bilden ar 0, botten ar 100. Ta INTE med 0 och 100 - bara
granserna mellan planen. Tva hyllplan ger alltsa en siffra i listan, fyra plan ger
tre siffror.

Lagg gransen mitt i glipan, aldrig tvars igenom bokryggarna. Ar du osaker pa om
en linje ar en hyllbrada eller nagot annat (en skugga, en kant pa en bok, ett
bord framfor hyllan) - ta inte med den. En grans for lite ar battre an en for
mycket; anvandaren kan lagga till sjalv.

Ser du bara ett enda hyllplan, svara med en tom lista.

rotated: sant om fotot ar vridet sa att hyllplanen INTE ligger vagratt i bilden -
till exempel en liggande bild som sparats staende, dar bokryggarna lutar 90 grader
och hyllplanen loper lodratt. Mobilkameror gor det ofta. Ar bilden vriden kan
granser i procent av bildhojden inte anvandas, sa satt rotated till sant och
lamna cuts tom.

note: en kort kommentar om bilden - hur manga plan du ser, och om nagot var skymt,
avskuret eller svart att bedoma.`;

const TOOL = {
  name: "hyllplan",
  description: "Rapportera var granserna mellan hyllplanen gar.",
  input_schema: {
    type: "object",
    properties: {
      cuts: {
        type: "array",
        description: "Granser i procent av bildhojden, uppifran och ner.",
        items: { type: "number" },
      },
      rotated: { type: "boolean", description: "Sant om bilden ar vriden 90 grader." },
      note: { type: "string", description: "Kort kommentar om bilden." },
    },
    required: ["cuts", "rotated", "note"],
  },
};

/* Minsta hojd per hyllplan, i procent - samma varde som appens NS_DELA_MIN.
   Granser narmare varandra an sa slas ihop, och granser for nara kanten
   plockas bort: ett 2%-band ar aldrig ett hyllplan. */
const MIN = 5;
const MAX_CUTS = 11; // ger hogst 12 hyllplan, samma tak som appen

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  // --- Rattighetskontroll -------------------------------------------------
  // Funktionen ror ingen data, men den kostar pengar att anropa. Samma krav
  // som `analysera`: bara inloggade far trigga den.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Logga in for att dela upp fotot." }, 401);
  }
  const asCaller = createClient(SB_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await asCaller.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "Ogiltig eller utgangen session." }, 401);
  }

  // --- Indata -------------------------------------------------------------
  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig JSON i anropet." }, 400);
  }
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/s.exec(body.image ?? "");
  if (!m) return json({ error: "Skicka fotot som en data-URL i image." }, 400);
  const [, mediaType, b64] = m;
  // Grov storleksgrans: appen skickar en nedskalad kopia (1100px, ~0,3 MB).
  if (b64.length > 8_000_000) return json({ error: "Fotot ar for stort." }, 413);

  // --- Granserna ----------------------------------------------------------
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic svarade", res.status, detail);
    return json({ error: `Kunde inte lasa av hyllplanen (${res.status}).` }, 502);
  }

  const out = await res.json();
  const call = (out.content ?? []).find(
    (c: { type: string; name?: string }) => c.type === "tool_use" && c.name === TOOL.name,
  );
  const rotated = call?.input?.rotated === true;
  const note = typeof call?.input?.note === "string" ? call.input.note.trim() : "";

  // Stadar svaret innan appen far det: bara tal innanfor bilden, sorterade,
  // utan granser som ligger for nara varandra eller for nara kanten. Appen
  // clampar ocksa vid dragning, men ett daligt forslag ska aldrig visas.
  let cuts: number[] = Array.isArray(call?.input?.cuts) ? call.input.cuts : [];
  cuts = cuts
    .filter((n: unknown): n is number => typeof n === "number" && isFinite(n))
    .map((n: number) => Math.round(n * 10) / 10)
    .filter((n: number) => n >= MIN && n <= 100 - MIN)
    .sort((a: number, b: number) => a - b)
    .filter((n: number, i: number, arr: number[]) => i === 0 || n - arr[i - 1] >= MIN)
    .slice(0, MAX_CUTS);

  if (rotated) cuts = [];

  return json({ cuts, rotated, note });
});
