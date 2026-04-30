import { describe, it, expect } from 'vitest';
import { isEmailAllowed } from '@/lib/auth/allowlist';

describe('isEmailAllowed', () => {
  it('returns true when the email is in the allowlist', async () => {
    const fakeAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { email: 'ash@x.com' }, error: null }),
          }),
        }),
      }),
    };
    expect(await isEmailAllowed(fakeAdmin as any, 'ash@x.com')).toBe(true);
  });

  it('returns false when the email is not in the allowlist', async () => {
    const fakeAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    };
    expect(await isEmailAllowed(fakeAdmin as any, 'stranger@x.com')).toBe(false);
  });

  it('throws when the DB returns an error', async () => {
    const fakeAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: 'boom' } }),
          }),
        }),
      }),
    };
    await expect(isEmailAllowed(fakeAdmin as any, 'a@b.com')).rejects.toThrow('boom');
  });
});
