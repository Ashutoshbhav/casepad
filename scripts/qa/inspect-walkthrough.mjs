import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const SESSION_ID = 'bc8a6672-2169-43d5-a089-41d18565a0b8';
const { data: s } = await sb.from('sessions').select('case_id, score_breakdown').eq('id', SESSION_ID).single();
const { data: c } = await sb.from('cases').select('title, ideal_walkthrough, ideal_structure').eq('id', s.case_id).single();
console.log('CASE:', c.title);
console.log('--- ideal_walkthrough exists:', !!c.ideal_walkthrough);
console.log('--- ideal_walkthrough type:', typeof c.ideal_walkthrough);
if (c.ideal_walkthrough) {
  const iw = c.ideal_walkthrough;
  console.log('--- keys:', Object.keys(iw));
  if (iw.steps && Array.isArray(iw.steps)) {
    console.log('--- steps count:', iw.steps.length);
    iw.steps.slice(0, 5).forEach((st, i) => {
      console.log(`STEP ${i}:`, JSON.stringify(st).slice(0, 400));
    });
  }
  if (iw.outline) console.log('outline:', JSON.stringify(iw.outline).slice(0, 600));
  if (iw.hypotheses) console.log('hypotheses:', JSON.stringify(iw.hypotheses).slice(0, 400));
}
console.log('--- ideal_structure exists:', !!c.ideal_structure);
if (c.ideal_structure) {
  console.log('--- ideal_structure keys:', Object.keys(c.ideal_structure));
}
console.log('--- score_breakdown keys:', Object.keys(s.score_breakdown || {}));
console.log('--- score_breakdown sample:', JSON.stringify(s.score_breakdown).slice(0, 800));
