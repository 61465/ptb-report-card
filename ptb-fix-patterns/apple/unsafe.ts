/**
 * PTB-unsafe: Apple Sign in with Apple — string-vs-boolean type mismatch
 * on `email_verified` and no handling of `is_private_email`.
 *
 * Contract reference: methodology.md §4.2
 *   `V(apple, email)` = {
 *     `email_verified === "true"` (string comparison),
 *     `is_private_email !== "true"` for any decision that treats the
 *     email as an owned, addressable mailbox
 *   }
 *
 * Empirical anchor: GHSA-2gvh-5vh3-m2rp (Hanko, CVSS 9.8, accepted
 * 2026-10-14). The Hanko advisory documents that Apple returns these
 * fields as JSON string literals ("true" / "false"), not JSON
 * booleans — a library that compares with `=== true` (boolean) treats
 * every token as unverified-OR-verified in the wrong direction
 * depending on how it coerces.
 *
 * Apple REST API reference:
 *   https://developer.apple.com/documentation/signinwithapplerestapi/
 *
 * This file is PTB-UNSAFE in two orthogonal ways:
 *   1. Compares `email_verified === true` (boolean), which never
 *      matches Apple's `"true"` string → either rejects every token
 *      or (if coerced via `== true`) accepts unverified tokens.
 *   2. Treats `@privaterelay.appleid.com` relay aliases as owned
 *      mailboxes, which breaks on account unlink/relink.
 */

export interface AppleIdTokenPayload {
  /** OIDC standard — issuer, must be https://appleid.apple.com. */
  iss: string;
  /** Immutable Apple-side user id. */
  sub: string;
  /** Audience (client id). */
  aud: string;
  /** Expiration. */
  exp: number;
  /** User's email as reported by Apple. Possibly a @privaterelay.appleid.com alias. */
  email?: string;
  /**
   * Apple emits this as a **JSON string**: "true" / "false".
   *
   * UNSAFE: compared below with `=== true` (boolean).
   */
  email_verified?: 'true' | 'false' | boolean;
  /**
   * Apple emits this as a **JSON string**: "true" / "false".
   * `"true"` means the `email` field is the hidden-relay alias.
   *
   * UNSAFE: this field is never read.
   */
  is_private_email?: 'true' | 'false' | boolean;
}

export type TrustVerdict =
  | { ok: true; subject: string; email: string | null }
  | { ok: false; reason: string };

/**
 * PTB-unsafe: compares a JSON string value with a JSON boolean. On
 * tokens that follow Apple's documented shape (`"email_verified":"true"`),
 * `email_verified === true` is `false`. Depending on surrounding code,
 * the library either rejects every Apple sign-in or applies a loose
 * `== true` coercion that lets `"false"` through unexpectedly.
 *
 * In the Hanko shape (`GHSA-2gvh-5vh3-m2rp`), the predicate accepted
 * tokens with `email_verified === true` coerced from the string and
 * then used the `email` claim — including private-relay aliases — as
 * the account identifier. Linking a victim account to the attacker
 * followed.
 */
export function trustIdentity(claims: AppleIdTokenPayload): TrustVerdict {
  if (!claims.email) {
    return { ok: false, reason: 'no email claim' };
  }
  // UNSAFE: strict boolean comparison against a string. In some
  // libraries, this is relaxed to `== true` (double-equals), which
  // treats the string "true" as true but also treats `1`, non-empty
  // objects, etc. as true — a different-shape bug.
  if (claims.email_verified !== true) {
    return { ok: false, reason: 'email not verified' };
  }
  // UNSAFE: no `is_private_email` check. A @privaterelay.appleid.com
  // alias will be stored as the user's canonical email; on relink the
  // alias changes and the stored row becomes orphan.
  return { ok: true, subject: claims.email, email: claims.email };
}
