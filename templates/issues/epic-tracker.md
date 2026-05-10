📋 Repo health check — {{RUN_DATE}}

> Tracker issue for the `/full-repo-review` run on `{{HEAD_SHA_SHORT}}`. Each finding lives as a separate issue (linked below). Close this when all child issues are addressed or triaged.

## Scope

- **Tier:** {{TIER}}
- **Baseline:** `{{BASELINE_REF}}` ({{BASELINE_DESCRIPTION}})
- **HEAD:** `{{HEAD_SHA}}` (branch `{{HEAD_BRANCH}}`)
- **Files analyzed:** {{FILES_ANALYZED}} (selected via {{SELECTION_STRATEGY}})
- **Perspectives ran:** {{PERSPECTIVES_RAN}}

## Findings summary

🔴 **{{COUNT_CRITICAL}} Critical** · 🟠 **{{COUNT_MAJOR}} Major** · 🟡 **{{COUNT_MINOR}} Minor** · 🔵 **{{COUNT_SUGGESTION}} Suggestion** · 🚨 **{{COUNT_BREAKING}} Breaking changes**

{{CHILD_ISSUES_BY_PERSPECTIVE}}

## Breaking changes (always priority)

{{BREAKING_CHANGES_LIST}}

## What was good

{{POSITIVES}}

## Run metadata

- **Run ID:** `{{RUN_ID}}` ← shared by all child issues from this run
- **Started:** {{RUN_STARTED}}
- **Duration:** {{DURATION}}
- **Estimated cost:** ~${{API_COST}} USD ({{TOTAL_TOKENS}} tokens, {{MODEL_NAME}})
- **Triggered by:** @{{TRIGGERED_BY}}

## Re-running

Re-run with `/full-repo-review {{OWNER}}/{{REPO}}` (will dedup against this tracker via Run ID and Stable IDs in child issues).
