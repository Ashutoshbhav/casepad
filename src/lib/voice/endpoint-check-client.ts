'use client';

// endpoint-check-client.ts — client-side call to the semantic endpointing
// classifier (/api/voice/endpoint-check). This is a pure LATENCY-SENSITIVE
// enhancement on top of the VAD-driven turn-taking in turn-detector.ts /
// live-mic-input.tsx, never a dependency: any failure, timeout, or network
// hiccup here MUST resolve to `true` (treat the answer as complete and send
// it), which is exactly the behavior that shipped before this feature
// existed. Never let this hang a turn.

const CLIENT_TIMEOUT_MS = 1200;

export async function checkEndpointComplete(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/voice/endpoint-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
      signal: ctrl.signal,
    });
    if (!res.ok) return true;
    const data = (await res.json()) as { complete?: boolean };
    return data.complete !== false;
  } catch (err) {
    console.warn('[endpoint-check-client] failed, failing open to complete', err);
    return true;
  } finally {
    clearTimeout(timer);
  }
}
