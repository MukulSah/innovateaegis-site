import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return null;

  const ref = "xjgkwnaivjmpaorgfafe";
  const host = process.env.SUPABASE_DB_HOST ?? "aws-1-ap-southeast-2.pooler.supabase.com";
  const port = process.env.SUPABASE_DB_PORT ?? "5432";
  const user = process.env.SUPABASE_DB_USER ?? `postgres.${ref}`;
  const database = process.env.SUPABASE_DB_NAME ?? "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

async function main() {
  loadEnvLocal();

  const databaseUrl = buildDatabaseUrl();
  if (!databaseUrl) {
    console.error(
      "Missing DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local.\n" +
        "Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI).",
    );
    process.exit(1);
  }

  const migrationPath = resolve(root, "supabase/migrations/030_founder_command_center.sql");
  const sql = readFileSync(migrationPath, "utf8");

  const postgres = (await import("postgres")).default;
  const sqlClient = postgres(databaseUrl, { ssl: "require", max: 1 });

  try {
    console.log("Applying migration 030_founder_command_center.sql...");
    await sqlClient.unsafe(sql);
    console.log("Migration applied successfully.");

    const cols = await sqlClient`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'workflow_runs'
          and column_name in ('session_type', 'delivery_outcome', 'completion_validation')
      `;
    console.log("Verified columns:", cols.map((c) => c.column_name).join(", ") || "(none)");

    const tables = await sqlClient`
        select table_name
        from information_schema.tables
        where table_schema = 'public' and table_name = 'approval_history'
      `;
    console.log("approval_history table exists:", tables.length === 1);
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Migration failed:", error.message ?? error);
  process.exit(1);
});
