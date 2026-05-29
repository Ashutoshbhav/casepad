import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data, error } = await supa
  .from('cases')
  .select('*')
  .eq('id', 'a2b26067-ef52-4743-9479-e112adacce43')
  .single();

if (error) { console.error(error); process.exit(1); }

console.log(JSON.stringify(data, null, 2));
