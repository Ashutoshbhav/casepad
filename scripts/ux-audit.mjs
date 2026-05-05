// UX research audit — pull last 24h sessions, analyze friction
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase creds");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// First inspect: pull one row to discover real columns
const probe = await sb.from("sessions").select("*").limit(1);
if (probe.error) {
  console.error("Probe error:", probe.error);
  process.exit(1);
}
const cols = probe.data.length ? Object.keys(probe.data[0]) : [];
console.log("COLUMNS=" + cols.join(","));

// Pick best timestamp column
const tsCol = ["created_at", "started_at", "inserted_at", "createdAt"].find((c) =>
  cols.includes(c)
);
console.log("TS_COL=" + tsCol);

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const { data, error } = await sb
  .from("sessions")
  .select("*")
  .gte(tsCol, since)
  .order(tsCol, { ascending: false });

if (error) {
  console.error("Query error:", error);
  process.exit(1);
}

console.log(`TOTAL_SESSIONS_LAST_24H=${data.length}`);
console.log("---RAW---");
console.log(
  JSON.stringify(
    data.map((s) => ({
      ...s,
      turns: Array.isArray(s.transcript) ? s.transcript.length : 0,
    })),
    null,
    2
  )
);
