{{TITLE}}

> {{SEVERITY_EMOJI}} **{{SEVERITY_LABEL}}** · Detected by `/full-repo-review` on `{{RUN_DATE}}` · Perspectives: {{PERSPECTIVES}}

## Summary

{{SUMMARY}}

## Affected files

{{AFFECTED_FILES}}

## Why it matters

{{IMPACT}}

## Suggested fix

{{SUGGESTED_FIX}}

## Effort estimate

{{EFFORT_ESTIMATE}}

---

<details>
<summary>Run metadata</summary>

- **Run ID:** `{{RUN_ID}}`
- **Stable ID:** `{{STABLE_ID}}` ← used to dedup against future runs; do not edit
- **Baseline:** `{{BASELINE_REF}}`
- **HEAD:** `{{HEAD_SHA}}`
- **Tier:** {{TIER}}

To prevent this finding from being re-reported, either:
- Resolve and close this issue (recommended), or
- Close as `wontfix` (future runs will skip), or
- Add the matching pattern to `.review-squad-ignore` at the repo root.

</details>
