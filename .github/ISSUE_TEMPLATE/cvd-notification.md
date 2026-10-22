---
name: CVD notification response
about: Maintainer response to a PTB Report Card finding on your library
title: "[CVD] <library-name> @ <commit-sha> — <acknowledgement | dispute | extension>"
labels: ["cvd"]
---

<!--
Thank you for engaging with the PTB Report Card process. Pick ONE of
the response types below and delete the others. Short is fine; the
intent is to make the state of each disclosure clearly recorded in
public.

If you are not the maintainer: please leave this template for the
maintainer to use. Report-card queries that are not CVD responses
belong in a plain issue, not this template.
-->

## Which library is this about?

- **Library name**:
- **Repository URL**:
- **Pinned commit SHA from the notice**:
- **Date the notice was received**:

## Response type

Pick one:

### [ ] Acknowledgement

I confirm receipt of the finding(s). I plan to:

- [ ] Fix and ship within the 14-day window.
- [ ] Fix and ship within an extension (see below).
- [ ] Not act on the finding(s). Reason:

### [ ] Dispute

I believe at least one finding is incorrect. Specifically:

- Finding: <provider / dimension / verdict as recorded in the notice>
- Where I think the evaluation is wrong: <link to source line(s) that
  contradict the finding>
- Why: <one or two sentences>

### [ ] Request an extension

I need an extension to ship the fix. Requested window:

- Desired new window close date (ISO):
- Realistic ship date (ISO):
- One-line rationale:

## Optional context

Anything else relevant to this disclosure — related upstream work,
cross-advisories, downstream dependencies — that would help us record
the right state in the public report.

---

<sub>By submitting a response via this template you are not waiving
any legal right. The methodology authors publish the response text
you submit on this issue, together with the final verdict at the end
of the window, as part of the public audit trail.</sub>
