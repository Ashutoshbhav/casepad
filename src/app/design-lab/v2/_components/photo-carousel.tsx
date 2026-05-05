'use client';

// PhotoCarousel — full-bleed photo background that auto-cycles through
// 3 empty-boardroom shots. Cross-fade transitions, prefers-reduced-
// motion respected. Pagination indicator updates live.
//
// Photos are Unsplash hotlinks — free for commercial use, no model-
// release issue (no people in the shots).

import { useEffect, useState } from 'react';

const PHOTOS: string[] = [
  // Empty boardroom with directional window light
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2400&q=80',
  // Modern conference room, empty long table
  'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=2400&q=80',
  // Boardroom interior — moody window light
  'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=2400&q=80',
];

const ROTATE_MS = 7500;

export function PhotoCarousel({ onIndexChange }: { onIndexChange?: (i: number) => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // no rotation under reduced motion
    }
    const id = setInterval(() => {
      setActive((i) => {
        const next = (i + 1) % PHOTOS.length;
        return next;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Notify parent so pagination indicator can sync
  useEffect(() => {
    onIndexChange?.(active);
  }, [active, onIndexChange]);

  return (
    <>
      {PHOTOS.map((url, i) => (
        <div
          key={url}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 60%',
            filter: 'saturate(0.92) brightness(0.74) contrast(1.04)',
            opacity: i === active ? 1 : 0,
            transition: 'opacity 1400ms ease-in-out',
          }}
        />
      ))}
    </>
  );
}

export const PHOTO_COUNT = PHOTOS.length;
