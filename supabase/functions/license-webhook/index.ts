import { createClient } from "npm:@supabase/supabase-js@2";

const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const WIVEN_SECRET = Deno.env.get("WIVEN_WEBHOOK_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "Patrimo <onboarding@resend.dev>";

const SIGNATURE_HEADERS = ["x-wiven-signature", "x-signature", "x-webhook-signature"];

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  throw new Error("Faltam SERVICE_ROLE_KEY ou SUPABASE_URL");
}

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, header) => headers.set(header, value));
    }
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: { fetch: createSupabaseFetch(SERVICE_ROLE_KEY) },
  auth: { persistSession: false, autoRefreshToken: false },
});

async function hmacHex(text: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripPrefix(value: string): string {
  const v = value.trim();
  return v.startsWith("sha256=") ? v.slice("sha256=".length) : v;
}

function findString(obj: unknown, paths: string[]): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  for (const path of paths) {
    let cur: unknown = obj;
    let ok = true;
    for (const key of path.split(".")) {
      if (typeof cur === "object" && cur !== null && key in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && typeof cur === "string" && cur.trim()) return cur.trim();
  }
  return null;
}

function extractEmail(body: Record<string, unknown>): string | null {
  return findString(body, [
    "customer.email",
    "buyer.email",
    "data.customer.email",
    "data.buyer.email",
    "data.email",
    "charge.customer.email",
    "payment.customer.email",
    "customer.payer.email",
    "email",
  ]);
}

function extractPaymentId(body: Record<string, unknown>): string | null {
  return findString(body, [
    "data.id",
    "charge.transactionID",
    "charge.identifier",
    "transactionID",
    "order.id",
    "payment.id",
    "sale.id",
    "id",
  ]);
}

function looksLikePaidEvent(body: Record<string, unknown>): boolean {
  const event = findString(body, ["event", "data.event", "type"]) ?? "";
  const status =
    findString(body, ["status", "data.status", "charge.status", "payment.status"]) ?? "";
  const s = `${event} ${status}`.toLowerCase();
  if (!s.trim()) return true;
  if (/(paid|approved|completed|confirmed|success|aprov|pago|completa|conclu)/.test(s)) return true;
  if (
    /(pending|failed|refund|cancel|reject|expired|estorn|fraud|chargeback|waiting|pendente|agnar)/.test(
      s,
    )
  )
    return false;
  return true;
}

async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        console.error("Erro ao listar usuários:", error.message);
        return null;
      }
      const users = data?.users ?? [];
      if (users.length === 0) return null;
      const hit = users.find((u) => u.email?.toLowerCase() === email);
      if (hit) return { id: hit.id, email: hit.email ?? email };
    }
  } catch (err) {
    console.error("Falha ao buscar usuário por e-mail:", err instanceof Error ? err.message : err);
  }
  return null;
}

async function sendEmail(to: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY não configurada — e-mail de confirmação não enviado.", { to });
    return;
  }
  const html = `
    <div style="font-family:Inter,ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;color:#17212b">
      <h2 style="margin:0 0 8px">Seu acesso ao Patrimo foi liberado</h2>
      <p style="margin:0 0 16px;color:#66717d">Pagamento confirmado. Sua licença já está vinculada ao e-mail <strong>${to}</strong>.</p>
      <ol style="margin:0 0 16px;padding-left:20px;color:#66717d;line-height:1.6">
        <li>Entre em <a href="https://patrimofinance.vercel.app/auth">patrimofinance.vercel.app/auth</a></li>
        <li>Crie ou acesse sua conta com este mesmo e-mail</li>
        <li>O acesso é liberado automaticamente — sem código</li>
      </ol>
      <p style="margin:0;color:#66717d;font-size:13px">Você tem 7 dias de garantia. Dúvidas: suportepatrimo@gmail.com</p>
    </div>
  `;
  const text = `Seu acesso ao Patrimo foi liberado!\n\nSua licença já está vinculada ao e-mail ${to}.\n\nComo acessar:\n1. Entre em https://patrimofinance.vercel.app/auth\n2. Crie ou acesse sua conta com este mesmo e-mail\n3. O acesso é liberado automaticamente — sem código\n\nVocê tem 7 dias de garantia. Dúvidas: suportepatrimo@gmail.com`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "Seu acesso ao Patrimo foi liberado",
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Falha ao enviar e-mail (${res.status}): ${detail}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();

  if (WIVEN_SECRET) {
    const provided = SIGNATURE_HEADERS.map((h) => req.headers.get(h)).find(Boolean) ?? null;
    if (!provided) return new Response("Missing signature", { status: 401 });
    const expected = await hmacHex(raw, WIVEN_SECRET);
    const safe = (a: string, b: string) => {
      const ab = new Uint8Array(a.length);
      const bb = new Uint8Array(b.length);
      for (let i = 0; i < a.length; i++) ab[i] = a.charCodeAt(i);
      for (let i = 0; i < b.length; i++) bb[i] = b.charCodeAt(i);
      if (ab.length !== bb.length) return false;
      let diff = 0;
      for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
      return diff === 0;
    };
    if (!safe(expected, stripPrefix(provided))) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const body: Record<string, unknown> = JSON.parse(raw || "{}");

  if (!looksLikePaidEvent(body)) {
    return new Response(JSON.stringify({ received: true, processed: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = extractEmail(body)?.toLowerCase() ?? null;
  const paymentId = extractPaymentId(body);

  if (!email) {
    return new Response(
      JSON.stringify({ error: "Campo de e-mail do comprador não encontrado no payload." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (paymentId) {
    const { data: existing } = await supabase
      .from("licenses")
      .select("id")
      .eq("payment_id", paymentId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ received: true, processed: false, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const user = await findUserByEmail(email);

  const { error: insertError } = await supabase.from("licenses").insert({
    email,
    payment_id: paymentId ?? null,
    used_by: user?.id ?? null,
    redeemed_at: user?.id ? new Date().toISOString() : null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({ received: true, processed: false, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await sendEmail(email);
  } catch (err) {
    console.error(
      "Falha ao enviar e-mail de confirmação:",
      err instanceof Error ? err.message : err,
    );
  }

  return new Response(
    JSON.stringify({ received: true, processed: true, email, linked: Boolean(user?.id) }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
