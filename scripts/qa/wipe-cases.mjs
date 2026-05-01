// DESTRUCTIVE — deletes all rows from cases + casebooks. Used to redo a full
// ingest from scratch (e.g. when switching extractor model for better quality).
// Requires --confirm to actually run.
import { createClient } from '@supabase/supabase-js';

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const confirm = process.argv.includes('--confirm');
if (!confirm) {
  const { count: cc } = await supa.from('cases').select('*', { count: 'exact', head: true });
  const { count: bc } = await supa.from('casebooks').select('*', { count: 'exact', head: true });
  console.log(`[dry-run] Would delete ${cc} cases and ${bc} casebooks. Re-run with --confirm.`);
  process.exit(0);
}

const { count: casesDeleted } = await supa.from('cases').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
console.log(`Deleted ${casesDeleted} cases.`);
const { count: booksDeleted } = await supa.from('casebooks').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000');
console.log(`Deleted ${booksDeleted} casebooks.`);
