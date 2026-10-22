/**
 * Tests for the Apple PTB-safe predicate.
 *
 * Fixtures mimic Apple SIWA ID token payloads post-signature
 * verification (per methodology.md §4.0).
 */

import { describe, expect, it } from 'vitest';
import { trustIdentity as unsafeTrust } from './unsafe';
import {
  trustIdentity as safeTrust,
  type AppleIdTokenPayload,
} from './safe';

function fixture(overrides: Partial<AppleIdTokenPayload> = {}): AppleIdTokenPayload {
  return {
    iss: 'https://appleid.apple.com',
    sub: '000111.abcd1234.5678',
    aud: 'com.example.app',
    exp: 2_000_000_000,
    email: 'alice@example.com',
    email_verified: 'true',
    is_private_email: 'false',
    ...overrides,
  };
}

describe('Apple PTB predicate — safe', () => {
  it('surfaces addressable email when verified and non-private', () => {
    const v = safeTrust(fixture());
    expect(v.ok).toBe(true);
    if (v.ok && v.email) {
      expect(typeof v.email === 'object').toBe(true);
      if (typeof v.email === 'object') {
        expect(v.email.value).toBe('alice@example.com');
        expect(v.email.addressable).toBe(true);
        expect(v.email.private).toBe(false);
      }
    }
  });

  it('flags private-relay email as non-addressable', () => {
    const v = safeTrust(
      fixture({
        email: 'xyz789@privaterelay.appleid.com',
        is_private_email: 'true',
      }),
    );
    expect(v.ok).toBe(true);
    if (v.ok && v.email && typeof v.email === 'object') {
      expect(v.email.addressable).toBe(false);
      expect(v.email.private).toBe(true);
    }
  });

  it('withholds email when email_verified is the string "false"', () => {
    const v = safeTrust(fixture({ email_verified: 'false' }));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.email).toBeNull();
  });

  it('withholds email when email_verified is a boolean true (non-conformant Apple token)', () => {
    // Apple's documented shape is string. A library that normalizes
    // upstream may hand us Boolean true — but by that point the raw
    // token's string vs boolean distinction has been lost. The safe
    // predicate requires the exact Apple shape and refuses coercion.
    const v = safeTrust(
      fixture({ email_verified: true as unknown as 'true' }),
    );
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.email).toBeNull();
  });

  it('uses sub (not email) as the primary subject', () => {
    const v = safeTrust(fixture({ email: 'different@example.com' }));
    if (v.ok) {
      expect(v.subject).toBe('000111.abcd1234.5678');
      expect(v.subject).not.toContain('different@example.com');
    }
  });

  it('rejects a token missing sub', () => {
    const v = safeTrust(fixture({ sub: '' }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/no sub claim/);
  });
});

describe('Apple PTB predicate — unsafe (counter-example)', () => {
  it('(broken) rejects a conformant Apple token because email_verified is a string', () => {
    // The unsafe predicate compares `=== true` boolean. Apple's
    // documented emission `"email_verified":"true"` fails this check.
    // Depending on surrounding code the library either rejects every
    // Apple sign-in (loud failure) or relaxes to `== true` and
    // introduces coercion bugs.
    const v = unsafeTrust({
      iss: 'https://appleid.apple.com',
      sub: '000111.abcd1234.5678',
      aud: 'com.example.app',
      exp: 2_000_000_000,
      email: 'alice@example.com',
      email_verified: 'true', // documented Apple shape
      is_private_email: 'false',
    });
    expect(v.ok).toBe(false);
  });

  it('(broken) uses `email` as subject — breaks on relink', () => {
    const v = unsafeTrust({
      iss: 'https://appleid.apple.com',
      sub: '000111.abcd1234.5678',
      aud: 'com.example.app',
      exp: 2_000_000_000,
      email: 'xyz789@privaterelay.appleid.com',
      email_verified: true as unknown as 'true', // non-conformant coerced boolean
      is_private_email: 'true',
    });
    if (v.ok) {
      // Private-relay alias becomes the stored identifier. On the
      // next relink Apple issues a different alias → orphan row.
      expect(v.subject).toBe('xyz789@privaterelay.appleid.com');
    }
  });
});
