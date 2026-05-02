'use client';

import { useRouter } from 'next/navigation';

export function ReplayTourButton() {
  const router = useRouter();
  const onClick = () => {
    try {
      localStorage.removeItem('casepad-tour-seen');
      localStorage.removeItem('casepad-solve-tour-seen');
    } catch {
      // localStorage can throw in private mode — non-fatal
    }
    router.push('/cases');
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
    >
      Click here
    </button>
  );
}
