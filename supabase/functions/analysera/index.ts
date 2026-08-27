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

Avgor forst hur bockerna ar placerade: staende sida vid sida, eller liggande i en
plan stapel. Sag vilket det ar forst i ditt svar.

Las sedan av bokryggarna och lista bockerna i den fysiska ordning de ligger:
- staende bocker listas fran vanster till hoger
- liggande stapel listas fran oversta boken till den nedersta

Ange forfattare - titel nar bada gar att lasa, annars bara det som syns.
Gissa aldrig en titel du inte kan lasa: skriv "olaslig rygg" i stallet.
Rakna varje bok en gang - tunna ryggar och skuggor mellan bocker ar inte egna bocker.
Namn ocksa foremal som inte ar bocker (kortlekar, anteckningsbocker, prydnader).
Om delar av bilden ar skymd eller avskuren, sag det till sist.

Beskriv aldrig placeringen pa ett satt du inte ser i bilden.
Svara med en enda loptext, poster separerade med | . Ingen inledning, inga punktlistor.`;

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
  let body: { kind?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ogiltig JSON i anropet." }, 400);
  }
  const kind = body.kind;
  const id = body.id;
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
      max_tokens: 2000,
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
    return json({ error: `Analysen misslyckades (${res.status}).` }, 502);
  }

  const out = await res.json();
  const note = (out.content ?? [])
    .filter((c: { type: string }) => c.type === "text")
    .map((c: { text: string }) => c.text)
    .join("\n")
    .trim();

  if (!note) return json({ error: "Analysen gav inget svar." }, 502);

  const { error: upErr } = await admin
    .from(table)
    .update({
      claude_note: note,
      claude_done_at: new Date().toISOString(),
      state: "done",
    })
    .eq(keyCol, keyVal);

  if (upErr) return json({ error: upErr.message }, 500);

  console.log(`analysera: ${kind}/${id} av ${user.id}, ${note.length} tecken`);
  return json({ ok: true, kind, id, note });
});
