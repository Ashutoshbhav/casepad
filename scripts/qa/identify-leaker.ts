// scripts/qa/identify-leaker.ts
//
// Admin tool: given a leaked transcript paste, identify which cohort
// user_id it came from via the steganographic watermark.
//
// Usage:
//   1. Save the leaked transcript to a file (e.g. leaked.txt)
//   2. Run:
//      npx tsx --env-file=.env.local scripts/qa/identify-leaker.ts leaked.txt
//
// Pulls all known user_ids from the allowlist, hashes each, compares to
// the watermark bits in the leaked text. Returns the matching user_id +
// email if found.

import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { extractWatermark, identifyLeaker, tokenForUser } from '../../src/lib/security/watermark';

async function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('Usage: tsx scripts/qa/identify-leaker.ts <leaked.txt>');
    process.exit(1);
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing supabase env vars');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const text = await readFile(inputFile, 'utf8');

  // Extract watermark from each plausible Ash-turn chunk.
  // For simplicity, scan the entire blob — multiple turns concatenated
  // still encode the same per-user token repeatedly.
  const watermark = extractWatermark(text, 32);
  console.log(`Extracted watermark bits: ${watermark}`);

  if (watermark.length < 16) {
    console.log('Not enough bits to identify — transcript may have been stripped of zero-width chars.');
    process.exit(2);
  }

  // Pull all known users (cohort allowlist + admin)
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (!users) {
    console.error('Could not list users');
    process.exit(1);
  }
  const userIds = users.users.map((u) => u.id);
  console.log(`Comparing against ${userIds.length} known users…`);

  const match = identifyLeaker(watermark, userIds);
  if (match) {
    const user = users.users.find((u) => u.id === match);
    console.log('\n=== MATCH ===');
    console.log(`User ID: ${match}`);
    console.log(`Email:   ${user?.email}`);
    console.log(`Token:   ${tokenForUser(match)}`);
  } else {
    console.log('\nNo match against current users. Watermark may be partial OR from a deleted account.');
    // Print top 3 closest matches by Hamming distance
    const ranked = userIds
      .map((uid) => {
        const expected = tokenForUser(uid);
        const cmp = Math.min(watermark.length, expected.length);
        let dist = 0;
        for (let i = 0; i < cmp; i++) if (watermark[i] !== expected[i]) dist++;
        return { uid, dist, cmp };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
    console.log('\nClosest candidates by Hamming distance:');
    for (const r of ranked) {
      const u = users.users.find((x) => x.id === r.uid);
      console.log(`  ${r.dist}/${r.cmp} bits off — ${u?.email}`);
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
