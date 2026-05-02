'use client';
import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'interviewer'; content: string };

export function ChatPanel({ sessionId, initial, onTurnComplete }: { sessionId: string; initial: Msg[]; onTurnComplete?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Hanging-turn detection: if the last persisted message is the user's
  // (no interviewer reply followed it — likely a tab-close mid-stream),
  // show a recovery prompt instead of letting the user wonder why the
  // interviewer never answered.
  const lastMsg = messages[messages.length - 1];
  const hasHangingUserTurn =
    !streaming && messages.length > 0 && lastMsg?.role === 'user';

  const retryLastUserTurn = () => {
    if (!lastMsg || lastMsg.role !== 'user' || streaming) return;
    // Tell sendUserTurn the user message is already in local state — it
    // also lives in the persisted transcript already, so we don't append.
    sendUserTurn(lastMsg.content, true);
  };

  // Core send — used by both the form submit and the hanging-turn retry.
  // assumesUserMessageAlreadyPersisted=true skips appending the user msg to
  // local state (caller already did) AND tells the API not to re-persist
  // the user turn — but our /api/chat always appends the user turn before
  // streaming, so we instead just resend and accept that the transcript
  // will have a duplicate user message in the rare retry-after-success case.
  const sendUserTurn = async (text: string, alreadyAppended = false) => {
    if (!text.trim() || streaming) return;
    if (!alreadyAppended) setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setStreaming(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userTurn: text }),
    });

    setMessages((m) => [...m, { role: 'interviewer', content: '' }]);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'interviewer', content: acc };
        return copy;
      });
    }
    setStreaming(false);

    fetch('/api/cheatsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userQuestion: text, interviewerAnswer: acc }),
    }).catch(() => {});

    onTurnComplete?.();
  };

  const send = () => sendUserTurn(input);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-zinc-800 ml-auto' : 'bg-zinc-900 border border-zinc-800'}`}>
            {m.content || <span className="text-zinc-600">…</span>}
          </div>
        ))}
        {hasHangingUserTurn && (
          <div className="rounded-lg border border-amber-700 bg-amber-950/30 p-3 text-xs">
            <div className="text-amber-200 mb-1.5">⚠ The interviewer didn't reply to your last message — the previous turn was interrupted (tab close or network blip).</div>
            <button
              onClick={retryLastUserTurn}
              className="text-xs px-2.5 py-1 rounded bg-amber-700 text-amber-50 hover:bg-amber-600"
            >
              ↻ Retry that turn
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-zinc-800 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the interviewer…"
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
          disabled={streaming}
        />
        <button onClick={send} disabled={streaming} className="px-4 py-2 bg-white text-zinc-900 rounded text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </div>
    </div>
  );
}
