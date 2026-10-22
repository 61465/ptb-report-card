/**
 * PTB-unsafe: GitHub OAuth — reads `/user` instead of `/user/emails`,
 * or picks the first `verified: true` entry ignoring `primary`.
 *
 * Contract reference: methodology.md §4.4
 *   `V(github, email)` = {
 *     email list fetched from /user/emails (scope: user:email),
 *     selected object has `primary === true` AND `verified === true`
 *     on the SAME array element
 *   }
 *
 * Empirical anchor: GHSA-x3fc-mfpw-93f6 (Auth.js, filed 2026-10-21).
 * Auth.js trusted the `email` field from `/user` and separately
 * trusted `primary: true` without verifying `verified: true` on the
 * same object.
 *
 * Source for the contract:
 *   https://docs.github.com/en/rest/users/emails
 *   Response schema: array of { email, primary, verified, visibility }.
 *   Array ordering is not documented.
 *
 * This file is PTB-UNSAFE in two orthogonal ways:
 *   1. `pickEmailFromUserEndpoint` reads `email` from GET /user, which
 *      is a single string with no verification signal attached.
 *   2. `pickEmailFromEmailsList` uses `Array.find` with a weak
 *      predicate (`primary === true`) and ignores `verified`.
 */

/** Shape of the response from GET /user. */
export interface GitHubUserResponse {
  id: number;
  login: string;
  /** User's PUBLIC profile email. May be unverified or user-controlled. */
  email: string | null;
}

/** Shape of each element in GET /user/emails. */
export interface GitHubEmailEntry {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private' | null;
}

export type TrustVerdict =
  | { ok: true; subject: string; email: string }
  | { ok: false; reason: string };

/**
 * PTB-unsafe variant 1: pulls `email` from GET /user. This field is
 * free-form — a user can set their public profile email to any string
 * via the GitHub settings UI. It carries no verification signal.
 */
export function pickEmailFromUserEndpoint(
  user: GitHubUserResponse,
): TrustVerdict {
  if (!user.email) {
    return { ok: false, reason: 'no email on /user' };
  }
  // UNSAFE: no verified check possible from this endpoint.
  return {
    ok: true,
    subject: user.email, // UNSAFE: email as subject
    email: user.email,
  };
}

/**
 * PTB-unsafe variant 2: scans /user/emails and picks the first
 * `primary: true` element without re-checking `verified: true` on
 * that same element. A user with `primary: true, verified: false`
 * (possible historically; GitHub now enforces verification on
 * primary but older accounts may skip it) returns an unverified
 * email as trusted.
 */
export function pickEmailFromEmailsList(
  emails: readonly GitHubEmailEntry[],
): TrustVerdict {
  const primary = emails.find((e) => e.primary === true);
  if (!primary) {
    return { ok: false, reason: 'no primary email' };
  }
  // UNSAFE: no `verified` check on the same object.
  return { ok: true, subject: primary.email, email: primary.email };
}
