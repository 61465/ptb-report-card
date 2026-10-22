# PTB Report Card — Methodology

**Version 0.1 (scope-limited)** · 2026-10-22

This document specifies how an OIDC consumer library is evaluated against the
**Provider Trust Boundary** (PTB) class of failures. The evaluation produces
a per-dimension `PASS` / `FAIL` matrix for every supported provider the
library claims to handle.

The methodology is deliberately narrow in `v0.1-scope-limited`:

- Five libraries, selected by install-base and ecosystem leverage.
- Four provider families: Microsoft Azure, Apple, Google, GitHub.
- Two orthogonal dimensions per `(library, provider)` pair:
  `api_capability` and `default_behavior`.
- A 14-day private disclosure window to each affected maintainer before the
  specific finding set is published. Public release of this document
  precedes the finding set; the specific `PASS` / `FAIL` matrix lands at
  the end of the window, not today.

> **No letter grades.** Prior drafts proposed a letter grade per library;
> the final design was changed to per-dimension `PASS` / `FAIL` after
> adversarial review flagged defamation risk and dimensional collapse. A
> library can be `PASS` on `api_capability` and `FAIL` on `default_behavior`
> for the same provider — the two readings must not be merged into one
> score.

---

## 1. The Provider Trust Boundary, in one paragraph

Every social-login provider ships a *semantic contract* for the claims it
emits. For a consumer-side library to safely surface an identity derived
from a provider claim `k`, the library must *either* enforce the guards
`V(provider, k)` required by that contract *or* expose `k` and its sibling
claims to the caller in a way that lets the caller enforce them. A library
that neither enforces the guards nor exposes the raw claims is PTB-unsafe
by construction: no amount of correct downstream code can repair it.

The predicate used throughout this methodology is drawn from
`identity-trust-hunt`:

> For a call site `c` consuming claim `k` from provider `p`:
> `c is PTB-unsafe ⟺ ∃ v ∈ V(p, k) such that v ∉ guards(c)`

`V(p, k)` for the four provider families covered by `v0.1-scope-limited` is
enumerated in Section 4.

---

## 2. The two dimensions

A library is evaluated along two independent dimensions, scored separately.
Collapsing them into a single grade hides the distinct failure modes they
describe.

### 2.1 `api_capability`

> Using **only** the library's documented public API, can a consuming
> developer access the raw provider claims they need to enforce `V(p, k)`?

`api_capability` is a **library-design** property. It is scored by reading
the library's public API surface and documentation, not its runtime
behavior. Every verdict is backed by at least one evidence URL to a
pinned commit SHA (Section 3).

**`api_capability: PASS` when the library's documented public API
provides either:**

- (a) a method returning the parsed `id_token` payload as an unmodified
  `Record` / `Map` / object, where keys preserve the exact
  provider-emitted names (e.g., `xms_edov`, `is_private_email`,
  `email_verified`); or
- (b) a type-safe accessor named with the exact provider claim identifier
  (e.g., `.xmsEdov`, `getXmsEdov()`, `claim_xms_edov()`), exposed as:
    - a `pub` symbol in a non-`private` module (Rust),
    - an exported identifier in a non-`/internal/` package (Go),
    - a name present in the library's `index.d.ts` and in the
      `package.json` `"exports"` field (JS / TS),
    - a name listed in `__all__` or in the library's public module
      (Python).

**`api_capability: FAIL` when the library:**

- (c) returns only a normalized identity object (e.g.,
  `{ sub, email, name, picture }`) with no documented public method
  returning the raw claims object; or
- (d) exposes raw claims only via identifiers that are:
    - prefixed with `_` or `__`, or
    - annotated `@internal`, `@deprecated`, or `@experimental` in the
      library's typing or published JSDoc, or
    - excluded from the library's `package.json` `"exports"` field, or
    - placed in a module path containing `/internal/` (Go) or
      `_private.py` (Python); or
- (e) exposes the raw `id_token` only as an opaque string and provides
  no public method that both parses the payload *and* verifies the
  signature, forcing every consumer to reimplement signature
  verification.

The criteria above are intended to be **machine-checkable**: an evaluator
should be able to validate a verdict against a library by inspecting its
public type declarations and `exports` manifest without running the
code.

### 2.2 `default_behavior`

> With the library configured per the "quickstart" or "minimal example"
> path from its own documentation, is identity derived from provider
> claims **without** applying `V(p, k)`?

A dimension passes when:

- (a) the library refuses to issue identity by default and surfaces an
  error if no verification policy is configured; or
- (b) the library applies the full `V(p, k)` contract by default and
  rejects tokens that fail it.

A dimension fails when:

- (c) the quickstart produces a working "logged-in" state based on
  `email`, `sub`, or similar without enforcing any `V(p, k)`; or
- (d) the library documents the guards only in an advanced section the
  quickstart does not link to; or
- (e) the library emits a warning only (not an error) when guards are
  missing.

`default_behavior` is a **runtime-defaults** property. It is scored by
following the library's own quickstart, with no customization, against a
fixture token that would fail `V(p, k)`.

### 2.3 Why the split matters

A library can be `api_capability: PASS` and `default_behavior: FAIL` — this
is the "foot-gun" shape: the primitives are there, but the on-ramp invites
unsafe use. It can also be `api_capability: FAIL` and
`default_behavior: PASS` for a narrow built-in provider list — safe for
providers the library hardcodes, unsafe the moment a developer wires an
unknown provider in. Both shapes have shipped real vulnerabilities in the
past. Collapsing them loses that information.

### 2.4 Fixture tokens for `default_behavior` testing

`v0.1-scope-limited` does not specify a canonical fixture-token set.
For first-pass evaluations in this release, fixture tokens are derived
from each provider's own public documentation samples, with the
sensitive claim modified to a value that fails the `V(p, k)` contract
in Section 4. Each `default_behavior: FAIL` verdict records the
fixture used alongside its evidence URL. A canonical, signed,
reusable fixture-token set is scheduled for `methodology v0.2`.

---

## 3. Evidence requirements

Every `PASS` or `FAIL` is accompanied by one or more **evidence URLs** that
point to a specific line (or line range) in the library's source tree at a
pinned commit SHA. A finding without an evidence URL is not published.

Evidence URL shape:
`https://github.com/<org>/<repo>/blob/<sha>/<path>#L<start>-L<end>`

Each `(library, provider, dimension)` triple in the report card has:

- the dimension verdict (`PASS` / `FAIL`),
- 1–3 evidence URLs,
- a one-sentence quotation or paraphrase of the specific code or doc that
  earned the verdict,
- the pinned commit SHA.

---

## 4. Provider contracts covered by `v0.1-scope-limited`

For each of the four provider families, the `V(p, k)` set is specified below.
The contracts are drawn from provider documentation and from the four
accepted GHSAs referenced in Section 7. Contracts for Discord, LinkedIn,
Twitter/X, and Facebook are supported by `identity-trust-hunt` but are not
in scope for this report card version.

### 4.0 Prerequisites common to every provider contract

Every `V(p, k)` set defined in Sections 4.1 – 4.4 is evaluated **only
after** the base ID-token invariants hold. A library that passes a
provider-specific claim check while failing any of the base
invariants is PTB-unsafe for every provider in scope. The base
invariants are:

- **Signature verification against the correct JWKS.** The library
  retrieves the issuer's current signing keys from the provider's
  OpenID discovery document and verifies the token's signature using
  one of those keys. A library that accepts tokens without signature
  verification, or that uses `alg: none`, or that pins to a single
  cached key without rotation handling, fails every provider
  contract.
- **`iss` claim validation.** The `iss` claim must match the expected
  issuer URI exactly (including tenant for Azure, where applicable).
  A library that reads `iss` only for display or that treats mismatch
  as a warning fails every provider contract.
- **`aud` claim validation.** The `aud` claim (or `aud` array) must
  contain the library caller's configured client ID. A library that
  accepts tokens with a mismatched or absent `aud` fails every
  provider contract.
- **`exp` and `nbf` claim validation.** The library must reject
  tokens where `exp` is in the past or `nbf` is in the future, with
  configurable clock skew bounded by the OpenID Connect
  Core 1.0 recommendations.
- **`nonce` validation** where the library initiates the
  authorization request. The library must bind the authorization
  request `nonce` to the resulting token's `nonce` claim and reject
  mismatches.

If any of the above is `FAIL`, the library's row for **every**
provider in the scoring matrix (Section 5) is annotated
`prerequisite_failure` and the provider-specific dimensions are
recorded as `FAIL` by inheritance. This prevents a library from
earning a `PASS` on a specific claim check while silently failing to
verify signatures.

### 4.1 Microsoft Azure (Entra ID) OIDC

`V(azure, email)` = { `xms_edov === true` present in the ID token
payload }

- Microsoft specifies `xms_edov` as a **Boolean** optional claim
  (not a string `"1"`). The library must compare against JSON `true`,
  not the string `"1"` or the integer `1`. [1]
- The claim is only present when the email is from a Microsoft account
  (MSA), a Google account, or an OTP-authenticated account. **Facebook
  and SAML / WS-Fed accounts never emit `xms_edov`**, which means
  `email` from those identity sources can never be domain-verified by
  Microsoft and is PTB-unsafe in every case. [1]
- Microsoft's own authoritative guidance on the base `email` claim is:
  > "Never use `email` or `upn` claim values to store or determine
  > whether the user in an access token should have access to data." [2]
- The missing-`xms_edov` path is the nOAuth bug class (Descope, 2024;
  `GHSA-ffp4-94w6-vfgv`; `GHSA-2gvh-5vh3-m2rp`).

**Sources**:

- [1] *Optional claims reference — Microsoft Entra*, `xms_edov` row.
  `https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference`
- [2] *ID token claims reference — Microsoft Entra*, Payload claims
  warning on `email` and `upn`.
  `https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference`

### 4.2 Apple Sign in with Apple

`V(apple, email)` = { `email_verified === "true"` (**string**
comparison), `is_private_email !== "true"` for any decision that treats
the email as an owned, addressable mailbox (recovery, cross-session
linking, deduplication) }

- Apple returns `email_verified` and `is_private_email` as **JSON
  string literals** (`"true"` / `"false"`), not JSON booleans. Libraries
  that compare with `=== true` (boolean) will treat verified emails as
  unverified — the inverse of the intended guard. [1]
- A consumer that treats a `@privaterelay.appleid.com` address as an
  owned mailbox for recovery or linking is PTB-unsafe. The private-
  relay address is a routing alias, not an authenticated mailbox.
- The claim field is only meaningful when evaluated together with
  `is_private_email` — the `email_verified` claim alone is not
  sufficient.

**Sources**:

- [1] Empirical confirmation via `GHSA-2gvh-5vh3-m2rp` (Hanko, filed
  2026-10-14). The Hanko fix PR documents the string type explicitly.
  The Apple Sign in with Apple REST API documentation is at
  `https://developer.apple.com/documentation/signinwithapplerestapi/`
  (per-field type documented there).

### 4.3 Google OIDC

The Google contract **branches on account type**. The `hd` claim is
present only for Google Workspace accounts — consumer `@gmail.com`
accounts omit it entirely. A library whose logic assumes `hd` is
universally present will fail-open on every consumer login. [1]

**Branch 1 — Workspace identity (`hd` present in token)**:

`V(google, hd)` = { `hd` present AND `hd` pinned to a configured
expected domain OR matched against a documented allow-list }

- Trusting `hd` without pinning permits any Workspace tenant to be
  accepted. Pinning is required.

**Branch 2 — Consumer identity (`hd` absent in token)**:

`V(google, email)` = { `email_verified === "true"` (**string**
comparison; Google documents the example payload with
`"email_verified": "true"` as a string literal) [1] }

**Combined rule**:

Any library that advertises both Workspace and consumer support must
expose and apply both branches, OR must document that only one
population is supported. A library that applies Branch 1 to all tokens
(treating missing `hd` as a verified consumer login) is PTB-unsafe for
every consumer-side login path.

**Sources**:

- [1] *OpenID Connect — Google Identity*, ID token payload section.
  `https://developers.google.com/identity/openid-connect/openid-connect`
  Quote: *"Provided only if the user belongs to a Google Cloud
  organization. The absence of this claim indicates that the account
  does not belong to a Google hosted domain."*

### 4.4 GitHub OAuth

`V(github, email)` = { the email list was fetched from `/user/emails`
AND the library selected the email object where both `primary === true`
**AND** `verified === true` on the **same** object }

Explicit sub-rules:

- The library must **not** read the `email` field from `/user`. That
  field is a single string with no verification signal attached, and
  may be whatever the user set as their public profile email. [1]
- The library **must** call `/user/emails` separately. The required
  OAuth scope is **`user:email`** (not `read:user`, which does not
  grant access to the private `/user/emails` list). The library then
  selects on the pair `(primary, verified)` on the **same** array
  element. A library that picks the first `verified: true` element
  from the array regardless of `primary` is PTB-unsafe. [1]
- **The order of items in the `/user/emails` response array is not
  documented as stable.** Any logic that depends on array position
  (first-element heuristic, "verified wins by position") is
  PTB-unsafe. [1]
- `GHSA-x3fc-mfpw-93f6` documents a shipped instance of the
  `primary` / `verified` conflation in Auth.js.

**Sources**:

- [1] *REST API endpoints for emails*, GitHub Docs.
  `https://docs.github.com/en/rest/users/emails`
  Response schema: array of objects, each with `email`, `primary`
  (boolean), `verified` (boolean), `visibility`. The docs do not
  specify a stable sort order.

---

## 5. The scoring matrix

For each library in scope, the following matrix is produced:

| Provider | api_capability | default_behavior | evidence |
|---|---|---|---|
| Microsoft Azure | PASS / FAIL / N/A | PASS / FAIL / N/A | 1–3 URLs |
| Apple | PASS / FAIL / N/A | PASS / FAIL / N/A | 1–3 URLs |
| Google | PASS / FAIL / N/A | PASS / FAIL / N/A | 1–3 URLs |
| GitHub | PASS / FAIL / N/A | PASS / FAIL / N/A | 1–3 URLs |

`N/A` is used when the library documents no support for that provider.
A library that advertises generic OIDC support but ships no
provider-specific guard logic is scored on the `generic` row (not shown
in `v0.1-scope-limited`) and will be revisited in a later methodology
revision.

---

## 6. Scope and exclusions

### 6.1 In scope (v0.1-scope-limited)

- 5 libraries total: 3 Node.js + 2 Go.
- 4 provider families: Microsoft Azure, Apple, Google, GitHub.
- 2 dimensions per `(library, provider)` pair.
- Static review of the library's public API, source, and quickstart
  documentation. One fixture-token runtime test per provider for the
  `default_behavior` dimension (see Section 2.4).
- 20-minute per-library static review budget for the first-pass
  verdict. Runtime fixture tests are not time-budgeted and may extend
  beyond this window before the finding set is released.

The five libraries in scope are:

**Node.js** (chosen by install base, no overlap with Section 6.2
exclusions):

| Library | Typical weekly installs | Role in the ecosystem |
|---|---|---|
| `openid-client` (panva) | ≈ 3 M | de facto generic Node.js OIDC client |
| `oidc-client-ts` | ≈ 400 K | SPA-oriented OIDC consumer |
| `@azure/msal-node` | ≈ 500 K | Microsoft's official Azure client library |

**Go** (chosen by ecosystem leverage, no overlap with Section 6.2):

| Library | Role in the ecosystem |
|---|---|
| `coreos/go-oidc` | depended on by Kubernetes, Istio, and most enterprise OIDC consumers in Go |
| `zitadel/oidc` | comprehensive OIDC consumer-and-provider stack in Go |

Install counts are approximate at the time of writing and are not used
in the scoring. The list is reviewed each methodology revision.

### 6.2 Explicit exclusions

The following libraries are **excluded** from `v0.1-scope-limited`
because the methodology's authors have active responsible-disclosure
processes with them. Including them in the evaluation set would create
a conflict of interest. Each exclusion carries a short, public reason:

| Library | Reason | Public artifact |
|---|---|---|
| `@auth/core`, `next-auth` (Auth.js) | advisory in triage | `GHSA-x3fc-mfpw-93f6` |
| `@teamhanko/*` | advisory accepted | `GHSA-2gvh-5vh3-m2rp` |
| `@supabase/*` | advisory accepted | `GHSA-ffp4-94w6-vfgv` |
| `@documenso/*` | advisory in triage | `GHSA-hm26-jm32-3wp4` |
| `casdoor/*` | vendor-channel disclosure open | reported 2026-10-21 |
| `keycloak/*` | vendor-channel disclosure acknowledged | ack'd 2026-10-21 |

The authors declare the conflict explicitly here; the exclusion is
documented in public, in this file, for the duration of each respective
disclosure window. Each library returns to scope once its advisory
publishes and the fix lands upstream.

### 6.2.1 Evaluator duty (for third parties applying this methodology)

Independent evaluators applying this methodology to their own evaluation
set:

- **MUST** base exclusion decisions **only** on public advisory
  information (GHSA, CVE, or a documented vendor security bulletin at
  a public URL). The exclusion list in Section 6.2 is a *disclosure of
  the methodology authors' conflicts*, not a universal blacklist.
- **MUST NOT** seek or act on non-public vulnerability information in
  their exclusion decisions. An evaluator who learns of a private
  advisory from a channel outside this methodology must either (i)
  recuse from scoring the affected library, or (ii) wait until the
  advisory becomes public.
- **SHOULD** publish each exclusion decision in a public audit log in
  the evaluator's own repository, with the same shape as `EXCLUSIONS.md`
  in this repository.

This methodology repository ships `EXCLUSIONS.md` as the public audit
log for the authors' own exclusion decisions. It is updated whenever a
library enters or leaves the exclusion set.

### 6.3 Not in scope at all

- Non-OIDC auth libraries (e.g., bespoke token issuers).
- Libraries that are the OIDC *provider*, not the consumer. A sibling
  methodology for provider-side issuance is a separate document, not
  this one.
- Private commercial libraries without a public source tree.

---

## 7. Coordinated Vulnerability Disclosure (CVD-lite)

The specific `(library, provider, dimension) → FAIL` findings produced by
this methodology are shared with each affected library's maintainers
through a 14-day private notice before the finding set is published.

The notice includes:

- the dimension verdict and evidence URL at the pinned commit SHA,
- the specific `V(p, k)` contract the library is scored against,
- a reference to this methodology document,
- a copy-paste remediation pattern from `ptb-fix-patterns/`,
- a 14-day window before public release, with an extension available on
  request for maintainers who confirm active remediation work.

A library that remediates within the window is published with the fixed
state. A library that does not respond is published with its original
verdict and an "unresponded" annotation.

The CVD-lite letter template is at `CVD_LETTER.md`.

---

## 8. Public artifacts

The following files are released under this methodology:

- `methodology.md` — this document.
- `ptb-fix-patterns/<provider>/{unsafe,safe}.ts` — paired TypeScript
  snippets demonstrating the failure mode and the remediation for each
  provider. Go variants are scheduled for `methodology v0.2`; the
  TypeScript variants carry the contract shape faithfully for both
  Node.js and Go consumers to port from.
- `ptb-fix-patterns/<provider>/<provider>.test.ts` — Vitest cases
  pinning the predicate behavior on both branches of the contract.
- `SUCCESS.md` — pre-declared success metrics for the v0.1 release.
- `CVD_LETTER.md` — the CVD-lite notice template.
- `.github/ISSUE_TEMPLATE/cvd-notification.md` — an issue template a
  maintainer may use to acknowledge or dispute a finding.
- `EXCLUSIONS.md` — the public audit log of libraries excluded from
  scoring and the reason for each exclusion (Section 6.2).
- `ptb-report-card.json` — the structured report. Shipped as an empty
  shell in the release accompanying this methodology; the populated
  version lands at the end of the CVD-lite window.
- `badge.svg` — a static badge adoptable by libraries that reach
  `PASS` on both dimensions for every provider they claim to support.

The structure is deliberately boring. Interesting content lives in the
contracts, the evidence URLs, and the fix patterns.

---

## 9. References

### 9.1 Accepted public advisories grounding the methodology

- `GHSA-ffp4-94w6-vfgv` — Supabase, Microsoft Azure `xms_edov` miss,
  CVSS 9.8, accepted 2026-10-14.
- `GHSA-2gvh-5vh3-m2rp` — Hanko, Microsoft Azure `xms_edov` miss,
  CVSS 9.8, accepted 2026-10-14.
- `GHSA-hm26-jm32-3wp4` — Documenso, Critical, in triage as of
  2026-10-21.
- `GHSA-x3fc-mfpw-93f6` — Auth.js, GitHub `primary` vs `verified`
  ordering, High, in triage as of 2026-10-21.

### 9.2 Vendor-email channel advisories

- Keycloak — Microsoft identity provider broker path, 9.4, acknowledged
  2026-10-21.
- Casdoor — Microsoft and GitHub broker paths, 9.4 / 8.0, reported
  2026-10-21.

### 9.3 Prior art

Closest related projects, with the delta against this methodology
noted inline:

- **`identity-trust-hunt`** — the scanner that discovered the four
  accepted advisories grounding this methodology; public under MIT at
  `https://github.com/61465/identity-trust-hunt`. Delta: `identity-
  trust-hunt` scans **consumer applications** for PTB-unsafe call
  sites. This methodology scores **consumer libraries** on whether
  their public API lets a correct application be written at all. The
  two are complementary.
- **OpenSSF Scorecard** — an open-source project-health scoring tool
  that produces repo-level scores based on signals such as CI, code
  review, SAST, signed releases, and token permissions. Delta: Scorecard
  is **domain-agnostic**; it does not understand OIDC-specific
  contracts and does not score API design against a provider claim
  set. This methodology operates **below** Scorecard — a library can
  score high on Scorecard and still fail `V(p, k)` here, because the
  two measure disjoint properties. A future revision may expose this
  methodology's verdicts in a format Scorecard can consume as an
  external check.
- **OpenID Foundation Certification** — provider-side conformance
  tests for OIDC. Delta: certification tests cover **protocol
  compliance**, not security guards. A certified provider can still
  emit claims that a non-compliant consumer trusts incorrectly; this
  methodology scores that consumer-side gap.
- **OWASP ASVS (Authentication section)** — a verification-standard
  checklist. Delta: ASVS is a **requirements list**, not a
  reproducible per-library scoring. This methodology turns a subset
  of ASVS's authentication intent into evidence-anchored library
  verdicts.
- **CodeQL and Semgrep rule packs for OAuth / OIDC** — static-analysis
  rules targeting known OAuth bugs. Delta: both operate on
  **application code**, not on library API surface. A CodeQL rule
  catches a specific misuse at a call site; this methodology catches
  the library-design condition that makes correct use *impossible*.
- **Descope, 2024** — original public writeup of the Microsoft
  nOAuth pattern. Delta: Descope framed the problem; this methodology
  provides the measurement framework.
- **Fett, Küsters, and Schmitz, 2016** — *A Comprehensive Formal
  Security Analysis of OAuth 2.0.* Delta: formal verification of the
  **protocol**; this methodology scores concrete **library
  implementations** against a subset of the trust contracts the
  formal work identifies.

### 9.4 Changes against prior drafts

**Design changes** (adversarial review before publication):

- Letter grades were replaced with per-dimension `PASS` / `FAIL` after
  review flagged defamation risk and dimensional collapse.
- `api_capability` and `default_behavior` are now scored and published
  separately after review noted that API-only scoring misses runtime
  defaults.
- A 14-day CVD-lite window was added before the specific finding set is
  published, after review flagged the risk of simultaneous public
  disclosure to 5 libraries without maintainer notice.
- The six libraries listed in Section 6.2 were moved to explicit
  exclusion after review flagged contamination with the authors' own
  active advisories; Section 6.2.1 was added to make the authors'
  conflict of interest explicit and to constrain how third-party
  evaluators handle private information.

**Provider-contract corrections** (fact-check against provider docs):

- Section 4.1 (Azure): `xms_edov` is specified in Microsoft Entra docs
  as a **Boolean** optional claim. An earlier draft compared with the
  string `"1"`; the normative comparison is `xms_edov === true`. The
  non-emission of `xms_edov` for Facebook and SAML / WS-Fed accounts
  was added as a distinct PTB-unsafe condition.
- Section 4.2 (Apple): `email_verified` and `is_private_email` are
  emitted as **JSON string literals**, not JSON booleans. An earlier
  draft wrote `email_verified == true`; the normative comparison is
  `email_verified === "true"`. The empirical anchor is
  `GHSA-2gvh-5vh3-m2rp` (Hanko).
- Section 4.3 (Google): the `hd` claim is **absent** for consumer
  `@gmail.com` accounts. An earlier draft treated `hd` as universally
  present, which would have scored every consumer-side scan as
  "unpinned `hd`". The contract now branches on account type with a
  distinct `email_verified === "true"` requirement for consumer-only
  identities.
- Section 4.4 (GitHub): the `/user/emails` response array has **no
  documented stable order**, and `primary` is independent of
  `verified`. The normative selection is now `primary === true AND
  verified === true` on the **same** array element, with explicit
  warnings against reading `email` from `/user` and against
  array-position heuristics.
- Section 2.1 (`api_capability`): subjective criteria ("extras bag",
  "may change, not for production use") were replaced with
  machine-checkable criteria tied to per-language stability signals
  (`package.json` `"exports"`, Go `/internal/`, Rust `pub`, Python
  `__all__`, JSDoc `@internal` / `@deprecated` / `@experimental`).
- Section 2.4 was added to document that canonical fixture tokens are
  deferred to `methodology v0.2`.
