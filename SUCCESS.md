# Success Metrics — PTB Report Card v0.1-scope-limited

This file declares, **before** the public release, what success looks
like for `v0.1-scope-limited`. The purpose is to give the methodology
a falsifiable goalpost: if the KPIs below are not met within the
stated windows, the next revision (`v0.2`) must address the gap or
retire the project.

Metrics are grouped by what they measure.

---

## 1. Methodology adoption

A methodology that does not change behavior is a document. These
metrics track whether anyone outside this repository applies the
methodology to a library they care about.

- **Issues opened by library maintainers** referencing the
  methodology, the report card, or a specific `V(p, k)` contract
  (across *any* repo, not only the libraries in scope).
  - **Target by day 60**: ≥ 3
  - **Measurement**: GitHub cross-reference search on repo URL and
    on the strings "PTB-safe", "PTB-unsafe", "api_capability",
    "default_behavior" where the author is not `61465`.
- **Independent evaluators publishing their own report card** using
  the methodology for a library not in `v0.1`'s scope.
  - **Target by day 180**: ≥ 1
  - **Measurement**: GitHub repo search for files named
    `ptb-report-card.json` or imports from this methodology URL.

## 2. Downstream fixes

A finding that does not shift behavior upstream is a complaint. These
metrics track whether maintainers accept and act on findings.

- **Libraries updating default behavior** such that a repeat scan
  moves at least one dimension from `FAIL` to `PASS`.
  - **Target among the 5 libraries in scope, by day 90**: ≥ 2
  - **Measurement**: re-score each library at day 30, day 60,
    day 90. The score deltas are logged in a public
    `ptb-report-card-history.json` on this repository.
- **Libraries documenting the `V(p, k)` guard requirement** in their
  own user-facing docs (changelog, security considerations, migration
  guide) even if no code changed.
  - **Target among the 5 libraries in scope, by day 90**: ≥ 3
  - **Measurement**: documentation diff from day 0 against day 90.

## 3. Attention

A paper nobody reads cannot shift the industry. These metrics track
reach without claiming they measure impact.

- **Unique visitors** to the repository landing page or the field
  report page.
  - **Target by day 30**: ≥ 500 unique sessions.
  - **Measurement**: GitHub repo traffic insights.
- **GitHub stars** on this repository.
  - **Target by day 60**: ≥ 50
  - **Note**: stars are a weak signal; included only to make the
    attention floor explicit.
- **References from a third-party publication** (blog post, academic
  paper, conference talk, newsletter, podcast) that cites the
  methodology by name.
  - **Target by day 90**: ≥ 1

## 4. Discipline (negative KPIs)

These metrics are inverted — "lower is better".

- **Legal letters received** (cease-and-desist, DMCA, lawsuit
  threat).
  - **Target by day 180**: 0.
  - If a letter arrives at any point, the project enters a 48h
    freeze pending counsel.
- **Public corrections to the methodology** issued after
  publication, where the correction fixes a factual error in a
  provider contract (`V(p, k)`) that was already supposed to be
  grounded in provider docs.
  - **Target through day 180**: ≤ 1.
  - More than one such correction indicates the pre-publication
    review process was insufficient and the next revision must add
    a second independent reviewer before publication.
- **Retraction of a specific library's `(dimension, verdict)`**
  after publication because the evidence URL no longer supports the
  verdict (library updated out from under the pin, or evaluator
  misread the source).
  - **Target through day 180**: 0.
  - A retraction is a measurement-side failure. Each one triggers a
    public post-mortem.

---

## Review schedule

Metrics are re-measured and the deltas committed to this repository
on the following cadence:

- Day 30 — adoption and attention snapshot.
- Day 60 — all of §1 and §3; §2 preview.
- Day 90 — full re-score of §1 – §3.
- Day 180 — v0.2 go / no-go decision based on §4 above all.

Each snapshot is a commit titled `success(day-N): <summary>`.
