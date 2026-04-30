'use client';
import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'interviewer'; content: string };

export function ChatPanel({ sessionId, initial }: { sessionId: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg]);
    const sentInput = input;
    setInput('');
    setStreaming(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userTurn: sentInput }),
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
      body: JSON.stringify({ sessionId, userQuestion: sentInput, interviewerAnswer: acc }),
    }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-zinc-800 ml-auto' : 'bg-zinc-900 border border-zinc-800'}`}>
            {m.content || <span className="text-zinc-600">…</span>}
          </div>
        ))}
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
