'use client';

import { useRef, useState, useTransition } from 'react';
import { startLiveCaseInterview, startCaselessLiveInterview } from '@/server-actions/start-live-interview';
import { CaseFilters } from './case-filters';
import { CaseSearch } from './case-search';

interface CaseListRow {
  id: string;
  title: string;
  case_type: string;
  difficulty: string;
}

type Mode = 'case' | 'behavioral';

export function LiveInterviewStartClient({
  cases,
  resumeUpdatedAt,
  hasFilters,
}: {
  cases: CaseListRow[];
  resumeUpdatedAt: string | null;
  hasFilters: boolean;
}) {
  const [mode, setMode] = useState<Mode>('behavioral');
  const [targetFirm, setTargetFirm] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [resumeStatus, setResumeStatus] = useState(resumeUpdatedAt);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: 24,
  };
  const tabButton = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    borderRadius: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: active ? 'var(--color-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    cursor: 'pointer',
  });
  const inputStyle: React.CSSProperties = {
    background: 'var(--color-bg-sunken)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    padding: '10px 14px',
    borderRadius: 4,
    fontSize: 14,
    width: '100%',
    outline: 'none',
  };
  const primaryBtn: React.CSSProperties = {
    background: 'var(--color-text-primary)',
    color: 'var(--color-bg-canvas)',
    padding: '12px 20px',
    borderRadius: 6,
    border: 0,
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const uploadResume = async (file: File) => {
    setUploadState('uploading');
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await fetch('/api/resume/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError((data?.error as string) || 'Upload failed');
        setUploadState('error');
        return;
      }
      setUploadState('idle');
      setResumeStatus(new Date().toISOString());
    } catch (err) {
      console.error('[live-interview-start] resume upload failed', err);
      setUploadError('Upload failed — try again');
      setUploadState('error');
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-bg-canvas)' }}>
      <section className="px-6 sm:px-12 py-12" style={{ background: '#011845', color: '#FFFFFF' }}>
        <div className="max-w-3xl mx-auto">
          <a href="/dashboard" className="hupr-mono-eyebrow underline" style={{ color: '#FFFFFF' }}>
            ← back to dashboard
          </a>
          <div className="mt-6">
            <span className="hupr-mono-eyebrow" style={{ color: '#FFFFFF' }}>Live Interview</span>
            <hr style={{ border: 0, borderTop: '1px solid rgba(255,255,255,0.4)', margin: '8px 0' }} />
          </div>
          <h1
            className="uppercase mt-6"
            style={{
              fontFamily: 'var(--font-headline)',
              fontWeight: 700,
              fontSize: 'clamp(32px, 5vw, 56px)',
              lineHeight: 1,
              color: '#FFFFFF',
              margin: 0,
            }}
          >
            Speak. No safety net.
          </h1>
          <p className="mt-4 max-w-prose" style={{ fontFamily: 'var(--font-accent)', fontSize: 16, color: 'rgba(255,255,255,0.85)' }}>
            Voice in, voice out, real interview pressure — what you say is what gets sent, no editing before it goes.
          </p>
        </div>
      </section>

      <div className="p-6 sm:p-12 max-w-3xl mx-auto space-y-6">
        <div className="flex gap-3">
          <button type="button" style={tabButton(mode === 'behavioral')} onClick={() => setMode('behavioral')}>
            Behavioral / Culture-Fit
          </button>
          <button type="button" style={tabButton(mode === 'case')} onClick={() => setMode('case')}>
            Practice a case, live
          </button>
        </div>

        {mode === 'behavioral' && (
          <div style={cardStyle} className="space-y-5">
            <div>
              <label className="hupr-mono-eyebrow block mb-2">Target firm (optional)</label>
              <input
                type="text"
                value={targetFirm}
                onChange={(e) => setTargetFirm(e.target.value)}
                placeholder="e.g. McKinsey — leave blank for generic fit questions"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="hupr-mono-eyebrow block mb-2">Résumé</label>
              {resumeStatus ? (
                <p style={{ fontFamily: 'var(--font-accent)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  On file, uploaded {new Date(resumeStatus).toLocaleDateString('en-US')}.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ color: 'var(--color-accent)', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    Re-upload
                  </button>
                </p>
              ) : (
                <p style={{ fontFamily: 'var(--font-accent)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  No résumé yet — the interviewer will ask generic background questions instead.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ color: 'var(--color-accent)', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    Upload one
                  </button>
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadResume(file);
                }}
              />
              {uploadState === 'uploading' && (
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>Uploading…</p>
              )}
              {uploadState === 'error' && uploadError && (
                <p style={{ fontSize: 12, color: 'var(--color-signal-danger, #D94B4B)', marginTop: 6 }}>{uploadError}</p>
              )}
            </div>

            <button
              type="button"
              style={primaryBtn}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await startCaselessLiveInterview(targetFirm.trim() || null);
                })
              }
            >
              {isPending ? 'Starting…' : 'Start live interview'}
            </button>
          </div>
        )}

        {mode === 'case' && (
          <div className="space-y-4">
            <CaseSearch basePath="/live-interview" hash="" />
            <CaseFilters basePath="/live-interview" />
            <div style={cardStyle} className="space-y-3">
              {cases.length === 0 && (
                <p style={{ fontFamily: 'var(--font-accent)', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  {hasFilters ? 'No cases match those filters — try widening the search.' : 'No cases available to load right now.'}
                </p>
              )}
            {cases.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={isPending}
                className="w-full text-left p-4 rounded-md transition-opacity hover:opacity-90"
                style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-sunken)' }}
                onClick={() =>
                  startTransition(async () => {
                    await startLiveCaseInterview(c.id);
                  })
                }
              >
                <div style={{ fontFamily: 'var(--font-accent)', fontSize: 15, color: 'var(--color-text-primary)' }}>
                  {c.title}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-wide mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {c.case_type.replace(/_/g, ' ')} · {c.difficulty}
                </div>
              </button>
            ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
