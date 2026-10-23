# Exclusions Log

Public audit log of libraries excluded from PTB Report Card scoring,
and the reason for each exclusion. See
[methodology §6.2](methodology.md#62-explicit-exclusions) for the
rationale and
[§6.2.1](methodology.md#621-evaluator-duty-for-third-parties-applying-this-methodology)
for the duty on third-party evaluators.

Format for each entry:

- **Library** — package or repository identifier.
- **Reason** — short, public reason.
- **Public artifact** — the public URL or advisory id that documents
  the reason.
- **Entered scope** — ISO date the library entered the exclusion set.
- **Exit condition** — the publicly observable event that returns the
  library to scope.

Entries are append-only. When a library's exit condition fires, a
new "re-admitted" entry is added rather than mutating the original.

---

## v0.1-scope-limited (opened 2026-10-22)

### `@auth/core` and `next-auth` (Auth.js)

- **Reason**: GitHub primary/verified-pair advisory filed by the
  authors of this methodology; triage ongoing.
- **Public artifact**: [`GHSA-x3fc-mfpw-93f6`](https://github.com/nextauthjs/next-auth/security/advisories)
- **Entered scope**: 2026-10-21.
- **Exit condition**: advisory publishes and the fix lands upstream.

### `@teamhanko/*`

- **Reason**: Microsoft Entra `xms_edov` advisory filed by the authors
  of this methodology; in triage.
- **Public artifact**: [`GHSA-2gvh-5vh3-m2rp`](https://github.com/teamhanko/hanko/security/advisories)
- **Entered scope**: 2026-10-14.
- **Exit condition**: advisory publishes and the fix lands upstream.

### `@supabase/*`

- **Reason**: Microsoft Entra `xms_edov` advisory filed by the authors
  of this methodology; in triage.
- **Public artifact**: [`GHSA-ffp4-94w6-vfgv`](https://github.com/supabase/auth/security/advisories)
- **Entered scope**: 2026-10-14.
- **Exit condition**: advisory publishes and the fix lands upstream.

### `@documenso/*`

- **Reason**: Microsoft Entra `xms_edov` advisory filed by the authors
  of this methodology; in triage.
- **Public artifact**: [`GHSA-hm26-jm32-3wp4`](https://github.com/documenso/documenso/security/advisories)
- **Entered scope**: 2026-10-21.
- **Exit condition**: advisory publishes and the fix lands upstream.

### `casdoor/*`

- **Reason**: Microsoft and GitHub broker-path report filed by the
  authors of this methodology through the vendor's email channel
  (GitHub private advisory reporting disabled on this repository at
  time of filing).
- **Public artifact**: not yet public. The exclusion is disclosed
  here as a conflict-of-interest declaration; the specific finding
  remains private until the vendor publishes.
- **Entered scope**: 2026-10-21.
- **Exit condition**: vendor publishes an advisory, release notes, or
  changelog entry acknowledging the fix, at which point the library
  returns to scope.

### `keycloak/*`

- **Reason**: Microsoft identity broker-path report filed by the
  authors of this methodology through the vendor's email channel
  (Response Team acknowledged 2026-10-21).
- **Public artifact**: not yet public (same shape as `casdoor/*`
  above).
- **Entered scope**: 2026-10-21.
- **Exit condition**: vendor publishes an advisory, release notes, or
  changelog entry acknowledging the fix.

---

## Notes on this list

**This is not a universal blacklist.** It is a disclosure of the
*authors' own* conflicts of interest. A third-party evaluator
applying this methodology to their own evaluation set MUST derive
their exclusion list from **public** advisory information, not from
this file. See
[methodology §6.2.1](methodology.md#621-evaluator-duty-for-third-parties-applying-this-methodology).

**Scope and reach.** Libraries that are commercial, closed-source,
or not identified as OIDC consumers are out of scope entirely
(methodology §6.3) and are not listed here. The exclusion log tracks
only libraries that *would otherwise be in scope* but are temporarily
withheld because of the authors' conflict.

**Append-only.** When a library's exit condition fires, add a new
"re-admitted" subsection below this list rather than editing the
original entry. The audit value of the log is in its history.
