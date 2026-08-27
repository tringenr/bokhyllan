// Analyserar ett uppladdat hyll- eller luckfoto med Claude och skriver
// resultatet till claude_note / claude_done_at.
//
// Anropas med POST { kind: "gap" | "shelf", id: string }
// och den inloggade anvandarens JWT i Authorization-headern.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

const PROMPT = `Du tittar pa ett foto av en bokhylla eller en lucka i en bokhylla.

Fotot kan vara roterat 90 grader - mobilkameror sparar ofta liggande bilder sa.
Lat texten pa bokryggarna avgora vad som ar upp: om ryggtexten lutar 90 grader
ar hela bilden vriden, och bocker som ser ut att ligga i en stapel star i sjalva
verket upp sida vid sida.

Las av bokryggarna och lista bockerna i deras verkliga fysiska ordning, efter att
du raknat bort rotationen: staende bocker fran vanster till hoger, en akta
liggande stapel fran oversta boken till den nedersta.

For varje bok:
- title: titeln sa som den star pa ryggen. Utelamna undertitel om ryggen ar trang.
- author: forfattaren om den gar att lasa, annars tom strang.
- cat: valj EN kategori ur listan du far. Valj den narmaste - hitta inte pa nya.
- description: tva till tre meningar om vad boken handlar om och varfor den ar
  kand. Skriv ur din bokkunskap. Ar du osaker pa vilken bok det ar, lamna tomt.
- uncertain: true om du inte kunde lasa ryggen sakert, om titeln ar gissad, eller
  om du inte ar saker pa att det ar en bok.

Rakna varje bok en gang - tunna ryggar och skuggor mellan bocker ar inte egna bocker.
Ta med foremal som inte ar bocker (kortlekar, anteckningsbocker, spelboxar,
prydnader) men markera dem med uncertain: true och skriv i description vad det ar.
Gissa aldrig en titel du inte kan lasa - satt title till det du ser och uncertain: true.

Skriv i note en kort kommentar om bilden: hur den var orienterad, och om nagot var
skymt eller avskuret.`;

const TOOL = {
  name: "bocker",
  description: "Rapportera bockerna pa fotot.",
  input_schema: {
    type: "object",
    properties: {
      note: { type: "string", description: "Kort kommentar om bilden." },
      books: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title:       { type: "string" },
            author:      { type: "string" },
            cat:         { type: "string" },
            description: { type: "string" },
            uncertain:   { type: "boolean" },
          },
          required: ["title", "author", "cat", "description", "uncertain"],
        },
      },
    },
    required: ["note", "books"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  // --- Rattighetskontroll -------------------------------------------------
  // RLS pa tabellerna slapper bara in rollen `authenticated`. Funktionen
  // skriver med service role och gar darmed forbi RLS, sa den maste sjalv
  // verifiera att anroparen ar inloggad — annars kan vem som helst pa
  // internet trigga analyser och skrivningar.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Logga in for att analysera." }, 401);
  }

  const asCaller = createClient(SB_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return json({ error: "Ogiltig eller utgangen session." }, 401);
  }

  // --- Indata -------------------------------------------------------------
  let body: { kind?: string; id?: string; cats?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig JSON i anropet." }, 400);
  }
  const kind = body.kind;
  const id = body.id;
  const cats: string[] = Array.isArray(body.cats) ? body.cats.slice(0, 200) : [];
  if ((kind !== "gap" && kind !== "shelf") || !id) {
    return json({ error: 'Ange kind ("gap" eller "shelf") och id.' }, 400);
  }

  const table = kind === "gap" ? "gap_status" : "new_shelves";
  const keyCol = kind === "gap" ? "gap_id" : "id";
  const keyVal = kind === "gap" ? id : Number(id);
  if (kind === "shelf" && !Number.isFinite(keyVal as number)) {
    return json({ error: "id for en hylla maste vara ett tal." }, 400);
  }

  const admin = createClient(SB_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: row, error: rowErr } = await admin
    .from(table)
    .select("photo_data, claude_done_at")
    .eq(keyCol, keyVal)
    .maybeSingle();

  if (rowErr) return json({ error: rowErr.message }, 500);
  if (!row) return json({ error: "Hittar ingen rad med det id:t." }, 404);
  if (!row.photo_data) return json({ error: "Raden saknar foto." }, 422);

  const m = /^data:(image\/[a-z+]+);base64,(.+)$/s.exec(row.photo_data);
  if (!m) return json({ error: "Fotot har ett format jag inte kan lasa." }, 422);
  const [, mediaType, b64] = m;

  // --- Analys -------------------------------------------------------------
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
          {
            type: "text",
            text: PROMPT + (cats.length
              ? `\n\nKategorier att valja bland: ${cats.join(", ")}.`
              : ""),
          },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Anthropic svarade", res.status, detail);
    return json({ error: `Analysen misslyckades (${res.status}).` }, 502);
  }

  const out = await res.json();
  const call = (out.content ?? []).find(
    (c: { type: string; name?: string }) => c.type === "tool_use" && c.name === TOOL.name,
  );
  const books = (call?.input?.books ?? []).filter(
    (b: { title?: string }) => b && typeof b.title === "string" && b.title.trim(),
  );
  if (!books.length) return json({ error: "Analysen hittade inga bocker." }, 502);

  // Sammanfattningen som visas i kortet: en rad per bok, osakra markerade.
  const note = [
    call?.input?.note?.trim(),
    books
      .map((b: { title: string; author?: string; uncertain?: boolean }) =>
        (b.uncertain ? "? " : "") + b.title + (b.author ? " – " + b.author : ""))
      .join(" | "),
  ].filter(Boolean).join("\n");

  const { error: upErr } = await admin
    .from(table)
    // Analysen klarmarkerar INTE raden. Resultatet ar ett forslag som
    // anvandaren ska granska, rata och sjalv klarmarkera i granssnittet.
    .update({
      claude_note: note,
      claude_done_at: new Date().toISOString(),
    })
    .eq(keyCol, keyVal);

  if (upErr) return json({ error: upErr.message }, 500);

  console.log(`analysera: ${kind}/${id} av ${user.id}, ${books.length} bocker`);
  return json({ ok: true, kind, id, note, books });
});
