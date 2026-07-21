// src/app/api/resume/upload/route.ts
//
// Résumé → text endpoint for the live-interview start screen. Accepts a
// multipart PDF upload, parses it server-side with pdf-parse (same library
// already used by scripts/ingest/parse.ts for casebooks — first use from a
// live API route), and upserts ONLY the extracted text into `user_resumes`.
// The raw PDF is never stored — see 0019_live_interview.sql's rationale
// (this repo has no private-file-storage precedent, and a résumé's text is
// all the interviewer engine actually needs).
//
// Parsing failure degrades gracefully at the call site (chat/route.ts just
// asks generic questions instead of résumé-grounded ones) — this route only
// needs to fail cleanly with a clear error, not keep the live interview from
// starting.

import { NextRequest } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { gateRequest } from '@/lib/api/gate';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // Résumés are small; generous but not casebook-sized.
const MIN_EXTRACTED_CHARS = 100; // Below this it's almost certainly a scanned image with no text layer.

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  // Uploads are infrequent (upload once, maybe re-upload occasionally) — a
  // tight per-user cap is enough to stop abuse without affecting real use.
  const gate = await gateRequest({ routeName: 'resume-upload', perUserPerMinute: 5 });
  if (!gate.ok) return gate.response;
  const { user, supabase } = gate;

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    console.error('[resume/upload] formData parse failed:', err);
    return jsonError(400, 'invalid multipart body');
  }

  const file = form.get('resume');
  if (!file || !(file instanceof Blob)) {
    return jsonError(400, 'resume field required (Blob/PDF)');
  }
  if (file.size === 0) {
    return jsonError(400, 'resume file is empty');
  }
  if (file.size > MAX_BYTES) {
    return jsonError(413, 'resume too large (max 10 MB)');
  }

  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    text = (result.text ?? '').trim();
  } catch (err) {
    console.error('[resume/upload] PDF parse failed:', err);
    return jsonError(422, 'could not parse this file — make sure it is a text-based PDF');
  }

  if (text.length < MIN_EXTRACTED_CHARS) {
    return jsonError(
      422,
      'could not extract readable text from this PDF — it may be a scanned image without a text layer'
    );
  }

  const { error: upsertErr } = await supabase
    .from('user_resumes')
    .upsert(
      { user_id: user.id, resume_text: text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (upsertErr) {
    console.error('[resume/upload] upsert failed:', upsertErr);
    return jsonError(500, 'could not save résumé — try again');
  }

  return new Response(JSON.stringify({ ok: true, chars: text.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
