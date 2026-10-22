/**
 * Tests for the Azure PTB-safe predicate.
 *
 * Fixtures mimic Microsoft Entra v2.0 ID token payloads post-signature
 * verification (per the §4.0 prerequisites in methodology.md).
 */

import { describe, expect, it } from 'vitest';
import { trustIdentity as unsafeTrust } from './unsafe';
import {
  trustIdentity as safeTrust,
  type AzureIdTokenPayload,
} from './safe';

function fixture(overrides: Partial<AzureIdTokenPayload> = {}): AzureIdTokenPayload {
  return {
    iss: 'https://login.microsoftonline.com/00000000-0000-0000-0000-000000000001/v2.0',
    oid: '00000000-0000-0000-0000-000000000002',
    tid: '00000000-0000-0000-0000-000000000001',
    email: 'alice@example.com',
    xms_edov: true,
    ...overrides,
  };
}

describe('Azure PTB predicate — safe', () => {
  it('surfaces email when xms_edov === true', () => {
    const v = safeTrust(fixture({ xms_edov: true, email: 'alice@example.com' }));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.email).toBe('alice@example.com');
      expect(v.subject).toContain('00000000-0000-0000-0000-000000000002');
    }
  });

  it('withholds email when xms_edov is absent (Facebook / SAML / WS-Fed path)', () => {
    const v = safeTrust(fixture({ xms_edov: undefined, email: 'alice@example.com' }));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.email).toBeNull();
      // Subject is still oid:tid — the user is still authenticated,
      // just not with a verified email.
      expect(v.subject).toContain('00000000-0000-0000-0000-000000000002');
    }
  });

  it('withholds email when xms_edov === false', () => {
    const v = safeTrust(fixture({ xms_edov: false, email: 'alice@example.com' }));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.email).toBeNull();
  });

  it('does NOT accept the string "1" as a verified signal (regression)', () => {
    // xms_edov as the string "1" is a non-conformant token. The safe
    // predicate must still refuse to surface the email in this case.
    const v = safeTrust(fixture({
      xms_edov: '1' as unknown as boolean, // simulate a bad token
      email: 'alice@example.com',
    }));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.email).toBeNull();
  });

  it('rejects a token missing oid or tid', () => {
    const v = safeTrust(fixture({ oid: '' }));
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/missing oid or tid/);
  });
});

describe('Azure PTB predicate — unsafe (counter-example)', () => {
  // These tests document the broken behavior. They are expected to
  // "pass" in a way the maintainer should find uncomfortable.

  it('(broken) accepts an attacker-controlled email without xms_edov', () => {
    const v = unsafeTrust({
      iss: 'https://login.microsoftonline.com/attacker/v2.0',
      oid: 'attacker-oid',
      tid: 'attacker-tid',
      email: 'victim@target.com',
      // no xms_edov — attacker-controlled tenant
    });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.email).toBe('victim@target.com'); // nOAuth hit
  });

  it('(broken) returns `email` as subject — identity-takeover vector', () => {
    const v = unsafeTrust({
      iss: '...',
      oid: 'attacker-oid',
      tid: 'attacker-tid',
      email: 'victim@target.com',
    });
    if (v.ok) {
      // The unsafe predicate uses `email` as subject. Any downstream
      // database keyed on subject will now treat the attacker as the
      // victim. This is the GHSA-ffp4-94w6-vfgv shape.
      expect(v.subject).toBe('victim@target.com');
    }
  });
});
