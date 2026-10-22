/**
 * PTB-safe: Microsoft Azure (Entra ID) OIDC — gates email on
 * `xms_edov === true` and uses `oid` as the primary subject.
 *
 * Contract reference: methodology.md §4.1
 *   `V(azure, email)` = { `xms_edov === true` (Boolean) present in the
 *   ID token payload }
 *
 * Source for the contract:
 *   https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference
 *   — xms_edov row:
 *     "Boolean value indicating whether the user's email domain owner
 *     has been verified. ... Facebook and SAML/WS-Fed accounts do not
 *     have verified domains. For this claim to be returned in the
 *     token, the presence of the `email` claim is required."
 *
 * Prerequisite assumption: the caller has already verified the token's
 * signature against the correct JWKS, matched `iss` and `aud`, and
 * confirmed `exp` / `nbf` are in-window. See methodology.md §4.0.
 */

export interface AzureIdTokenPayload {
  iss: string;
  oid: string;
  tid: string;
  email?: string;
  /** Boolean per Microsoft docs — compare with `=== true`. */
  xms_edov?: boolean;
}

export type TrustVerdict =
  | { ok: true; subject: string; email: string | null }
  | { ok: false; reason: string };

/**
 * PTB-safe: the primary identity is `oid` + `tid` (immutable, pairwise
 * per Microsoft docs). The `email` claim is surfaced to the caller only
 * when `xms_edov === true` establishes that Microsoft has verified the
 * email's domain ownership.
 *
 * A Facebook or SAML/WS-Fed-authenticated user has no `xms_edov` and
 * will have `email: null` surfaced — correct per the Microsoft
 * guidance that these accounts have no verified domains.
 */
export function trustIdentity(claims: AzureIdTokenPayload): TrustVerdict {
  // Immutable subject per Microsoft's own guidance:
  // "To correctly store information per-user, use `sub` or `oid` alone,
  //  with `tid` used for routing or sharding if needed."
  if (!claims.oid || !claims.tid) {
    return { ok: false, reason: 'missing oid or tid — token malformed for Azure' };
  }
  const subject = `${claims.tid}:${claims.oid}`;

  // Email is only trustworthy when xms_edov asserts domain ownership.
  // Note the strict Boolean comparison — Microsoft specifies this claim
  // as Boolean, not string "1" / "true".
  const emailIsTrusted = claims.email !== undefined && claims.xms_edov === true;

  return {
    ok: true,
    subject,
    email: emailIsTrusted ? (claims.email as string) : null,
  };
}
