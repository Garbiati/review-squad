## 📊 Consolidated Summary

| Category | 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Suggestion | ✅ Positive |
|----------|-------------|----------|----------|---------------|------------|
{{#each CATEGORIES}}
| {{NAME}} | {{CRITICAL}} | {{MAJOR}} | {{MINOR}} | {{SUGGESTION}} | {{POSITIVE}} |
{{/each}}
| **Total** | **{{TOTAL_CRITICAL}}** | **{{TOTAL_MAJOR}}** | **{{TOTAL_MINOR}}** | **{{TOTAL_SUGGESTION}}** | **{{TOTAL_POSITIVE}}** |

### Final Recommendation
**{{FINAL_RECOMMENDATION}}**
{{FINAL_REASON}}

### Next Steps
{{#each NEXT_STEPS}}
{{@index}}. {{this}}
{{/each}}

---
