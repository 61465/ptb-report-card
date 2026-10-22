/**
 * PTB-unsafe: Microsoft Azure (Entra ID) OIDC — missing `xms_edov` guard.
 *
 * Contract reference: methodology.md §4.1
 *   `V(azure, email)` = { `xms_edov === true` (Boolean) present in the
 *   ID token payload }
 *
 * Empirical anchor: GHSA-ffp4-94w6-vfgv (Supabase, CVSS 9.8, accepted
 * 2026-10-14) and GHSA-2gvh-5vh3-m2rp (Hanko, CVSS 9.8, accepted
 * 2026-10-14). Both shipped a predicate functionally equivalent to
 * `trustIdentity` below.
 *
 * Microsoft's own authoritative guidance:
 *   "Never use `email` or `upn` claim values to store or determine
 *   whether the user in an access token should have access to data."
 *   — ID token claims reference, Microsoft Entra docs.
 *
 * This file is PTB-UNSAFE: the predicate trusts `email` as identity
 * without checking `xms_edov`. The nOAuth attack class (Descope,
 * 2024) exploits this exact shape.
 */

export interface AzureIdTokenPayload {
  /** OIDC standard — issuer URI; pre-validated by caller. */
  iss: string;
  /** OIDC standard — immutable Azure object id. */
  oid: string;
  /** OIDC standard — tenant id for the signed-in user. */
  tid: string;
  /** Mutable, provider-emitted email string. May or may not be verified. */
  email?: string;
  /**
   * Microsoft optional claim — Boolean. Only present when the email's
   * domain is owned by the tenant (Microsoft account, Google, or OTP).
   * Absent for Facebook and SAML/WS-Fed accounts.
   *
   * UNSAFE: this field is never read below.
   */
  xms_edov?: boolean;
}

export type TrustVerdict =
  | { ok: true; subject: string; email: string }
  | { ok: false; reason: string };

/**
 * PTB-unsafe: returns `{ ok: true }` whenever an `email` is present,
 * regardless of whether `xms_edov` asserts domain ownership. An attacker
 * controlling an unverified tenant can sign in with the victim's email
 * as `email` and be accepted here.
 */
export function trustIdentity(claims: AzureIdTokenPayload): TrustVerdict {
  if (!claims.email) {
    return { ok: false, reason: 'no email claim' };
  }
  // UNSAFE: no check of claims.xms_edov here.
  return { ok: true, subject: claims.email, email: claims.email };
}
