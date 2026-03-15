## {{ICON}} {{REVIEW_TYPE}} - {{PR_TITLE}}

**Repo:** {{OWNER}}/{{REPO}} | **PR:** #{{NUMBER}} | **Author:** @{{AUTHOR}}
{{#if PROFILE}}**Profile applied:** {{PROFILE}}{{/if}}
{{#if TIER}}**Review tier:** {{TIER}}{{/if}}

---

### Summary
{{SUMMARY}}

### Findings

{{#each FINDINGS}}
#### {{SEVERITY_ICON}} {{SEVERITY}} — {{TITLE}}
**File:** `{{FILE}}` {{#if LINE}}(line {{LINE}}){{/if}}
{{DESCRIPTION}}

{{#if CODE_BEFORE}}
**Current code:**
```{{LANG}}
{{CODE_BEFORE}}
```
{{/if}}

{{#if CODE_AFTER}}
**Suggested fix:**
```{{LANG}}
{{CODE_AFTER}}
```
{{/if}}

{{/each}}

---

### Recommendation
**{{RECOMMENDATION}}** — {{RECOMMENDATION_REASON}}

---
