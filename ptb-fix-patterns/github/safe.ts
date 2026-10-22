/**
 * PTB-safe: GitHub OAuth — reads /user/emails with scope `user:email`,
 * selects the element where BOTH `primary === true` AND
 * `verified === true` hold on the SAME object. Falls back to the
 * stable `id` claim for the subject.
 *
 * Contract reference: methodology.md §4.4
 *   `V(github, email)` = {
 *     email list fetched from /user/emails (scope: user:email),
 *     selected object has `primary === true` AND `verified === true`
 *     on the SAME array element; array order is not guaranteed
 *   }
 *
 * Source for the contract:
 *   https://docs.github.com/en/rest/users/emails
 *   Each array element: { email, primary, verified, visibility }.
 *   The required OAuth scope for /user/emails is `user:email`;
 *   `read:user` does not grant access to this endpoint's full data.
 *
 * Prerequisite assumption: the caller has already validated the OAuth
 * access token (/user call succeeded under the same token) and has
 * obtained an authenticated response from /user/emails. See
 * methodology.md §4.0.
 *
 * NEGATIVE RULE. This predicate deliberately accepts the `/user`
 * response ONLY to extract the immutable numeric `id` for the
 * subject. The `email` field on the `/user` response (if present) is
 * NEVER consulted — it is a free-form, user-controlled public profile
 * string with no verification signal attached. A library that reads
 * `email` from `/user` and surfaces it as "the user's email" is
 * PTB-unsafe regardless of what else it does. Enforce the negative
 * rule at the type level in callers if possible.
 */

export interface GitHubUserResponse {
  id: number;
  login: string;
  email: string | null;
}

export interface GitHubEmailEntry {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private' | null;
}

export type TrustVerdict =
  | { ok: true; subject: string; email: string | null }
  | { ok: false; reason: string };

/**
 * PTB-safe. The primary subject is GitHub's numeric `id` — immutable
 * across username changes. The email is surfaced only when a single
 * array element from /user/emails satisfies both `primary === true`
 * AND `verified === true` on the same object.
 *
 * Note the explicit guard against ambiguous responses: if more than
 * one element claims primary=true (should not happen per GitHub's
 * invariants, but we defend against it), the predicate fails rather
 * than guessing.
 */
export function trustIdentity(
  user: GitHubUserResponse,
  emails: readonly GitHubEmailEntry[],
): TrustVerdict {
  if (!user.id) {
    return { ok: false, reason: 'no id on /user response' };
  }
  const subject = `github:${user.id}`;

  // Collect elements where BOTH primary and verified are true on the
  // same object. We do NOT fall back on array position.
  const matches = emails.filter(
    (e) => e.primary === true && e.verified === true,
  );

  if (matches.length === 0) {
    // Authenticated identity is still trustworthy — the subject is
    // the immutable id. Email is withheld.
    return { ok: true, subject, email: null };
  }

  if (matches.length > 1) {
    // Defensive: GitHub guarantees at most one primary. If this ever
    // changes, we refuse to guess which to trust.
    return {
      ok: false,
      reason: `/user/emails returned ${matches.length} primary+verified rows; refusing to guess`,
    };
  }

  return { ok: true, subject, email: matches[0].email };
}
