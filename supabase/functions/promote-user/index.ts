// Spotibai promote-user Edge Function (Deno).
// Deployed with verify_jwt=true so Supabase validates the caller JWT before
// this code runs; the service_role key below lives ONLY in the function
// environment (Deno.env) and is NEVER shipped to the browser.

import { z } from "npm:zod@3.24.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const bodySchema = z.object({
  targetUserId: z.string().uuid("targetUserId must be a uuid"),
  role: z.enum(["ADMIN", "USER"]),
});

const RATE_LIMIT_MAX = 10;
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

  // Caller-scoped client: every read below runs as the caller (RLS applies).
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  const callerId = callerData?.user?.id;
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

  if (parsed.targetUserId === callerId && parsed.role !== "ADMIN") {
    return json(400, { ok: false, error: "You cannot demote yourself." });
  }

  // Admin check: caller must hold role='ADMIN' on their own profiles row —
  // the same predicate as private.is_admin() (id = auth.uid() AND role).
  const { data: callerRow, error: callerRowError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  const callerRole = (callerRow as { role?: string } | null)?.role;
  if (callerRowError || callerRole !== "ADMIN") {
    return json(403, { ok: false, error: "Admin required." });
  }

  // Privileged client: service_role bypasses RLS for the guarded writes.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role: parsed.role })
    .eq("id", parsed.targetUserId);
  if (updateError) {
    return json(500, { ok: false, error: "Role update failed." });
  }

  const { error: auditError } = await adminClient.from("audit_log").insert({
    actor_id: callerId,
    action: parsed.role === "ADMIN" ? "role.promote" : "role.demote",
    target_id: parsed.targetUserId,
  });
  if (auditError) {
    return json(500, { ok: false, error: "Audit write failed." });
  }

  return json(200, {
    ok: true,
    targetUserId: parsed.targetUserId,
    role: parsed.role,
  });
});
