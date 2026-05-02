// Quick probe to see what NVIDIA NIM accepts.
const key = process.env.NVIDIA_API_KEY;
const candidates = [
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'meta/llama3-70b-instruct',
  'mistralai/mixtral-8x7b-instruct-v0.1',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.3-70b',
];

for (const model of candidates) {
  const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'reply with: ok' }],
      max_tokens: 8,
      temperature: 0,
    }),
  });
  const status = r.status;
  let snippet = '';
  try {
    const txt = await r.text();
    snippet = txt.slice(0, 200);
  } catch {}
  console.log(`${status} | ${model} | ${snippet.replace(/\n/g, ' ')}`);
}
