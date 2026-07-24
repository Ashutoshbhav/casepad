// Streamed during the server component render. The debrief page may take
// 10-20 seconds on first view because it lazy-generates the ideal
// walkthrough (Tavily research + LLM synthesis). Without this loader the
// browser sat blank, looking frozen.

export default function DebriefLoading() {
  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="text-sm text-zinc-600">← back to cases</div>
      <h1 className="text-2xl font-semibold mt-2 mb-1 text-zinc-300">Scoring your session…</h1>
      <div className="text-sm text-zinc-500 mb-6">Generating your debrief — this can take 10-20 seconds on the first view of a case (we research the industry and build the expert walkthrough fresh, then cache it for everyone after).</div>

      <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-5 mb-6">
        <div className="text-xs uppercase text-emerald-400 mb-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Working on it
        </div>
        <ul className="text-xs text-zinc-400 space-y-1.5">
          <li>· Scoring your transcript across 7 dimensions</li>
          <li>· Pulling industry context from the web</li>
          <li>· Building the expert answer-depth walkthrough</li>
          <li>· Drafting your strengths + gap list</li>
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {[1,2,3,4].map((i) => (
          <div key={i} className="h-3 rounded bg-zinc-900 animate-pulse" />
        ))}
      </div>

      <div className="space-y-3 mb-8">
        {[1,2,3,4,5].map((i) => (
          <div key={i} className="h-4 rounded bg-zinc-900 animate-pulse" style={{ width: `${70 + (i * 4) % 30}%` }} />
        ))}
      </div>
    </main>
  );
}
