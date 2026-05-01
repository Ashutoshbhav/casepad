import { createClient } from '@supabase/supabase-js';
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const id = process.argv[2] || '53636830-8cb4-4481-89d1-203dd4a19447';
const { data, error } = await supa.from('sessions').select('id,status,score,score_breakdown,ended_at').eq('id', id).single();
console.log(JSON.stringify({ error, data }, null, 2));
