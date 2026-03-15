## {{ICON}} {{REVIEW_TYPE}} - {{PR_TITLE}}

**Repo:** {{OWNER}}/{{REPO}} | **PR:** #{{NUMBER}} | **Author:** @{{AUTHOR}}
{{#if PROFILE}}**Profile applied:** {{PROFILE}}{{/if}}
{{#if TIER}}**Review tier:** {{TIER}}{{/if}}

---

### Summary
{{SUMMARY}}

{{#if POSITIVES}}
### Positive Aspects
{{#each POSITIVES}}
- ✅ {{this}}
{{/each}}
{{/if}}

{{#if GENERAL_FINDINGS}}
### General Observations
{{#each GENERAL_FINDINGS}}
{{SEVERITY_ICON}} **{{TITLE}}** — {{DESCRIPTION}}
{{/each}}
{{/if}}

### Severity Summary
| | Count |
|---|---|
| 🔴 Critical | {{CRITICAL_COUNT}} |
| 🟠 Major | {{MAJOR_COUNT}} |
| 🟡 Minor | {{MINOR_COUNT}} |
| 🔵 Suggestion | {{SUGGESTION_COUNT}} |

---

### Recommendation
**{{RECOMMENDATION}}** — {{RECOMMENDATION_REASON}}
