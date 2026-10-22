# PTB Report Card

**A measurement framework for OIDC consumer libraries against the
Provider Trust Boundary class of failures.**

Every social-login provider ships a *semantic contract* for the
claims it emits. A consumer-side library that neither enforces the
guards each contract requires nor exposes the raw claims to callers is
PTB-unsafe by construction: no amount of correct downstream code can
repair it.

This repository publishes the methodology for measuring whether a
library's **public API** and **default behavior** uphold those
contracts, together with the pre-release scaffolding needed to apply
the methodology responsibly to a specific library set.

[Methodology (full)](methodology.md) · [Fix patterns](ptb-fix-patterns/)
· [Success metrics](SUCCESS.md) · [Exclusions log](EXCLUSIONS.md)

---

## What this is

A graded report card scored on two orthogonal dimensions per
`(library, provider)` pair:

- **`api_capability`** — can a developer, using *only* the library's
  documented public API, access the raw claims required to enforce the
  provider contract?
- **`default_behavior`** — does the library's own quickstart or
  minimal-example path refuse to issue identity when the provider
  contract is violated?

A library can `PASS` one dimension and `FAIL` the other. The two are
scored and published separately — collapsing them into a single
letter grade hides the distinct failure modes they describe. There
are no letter grades in this methodology, by design.

## What this is not

- Not a vulnerability scanner. The scanner that produced the
  advisories grounding this methodology is a separate project at
  `github.com/61465/identity-trust-hunt`.
- Not a certification. The verdict is a measurement under a declared
  methodology, at a pinned commit SHA, with evidence URLs. It is not
  a seal of approval.
- Not a supply-chain claim. A library can score `PASS` on every
  dimension and still contain unrelated bugs or supply-chain risk.
  Scorecard, Snyk, and similar tools measure different properties.

## Provider contracts covered (v0.1-scope-limited)

Four provider families, with the `V(p, k)` guard set drawn from
each provider's own documentation (see [methodology §4](methodology.md#4-provider-contracts-covered-by-v01-scope-limited)):

| Provider | Primary guard | Source |
|---|---|---|
| Microsoft Entra (Azure) | `xms_edov === true` on `email` | Microsoft Entra docs |
| Apple Sign in with Apple | `email_verified === "true"` *and* `is_private_email !== "true"` for addressable use | Apple SIWA docs + `GHSA-2gvh-5vh3-m2rp` |
| Google OIDC | branch on `hd`: pinned Workspace domain *or* `email_verified === "true"` consumer | Google OIDC docs |
| GitHub OAuth | `/user/emails` only, `primary === true` **and** `verified === true` on the same object | GitHub REST docs + `GHSA-x3fc-mfpw-93f6` |

Section 4.0 of the methodology states the prerequisites common to all
four — signature verification, `iss` / `aud` / `exp` / `nbf`
validation, and nonce binding where applicable. A library that fails
a prerequisite fails every provider contract by inheritance.

## Libraries in scope for v0.1-scope-limited

Three Node.js libraries and two Go libraries, picked for install base
and ecosystem leverage, with no overlap with the authors' own open
disclosures (see [Exclusions log](EXCLUSIONS.md)):

- **Node.js** — `openid-client` (panva), `oidc-client-ts`,
  `@azure/msal-node`.
- **Go** — `coreos/go-oidc`, `zitadel/oidc`.

Each library is privately scanned under the methodology, notified via
`CVD_LETTER.md`, and given a 14-day disclosure window before specific
findings are published. The methodology, the fix patterns, and the
scaffolding are released publicly on day 0; the findings follow on
day 14+.

## Repository layout

```
.
├── methodology.md                           -- the normative spec
├── ptb-fix-patterns/                        -- paired remediation snippets
│   ├── README.md
│   ├── azure/{unsafe,safe,azure.test}.ts
│   ├── apple/{unsafe,safe,apple.test}.ts
│   ├── google/{unsafe,safe,google.test}.ts
│   └── github/{unsafe,safe,github.test}.ts
├── SUCCESS.md                               -- declared KPIs
├── CVD_LETTER.md                            -- 14-day notice template
├── EXCLUSIONS.md                            -- public audit log
├── ptb-report-card.json                     -- empty shell; populated on day-14+
├── badge.svg                                -- static adoption badge
├── .github/ISSUE_TEMPLATE/
│   └── cvd-notification.md                  -- maintainer response template
├── package.json / tsconfig.json             -- for Vitest only
├── LICENSE                                  -- MIT
└── README.md                                -- this file
```

## Running the fix-pattern tests

```
npm install
npx vitest run
```

The test suite pins the predicate behavior for all four providers:
35 tests across 4 files, including regressions on non-conformant
inputs (string "1" where Boolean expected, Boolean `true` where
string "true" expected, GitHub multiple-primary tie-breaking).

The fix patterns are illustrative — they are **not** a drop-in
library. The point is to make the broken shape and the fixed shape
visible side by side so a reviewer can hold them both in their head.

## Status

- **v0.1-scope-limited** — this release. Methodology, fix patterns,
  scaffolding, and exclusions log public. First five libraries under
  private CVD-lite review; specific findings publish on day 14+.
- **v0.2** (planned) — Go variants of the fix patterns, canonical
  fixture tokens, a sibling methodology for OIDC *provider*-side
  issuance (not consumer-side).

## Prior art and delta

Related work with the delta against this methodology is documented in
[§9.3 of the methodology](methodology.md#93-prior-art). The short
form: existing tools (CodeQL, Semgrep, OWASP ASVS, OpenSSF Scorecard,
OpenID Foundation Certification) measure distinct properties, at
different layers, and none produce a per-library `PASS` / `FAIL`
matrix on PTB-specific provider contracts with evidence URLs. This
methodology operates in that gap.

## License

MIT. See [LICENSE](LICENSE).

## Contact

- GitHub: [@61465](https://github.com/61465)
- Email: `abdarahman10555@gmail.com`
- Research: NEXUS Zone Research

Security disclosures about this repository itself (not findings
produced *by* the methodology) go to the email above with the subject
line `PTB Report Card security`.
