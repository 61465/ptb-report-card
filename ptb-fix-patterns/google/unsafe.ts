/**
 * PTB-unsafe: Google OIDC — treats `hd` as universally present and
 * does not branch on consumer vs Workspace identity.
 *
 * Contract reference: methodology.md §4.3
 *   Branch 1 (Workspace, `hd` present):
 *     `V(google, hd)` = { `hd` pinned to expected domain OR allow-list }
 *   Branch 2 (consumer, `hd` absent):
 *     `V(google, email)` = { `email_verified === "true"` string }
 *
 * Source for the contract:
 *   https://developers.google.com/identity/openid-connect/openid-connect
 *   Quote on `hd`: "Provided only if the user belongs to a Google
 *   Cloud organization. The absence of this claim indicates that the
 *   account does not belong to a Google hosted domain."
 *   Quote on `email_verified`: example payload shows
 *   `"email_verified": "true"` as a string literal.
 *
 * This file is PTB-UNSAFE in two orthogonal ways:
 *   1. Assumes `hd` is always present. On consumer @gmail.com tokens
 *      `hd` is absent and the predicate silently passes everything
 *      with an `email` claim (fail-open).
 *   2. Compares `email_verified === true` boolean, which never
 *      matches Google's `"true"` string.
 */

export interface GoogleIdTokenPayload {
  /** OIDC standard — issuer, must be accounts.google.com. */
  iss: string;
  /** Immutable Google-side user id. */
  sub: string;
  /** Audience (client id). */
  aud: string;
  exp: number;
  email?: string;
  /**
   * Google emits as a **JSON string**: "true" / "false".
   *
   * UNSAFE: compared with `=== true` (boolean) below.
   */
  email_verified?: 'true' | 'false' | boolean;
  /**
   * Workspace domain, only present for Google Cloud organization
   * users. Absent for consumer @gmail.com accounts.
   *
   * UNSAFE: treated as universally present below.
   */
  hd?: string;
}

export type TrustVerdict =
  | { ok: true; subject: string; email: string | null; workspace: string | null }
  | { ok: false; reason: string };

/**
 * PTB-unsafe: fails-open on consumer @gmail.com tokens (no `hd`) and
 * fails string-vs-boolean on `email_verified`.
 *
 * A library using this shape treats every consumer @gmail.com user as
 * belonging to the application's default workspace, enabling account
 * takeover of workspace resources by a consumer-login attacker.
 */
export function trustIdentity(
  claims: GoogleIdTokenPayload,
  expectedHd: string,
): TrustVerdict {
  if (!claims.email) {
    return { ok: false, reason: 'no email claim' };
  }
  // UNSAFE: no branch for `hd === undefined` (consumer path).
  // When `hd` is absent, `claims.hd === expectedHd` is `false`, and
  // the predicate skips to the next check — but some libraries flip
  // this to "if hd missing, trust the email_verified alone" without
  // documenting the branch. Either shape is PTB-unsafe.
  // UNSAFE: boolean comparison against a string value.
  if (claims.email_verified !== true) {
    return { ok: false, reason: 'email not verified' };
  }
  // UNSAFE: no `hd` pinning on the Workspace branch — any Workspace
  // domain is accepted, including attacker-controlled ones.
  return {
    ok: true,
    subject: claims.email, // UNSAFE: uses email as subject
    email: claims.email,
    workspace: claims.hd ?? null,
  };
}
