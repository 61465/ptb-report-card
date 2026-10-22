/**
 * Tests for the GitHub PTB-safe predicate.
 *
 * Fixtures mimic responses from GET /user and GET /user/emails after
 * successful OAuth with scope `user:email` (per methodology.md §4.4).
 */

import { describe, expect, it } from 'vitest';
import {
  pickEmailFromUserEndpoint,
  pickEmailFromEmailsList,
  type GitHubEmailEntry,
  type GitHubUserResponse,
} from './unsafe';
import { trustIdentity as safeTrust } from './safe';

const USER: GitHubUserResponse = {
  id: 42,
  login: 'alice',
  email: 'alice@public.example.com',
};

describe('GitHub PTB predicate — safe', () => {
  it('surfaces the email when a single row has primary+verified both true', () => {
    const emails: GitHubEmailEntry[] = [
      { email: 'alice@work.example.com', primary: true, verified: true, visibility: 'private' },
      { email: 'alice@old.example.com', primary: false, verified: true, visibility: null },
    ];
    const v = safeTrust(USER, emails);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.email).toBe('alice@work.example.com');
      expect(v.subject).toBe('github:42');
    }
  });

  it('withholds email when primary row is unverified', () => {
    const emails: GitHubEmailEntry[] = [
      { email: 'alice@unverified.example.com', primary: true, verified: false, visibility: null },
      { email: 'alice@secondary.example.com', primary: false, verified: true, visibility: null },
    ];
    const v = safeTrust(USER, emails);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.email).toBeNull(); // primary not verified → withhold
      expect(v.subject).toBe('github:42');
    }
  });

  it('withholds email when verified rows are not primary', () => {
    const emails: GitHubEmailEntry[] = [
      { email: 'alice@unverified.example.com', primary: true, verified: false, visibility: null },
      { email: 'alice@verified-secondary.example.com', primary: false, verified: true, visibility: null },
    ];
    const v = safeTrust(USER, emails);
    if (v.ok) expect(v.email).toBeNull();
  });

  it('ignores array order — does not pick first verified or first primary', () => {
    const emails: GitHubEmailEntry[] = [
      { email: 'alice@verified-first.example.com', primary: false, verified: true, visibility: null },
      { email: 'alice@primary-second.example.com', primary: true, verified: false, visibility: null },
    ];
    const v = safeTrust(USER, emails);
    // Neither element satisfies BOTH on the same object → withhold.
    if (v.ok) expect(v.email).toBeNull();
  });

  it('refuses to guess if more than one primary+verified row is returned', () => {
    const emails: GitHubEmailEntry[] = [
      { email: 'a@example.com', primary: true, verified: true, visibility: null },
      { email: 'b@example.com', primary: true, verified: true, visibility: null },
    ];
    const v = safeTrust(USER, emails);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toMatch(/refusing to guess/);
  });

  it('subject is github:id — not email, not login', () => {
    const emails: GitHubEmailEntry[] = [
      { email: 'alice@verified.example.com', primary: true, verified: true, visibility: null },
    ];
    const v = safeTrust(USER, emails);
    if (v.ok) {
      expect(v.subject).toBe('github:42');
      expect(v.subject).not.toContain('alice');
      expect(v.subject).not.toContain('@');
    }
  });

  it('rejects a /user response with no id', () => {
    const emails: GitHubEmailEntry[] = [];
    const v = safeTrust({ ...USER, id: 0 }, emails);
    expect(v.ok).toBe(false);
  });
});

describe('GitHub PTB predicate — unsafe (counter-example)', () => {
  it('(broken) /user endpoint variant trusts an unverified string', () => {
    const user: GitHubUserResponse = {
      id: 100,
      login: 'carol',
      // Attacker set this via GitHub settings; never had to prove ownership.
      email: 'ceo@target.com',
    };
    const v = pickEmailFromUserEndpoint(user);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.email).toBe('ceo@target.com');
      expect(v.subject).toBe('ceo@target.com'); // uses email as subject
    }
  });

  it('(broken) /user/emails variant accepts primary=true, verified=false', () => {
    const emails: GitHubEmailEntry[] = [
      {
        email: 'ceo@target.com',
        primary: true,
        verified: false, // historical account, never verified
        visibility: null,
      },
    ];
    const v = pickEmailFromEmailsList(emails);
    expect(v.ok).toBe(true);
    if (v.ok) {
      // Unverified email returned as trusted — identity-takeover vector.
      expect(v.email).toBe('ceo@target.com');
    }
  });

  it('(broken) /user/emails variant: first-primary-match ignores verified', () => {
    // GHSA-x3fc-mfpw-93f6 shape — Auth.js picked the first primary=true
    // without re-checking verified on the same element.
    const emails: GitHubEmailEntry[] = [
      { email: 'victim@target.com', primary: true, verified: false, visibility: null },
      { email: 'attacker@verified.example.com', primary: false, verified: true, visibility: null },
    ];
    const v = pickEmailFromEmailsList(emails);
    if (v.ok) expect(v.email).toBe('victim@target.com'); // broken
  });
});
