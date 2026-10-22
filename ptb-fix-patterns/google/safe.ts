/**
 * PTB-safe: Google OIDC — explicit Workspace / consumer branch,
 * string comparison on `email_verified`, pinned `hd`.
 *
 * Contract reference: methodology.md §4.3
 *   Branch 1 (Workspace, `hd` present):
 *     `V(google, hd)` = { `hd` pinned to expected domain OR allow-list }
 *   Branch 2 (consumer, `hd` absent):
 *     `V(google, email)` = { `email_verified === "true"` string }
 *
 * Source for the contract:
 *   https://developers.google.com/identity/openid-connect/openid-connect
 *   `hd`: "Provided only if the user belongs to a Google Cloud
 *   organization. The absence of this claim indicates that the
 *   account does not belong to a Google hosted domain."
 *   `email_verified`: example payload shows `"email_verified": "true"`.
 *
 * Prerequisite assumption (methodology.md §4.0): signature verified,
 * `iss` matches `https://accounts.google.com`, `aud === clientId`,
 * `exp`/`nbf` in-window.
 */

export interface GoogleIdTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  email?: string;
  /** Google emits as string "true"/"false". */
  email_verified?: 'true' | 'false';
  /** Workspace domain. Absent for consumer accounts. */
  hd?: string;
}

export type TrustVerdict =
  | {
      ok: true;
      subject: string;
      email: string | null;
      /** 'workspace' = Workspace user whose hd matched the allow-list.
       *  'consumer' = @gmail.com-equivalent, hd absent, email_verified ok.
       *  null = email withheld. */
      identityType: 'workspace' | 'consumer' | null;
    }
  | { ok: false; reason: string };

export interface GoogleTrustConfig {
  /**
   * REQUIRED — no default. The three modes carry different trust
   * surfaces, and silently defaulting to one would mask integration
   * bugs. Callers must choose explicitly:
   *
   *   - 'workspace-only' — reject consumer @gmail.com; most restrictive.
   *   - 'consumer-only'  — reject Workspace; accept only consumer logins
   *                        with `email_verified === "true"`.
   *   - 'both'           — accept both branches with their respective
   *                        guards; most permissive. Only safe when the
   *                        caller handles the `identityType` field
   *                        downstream and gates privileged actions on
   *                        it.
   */
  mode: 'workspace-only' | 'consumer-only' | 'both';
  /** Required when `mode` includes workspace. Empty array = reject all. */
  workspaceAllowList?: readonly string[];
}

/**
 * PTB-safe. Branches explicitly on `hd` presence. Subject is always
 * `sub` (Google's immutable per-app pairwise identifier), never
 * email. Email is surfaced only when the matching branch's `V(p, k)`
 * passes.
 */
export function trustIdentity(
  claims: GoogleIdTokenPayload,
  config: GoogleTrustConfig,
): TrustVerdict {
  if (!claims.sub) {
    return { ok: false, reason: 'no sub claim — token malformed for Google' };
  }
  const subject = claims.sub;

  const hasHd = typeof claims.hd === 'string' && claims.hd.length > 0;

  if (hasHd) {
    // Workspace branch.
    if (config.mode === 'consumer-only') {
      return { ok: false, reason: 'workspace identity rejected by config' };
    }
    const allowed = config.workspaceAllowList?.includes(claims.hd as string) ?? false;
    if (!allowed) {
      return {
        ok: false,
        reason: `hd "${claims.hd}" not in workspaceAllowList`,
      };
    }
    // Workspace tokens have hd pinned; email is trustworthy as the
    // user's workspace mailbox. We still require email_verified for
    // consistency with Google's own guidance.
    const verified = claims.email_verified === 'true';
    return {
      ok: true,
      subject,
      email: claims.email && verified ? claims.email : null,
      identityType: 'workspace',
    };
  }

  // Consumer branch.
  if (config.mode === 'workspace-only') {
    return { ok: false, reason: 'consumer identity rejected by config' };
  }
  const verified = claims.email_verified === 'true';
  return {
    ok: true,
    subject,
    email: claims.email && verified ? claims.email : null,
    identityType: 'consumer',
  };
}
