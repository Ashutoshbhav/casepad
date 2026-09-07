// src/components/room/fonts.ts
//
// The v2 "room" typographic system, shared by the production interview room
// and debrief. IBM Plex Mono for transcript / instrumentation body, Montserrat
// for display headlines, Fraunces (light) for the big tabular numbers (score,
// sub-scores). Exposed as CSS variables so components use `var(--font-room-*)`.

import { IBM_Plex_Mono, Montserrat, Fraunces } from 'next/font/google';

export const roomMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-room-mono',
  weight: ['400', '500', '600'],
});

export const roomDisplay = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-room-display',
  weight: ['400', '500', '700', '800'],
});

export const roomSerif = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-room-serif',
  weight: ['300', '400'],
  style: ['normal', 'italic'],
});

/** Put on the top-level element of a room/debrief surface to bind the vars. */
export const roomFontVars = `${roomMono.variable} ${roomDisplay.variable} ${roomSerif.variable}`;
