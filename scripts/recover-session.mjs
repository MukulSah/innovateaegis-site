/**
 * Session recovery CLI — reconciles workflow_runs pointers with handoffs/steps.
 *
 * Usage:
 *   node scripts/recover-session.mjs <sessionId>
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */
import { createClient } from "@supabase/supabase-js";

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: node scripts/recover-session.mjs <sessionId>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function main() {
  const res = await fetch(`http://localhost:3000/api/sai/sessions/${sessionId}/reconcile`, {
    method: "POST",
    headers: { cookie: process.env.SAI_RECOVERY_COOKIE ?? "" },
  });
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
