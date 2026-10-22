# CVD-Lite Notification Letter (template)

This template is sent to the maintainer(s) of a library the moment the
`v0.1-scope-limited` evaluation of that library produces its first
`FAIL` verdict against any `(provider, dimension)` pair. The clock on
the 14-day disclosure window starts on the send date.

The notice is deliberately short. Maintainer time is scarce; the
details live in the methodology and in the evidence URL.

---

## Fields to fill before sending

- `{{library}}` — the library's canonical name (e.g., `openid-client`).
- `{{maintainer_handle}}` — maintainer's GitHub handle or security
  contact. Prefer the published `SECURITY.md` channel over an
  individual's inbox.
- `{{commit_sha}}` — the exact SHA this evaluation pins against.
- `{{findings_table}}` — the per-`(provider, dimension)` matrix for
  this library.
- `{{window_end}}` — the ISO date 14 calendar days after send.
- `{{send_date}}` — the ISO date the notice is sent.

---

## Template

**Subject**: PTB Report Card finding — {{library}} @ {{commit_sha}}

Hello {{maintainer_handle}},

A static review of `{{library}}` against the Provider Trust Boundary
Report Card methodology (`v0.1-scope-limited`) returned one or more
`FAIL` verdicts on `{{library}}` at commit `{{commit_sha}}`. The
findings and their evidence URLs are below.

**Methodology**:
https://github.com/61465/ptb-report-card/blob/main/methodology.md

**Findings for `{{library}}` at `{{commit_sha}}`**:

{{findings_table}}

**Disclosure window**

Public release of this finding set is scheduled for `{{window_end}}`
(14 calendar days from this notice). The remediation patterns in
https://github.com/61465/ptb-report-card/tree/main/ptb-fix-patterns
cover the four provider contracts.

Options available to you during the window:

1. **Fix and ship**. If you cut a release that moves the dimension
   from `FAIL` to `PASS` before the window closes, the published
   report will record the current state at window close, not the
   notification state.
2. **Dispute**. If a finding is incorrect — misreading of the
   source, out-of-date SHA, or a factual error in the methodology
   itself — reply here or open an issue at
   https://github.com/61465/ptb-report-card/issues/new?template=cvd-notification.md
   with the specific line of evidence you disagree with.
3. **Request an extension**. If active remediation work is in
   progress but will not complete by `{{window_end}}`, reply with
   the realistic ship date. Extensions of up to 30 additional days
   are granted on request.
4. **Decline to respond**. If no reply arrives by `{{window_end}}`,
   the finding set publishes with the state at notification time
   and an "unresponded" annotation. The annotation does not imply
   negligence; it records only that we did not receive confirmation.

**Scope note**

This is a methodology-level evaluation of `{{library}}`'s public API
and documented default behavior, not an application-level penetration
test and not a supply-chain claim. The methodology makes a specific
measurement under a specific set of criteria, documented in full in
the link above.

Thanks for your time on this.

Abdalrahman Mohamed
NEXUS Zone Research
abdarahman10555@gmail.com
Sent {{send_date}}

---

## Register sweep before send

Before pasting this template into email, run through the checklist:

- No `Happy to`, `appreciate`, `In this post`, or `We'd love to`
  phrases.
- No decorative em-dashes outside natural apposition.
- Subject carries both the library name and the pinned SHA.
- The 14-day end date is a weekday that does not fall on a provider
  release or major holiday.
- The methodology URL and the issue template URL both resolve.
- The `{{findings_table}}` block has at least one row and every row
  has a resolvable evidence URL.
