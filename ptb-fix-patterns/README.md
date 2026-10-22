# PTB Fix Patterns

Paired `unsafe.ts` / `safe.ts` snippets for each provider family covered
by `methodology.md`. Each pair demonstrates:

- **`unsafe.ts`** — a plausible-looking consumer that fails the
  provider's `V(p, k)` contract. These are **not** copy-paste
  production code; they are illustrative counter-examples anchored to
  real failure modes in the four accepted GHSAs.
- **`safe.ts`** — a consumer that passes the same contract. These
  **are** reasonable starting points for production code, with the
  caveat that the surrounding token-validation prerequisites
  (Section 4.0 of `methodology.md`) are assumed to have been performed
  by the caller before the snippet is reached.

Each pair follows the same shape:

- A top-of-file comment stating the contract reference
  (e.g. `methodology.md §4.1`), the GHSA that empirically grounds the
  pattern, and the citation to the provider's own documentation.
- Explicit TypeScript types for the token payload — no `any` escapes.
- A single predicate function `trustIdentity(claims)` returning
  `{ ok: true, email, subject } | { ok: false, reason }`.
- A matching `.test.ts` that proves the predicate accepts and rejects
  the right inputs.

The snippets are intentionally minimal — each is one function in one
file. They are not a drop-in library. The point is to make the fix
visible at a glance so a reviewer can hold the broken and fixed shape
in their head side by side.

## Running the tests

```
npm install -D vitest typescript
npx vitest run
```

Each test file self-contains its fixture tokens; there is no network
call and no provider SDK dependency.

## Scope note

These snippets are **not** evidence under the methodology. Evidence
under the methodology is a URL to a pinned commit SHA in the library
under evaluation. These snippets are *remediation patterns* — the
copy-paste shape a maintainer can start from after reading their own
report card entry.
