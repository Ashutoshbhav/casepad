// src/app/api/version/route.ts
//
// "Which commit is actually in prod?" — this endpoint answers it without
// guessing. PRD v3.1 Stage 0 item 4 / Decision Log D18: deploy state has
// repeatedly been unknown (a `/design-lab` variant served in prod, branches
// several commits ahead and undeployed, five parked branches). A public,
// unauthenticated build-stamp makes that a 1-request check and gives the
// synthetic canary something cheap and content-free to assert against.
//
// On Vercel the Git metadata comes from the build-time system env vars
// (https://vercel.com/docs/environment-variables/system-environment-variables).
// Locally none of those exist, so we fall back to shelling out to git — best
// effort, never throws.
//
// Nothing here is sensitive: it's the SHA/branch/env of our own repo plus the
// Node version and when this bundle was built. No DB, no secrets, no auth.

import { NextResponse } from 'next/server';
import { execFileSync } from 'node:child_process';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // never prerender a stale stamp
export const maxDuration = 5;

// Evaluated once when the serverless bundle is first loaded — a rough "when
// did this deployment's code start running" marker, independent of Git.
const BUNDLE_LOADED_AT = new Date().toISOString();

function gitLocal(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      timeout: 1500,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

export async function GET() {
  const onVercel = !!process.env.VERCEL;

  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    gitLocal(['rev-parse', 'HEAD']) ||
    null;

  const branch =
    process.env.VERCEL_GIT_COMMIT_REF ||
    gitLocal(['rev-parse', '--abbrev-ref', 'HEAD']) ||
    null;

  const dirty = onVercel ? false : gitLocal(['status', '--porcelain']) ? true : false;

  return NextResponse.json(
    {
      ok: true,
      sha,
      shaShort: sha ? sha.slice(0, 7) : null,
      branch,
      // "production" | "preview" | "development" on Vercel; "local" otherwise.
      env: process.env.VERCEL_ENV || (onVercel ? 'unknown' : 'local'),
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
      deploymentUrl: process.env.VERCEL_URL || null,
      region: process.env.VERCEL_REGION || null,
      // Only meaningful for local runs — on Vercel the tree is always clean.
      workingTreeDirty: dirty,
      node: process.version,
      bundleLoadedAt: BUNDLE_LOADED_AT,
      now: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    },
  );
}
