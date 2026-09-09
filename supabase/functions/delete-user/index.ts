// Spotibai delete-user Edge Function (Deno).
// Self-delete ONLY: the caller deletes their own auth user, nothing else.
// verify_jwt applies by default so Supabase validates the caller JWT before
// this code runs; the service_role key below lives ONLY in the function
// environment (Deno.env) and is NEVER shipped to the browser.
//
// Effect: admin delete of the caller removes the auth user; the profiles
// row follows via ON DELETE CASCADE on profiles.id, which in turn cascades
// playlists, liked rows, and uploads owned by that profile.

import { z } from "npm:zod@3.24.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const bodySchema = z.object({
  confirmEmail: z.string().email("confirmEmail must be an email"),
});

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

// In-memory per-caller throttle. Single-instance best effort; upgrade path:
// replace with Upstash Redis (INCR + EXPIRE per caller, shared across
// instances) when multi-instance or stricter abuse posture is needed.
const recentCalls = new Map<string, number[]>();

function throttled(callerId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const hits = (recentCalls.get(callerId) ?? []).filter((t) => t > windowStart);
  if (hits.length >= RATE_LIMIT_MAX) {
    recentCalls.set(callerId, hits);
    return true;
  }
  hits.push(now);
  recentCalls.set(callerId, hits);
  return false;
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { ok: false, error: "Function misconfigured." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "Missing bearer token." });
  }

  // Caller-scoped client: identity reads run as the caller (RLS applies).
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  const callerId = callerData?.user?.id;
  const callerEmail = callerData?.user?.email ?? "";
  if (callerError || !callerId) {
    return json(401, { ok: false, error: "Invalid session." });
  }

  if (throttled(callerId)) {
    return json(429, { ok: false, error: "Too many requests." });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body.";
    return json(400, { ok: false, error: message });
  }

  // Typed confirmation must match the caller's own email — this is what
  // scopes the function to self-delete; no target user id is accepted.
  if (
    !callerEmail ||
    parsed.confirmEmail.trim().toLowerCase() !== callerEmail.trim().toLowerCase()
  ) {
    return json(400, { ok: false, error: "Confirmation does not match." });
  }

  // Privileged client: service_role bypasses RLS for the guarded writes.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Audit first: the actor row is removed by the cascade below, so the
  // audit entry must exist before the auth user is deleted.
  const { error: auditError } = await adminClient.from("audit_log").insert({
    actor_id: callerId,
    action: "account.delete",
    target_id: callerId,
  });
  if (auditError) {
    return json(500, { ok: false, error: "Audit write failed." });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(callerId);
  if (deleteError) {
    return json(500, { ok: false, error: "Account deletion failed." });
  }

  return json(200, { ok: true });
});
