/**
 * Tests for the Google PTB-safe predicate.
 *
 * Fixtures mimic Google OIDC ID token payloads post-signature
 * verification (per methodology.md §4.0).
 */

import { describe, expect, it } from 'vitest';
import { trustIdentity as unsafeTrust } from './unsafe';
import {
  trustIdentity as safeTrust,
  type GoogleIdTokenPayload,
  type GoogleTrustConfig,
} from './safe';

function workspaceFixture(
  overrides: Partial<GoogleIdTokenPayload> = {},
): GoogleIdTokenPayload {
  return {
    iss: 'https://accounts.google.com',
    sub: '1234567890',
    aud: 'client-id',
    exp: 2_000_000_000,
    email: 'alice@mycompany.com',
    email_verified: 'true',
    hd: 'mycompany.com',
    ...overrides,
  };
}

function consumerFixture(
  overrides: Partial<GoogleIdTokenPayload> = {},
): GoogleIdTokenPayload {
  return {
    iss: 'https://accounts.google.com',
    sub: '9876543210',
    aud: 'client-id',
    exp: 2_000_000_000,
    email: 'bob@gmail.com',
    email_verified: 'true',
    // hd intentionally absent — consumer identity
    ...overrides,
  };
}

describe('Google PTB predicate — safe, Workspace branch', () => {
  const workspaceConfig: GoogleTrustConfig = {
    mode: 'both',
    workspaceAllowList: ['mycompany.com'],
  };

  it('accepts a Workspace token with hd matching the allow-list', () => {
    const v = safeTrust(workspaceFixture(), workspaceConfig);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.identityType).toBe('workspace');
      expect(v.email).toBe('alice@mycompany.com');
      expect(v.subject).toBe('1234567890');
    }
  });

  it('rejects a Workspace token with hd NOT in the allow-list', () => {
    const v = safeTrust(
      workspaceFixture({ hd: 'attacker-controlled.com' }),
      workspaceConfig,
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/not in workspaceAllowList/);
  });

  it('rejects Workspace when config.mode is "consumer-only"', () => {
    const v = safeTrust(workspaceFixture(), {
      mode: 'consumer-only',
    });
    expect(v.ok).toBe(false);
  });
});

describe('Google PTB predicate — safe, consumer branch', () => {
  const consumerConfig: GoogleTrustConfig = { mode: 'both' };

  it('accepts a consumer @gmail.com token with email_verified "true"', () => {
    const v = safeTrust(consumerFixture(), consumerConfig);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.identityType).toBe('consumer');
      expect(v.email).toBe('bob@gmail.com');
    }
  });

  it('withholds email when email_verified is string "false"', () => {
    const v = safeTrust(
      consumerFixture({ email_verified: 'false' }),
      consumerConfig,
    );
    if (v.ok) expect(v.email).toBeNull();
  });

  it('withholds email when email_verified is a non-conformant Boolean', () => {
    const v = safeTrust(
      consumerFixture({ email_verified: true as unknown as 'true' }),
      consumerConfig,
    );
    if (v.ok) expect(v.email).toBeNull();
  });

  it('rejects consumer when config.mode is "workspace-only"', () => {
    const v = safeTrust(consumerFixture(), {
      mode: 'workspace-only',
      workspaceAllowList: ['mycompany.com'],
    });
    expect(v.ok).toBe(false);
  });

  it('uses sub (not email) as the primary subject', () => {
    const v = safeTrust(consumerFixture(), consumerConfig);
    if (v.ok) expect(v.subject).toBe('9876543210');
  });
});

describe('Google PTB predicate — unsafe (counter-example)', () => {
  it('(broken) fails-closed on a conformant consumer token (string "true" fails =true)', () => {
    // The unsafe predicate compares `=== true` boolean. Google's
    // documented emission `"email_verified":"true"` fails this check.
    const v = unsafeTrust(
      {
        iss: 'https://accounts.google.com',
        sub: '9876543210',
        aud: 'client-id',
        exp: 2_000_000_000,
        email: 'bob@gmail.com',
        email_verified: 'true',
      },
      'mycompany.com',
    );
    expect(v.ok).toBe(false);
  });

  it('(broken) when string coerced to boolean, accepts consumer as workspace', () => {
    // In the Hanko-shaped library, email_verified gets upstream-
    // normalized to Boolean. Then this fail-open hits: consumer token
    // (no hd) accepted and no hd-pinning performed.
    const v = unsafeTrust(
      {
        iss: 'https://accounts.google.com',
        sub: '9876543210',
        aud: 'client-id',
        exp: 2_000_000_000,
        email: 'bob@gmail.com',
        email_verified: true,
        // hd absent — consumer
      },
      'mycompany.com',
    );
    if (v.ok) {
      // workspace is null (consumer) but the predicate returned ok:true
      // without any hd check at all → PTB-unsafe fail-open.
      expect(v.workspace).toBeNull();
      expect(v.subject).toBe('bob@gmail.com'); // uses email as subject
    }
  });
});
