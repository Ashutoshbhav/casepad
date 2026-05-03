import type { MetadataRoute } from 'next';

// PWA manifest — lets users "Install" CasePad as a standalone desktop or
// mobile app via Chrome/Edge/Safari. Once installed, it opens in its own
// window without browser chrome, gets its own icon on the desktop / dock,
// and supports keyboard shortcuts.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CasePad',
    short_name: 'CasePad',
    description: 'Cohort case interview practice — solve, drill, debrief.',
    start_url: '/cases',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#10b981',
    icons: [
      // SVG icon scales to any size — Chrome/Edge/Safari all accept it.
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Cases', short_name: 'Cases', url: '/cases' },
      { name: 'Dashboard', short_name: 'Dashboard', url: '/dashboard' },
      { name: 'Cheat sheet', short_name: 'Cheats', url: '/cheatsheet' },
    ],
    categories: ['education', 'productivity'],
  };
}
