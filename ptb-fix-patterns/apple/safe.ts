/**
 * PTB-safe: Apple Sign in with Apple — string comparison on
 * `email_verified` and explicit `is_private_email` branch.
 *
 * Contract reference: methodology.md §4.2
 *   `V(apple, email)` = {
 *     `email_verified === "true"` (string comparison),
 *     `is_private_email !== "true"` for any decision that treats the
 *     email as an owned, addressable mailbox (recovery, cross-session
 *     linking, deduplication)
 *   }
 *
 * Apple REST API reference:
 *   https://developer.apple.com/documentation/signinwithapplerestapi/
 *   Field types: `email_verified` and `is_private_email` are
 *   documented as string literals, consistent with
 *   `GHSA-2gvh-5vh3-m2rp` (Hanko) empirical observation.
 *
 * Prerequisite assumption: the caller has already verified signature,
 * `iss === "https://appleid.apple.com"`, `aud === clientId`, and
 * `exp` / `nbf` are in-window. See methodology.md §4.0.
 *
 * CAVEAT on upstream normalization. Some wrapper libraries parse the
 * raw JWT with a permissive `JSON.parse`-and-coerce path that turns
 * Apple's string `"true"` into the Boolean `true` before this
 * predicate sees it. In that case this predicate withholds `email`
 * (because `email_verified` !== the string "true" after coercion),
 * which is a safe-side failure — the user is still authenticated via
 * `sub`, only the email surface is withheld. If you observe this
 * behavior, fix the upstream parser rather than relax this
 * comparison: the upstream parser lost information that this
 * predicate relies on.
 */

export interface AppleIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  email?: string;
  /** Apple emits as string "true"/"false". */
  email_verified?: 'true' | 'false';
  /** Apple emits as string "true"/"false". */
  is_private_email?: 'true' | 'false';
}

/**
 * Trust verdict. `email` is one of three shapes:
 *   - `null`: no email claim or email_verified not "true"
 *   - `{ addressable: false }`: a private-relay alias, usable for
 *     delivery to Apple's relay but NOT as a stable identifier
 *   - `{ addressable: true }`: a user-owned, verified email the
 *     application may treat as a canonical identifier
 */
export type TrustVerdict =
  | {
      ok: true;
      subject: string;
      email:
        | null
        | { value: string; addressable: false; private: true }
        | { value: string; addressable: true; private: false };
    }
  | { ok: false; reason: string };

/**
 * PTB-safe. The primary subject is Apple's `sub` claim — immutable,
 * stable across relinks, and the only safe identifier for an Apple
 * user over time. The `email` field is surfaced with its
 * addressability flag so callers can decide whether to use it for
 * delivery, deduplication, or recovery.
 */
export function trustIdentity(claims: AppleIdTokenPayload): TrustVerdict {
  if (!claims.sub) {
    return { ok: false, reason: 'no sub claim — token malformed for Apple' };
  }
  const subject = claims.sub;

  // String comparison per Apple's documented emission shape. A
  // non-conformant library that normalizes to boolean upstream would
  // fail this check; that is correct behavior — the normalized
  // boolean cannot be distinguished from a coerced `"true"` string
  // by this predicate.
  const verified = claims.email_verified === 'true';
  if (!claims.email || !verified) {
    return { ok: true, subject, email: null };
  }

  const isPrivate = claims.is_private_email === 'true';
  return {
    ok: true,
    subject,
    email: isPrivate
      ? { value: claims.email, addressable: false, private: true }
      : { value: claims.email, addressable: true, private: false },
  };
}
