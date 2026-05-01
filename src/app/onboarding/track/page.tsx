'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRACKS, TRACK_LIST, type Track } from '@/lib/tracks';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function TrackOnboarding() {
  const [selected, setSelected] = useState<Track>('consulting');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const save = async () => {
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.updateUser({ data: { preferred_track: selected } });
    router.push('/cases');
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Pick your track</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Choose the job track you&apos;re prepping for. We&apos;ll tailor cases, scoring rubric, frameworks, and the cheat sheet to it. You can switch anytime.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {TRACK_LIST.map((k) => {
          const t = TRACKS[k];
          const active = selected === k;
          return (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`text-left rounded-lg border p-4 transition ${
                active ? 'border-emerald-500 bg-emerald-950/30' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="font-medium text-zinc-100 mb-1">{t.label}</div>
              <div className="text-xs text-zinc-500">{t.description}</div>
              <div className="mt-2 text-xs text-zinc-400">
                {t.rubric.length} scoring dims · {t.frameworks.length} frameworks · {t.math.length} math drills
              </div>
            </button>
          );
        })}
      </div>
      <button
        disabled={saving}
        onClick={save}
        className="rounded-md bg-white text-zinc-900 px-4 py-2 font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Continue with ' + TRACKS[selected].short}
      </button>
    </main>
  );
}
