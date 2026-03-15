Perform a QA (Quality Assurance) analysis on PR: $ARGUMENTS

## Instructions

### 1. Parse the Reference
Extract owner, repo, and PR number from the argument. Accepted formats:
- `owner/repo#123` | `repo#123` (assumes `default_org` from config.json) | GitHub URL

### 2. Data Collection
```bash
gh pr view <number> --repo <owner/repo> --json title,body,author,baseRefName,headRefName,files,labels
gh pr diff <number> --repo <owner/repo>
```

### 3. Load QA Context
Read the specialist profile at `profiles/agents/qa.md`.

### 4. Local Context Gathering
Read local source files to understand contracts, schemas, and expected behavior. Prioritize:
- **API contracts**: OpenAPI/Swagger specs, request/response DTOs, GraphQL schemas
- **Database schemas and migrations**: Entity definitions, migration files, constraint definitions
- **Configuration per environment**: appsettings.Development.json vs appsettings.Production.json, environment-specific behavior
- **Integration points**: Service clients, message contracts, event definitions
- **Existing behavior**: Read the full source files being modified to understand current behavior before the change

Read up to 15 related files. If the repository is not cloned locally, skip this step and analyze the diff only.

### 5. QA Analysis
Analyze from the perspective of the END USER and API CONSUMERS:

- **Functional correctness**: Does the implementation do what the description promises?
- **Edge cases**: Extreme inputs, null, empty, concurrent access
- **Regressions**: Could it break something existing?
- **Compatibility**: Breaking changes in APIs/contracts?
- **Data integrity**: Transactions, constraints, orphaned data?
- **Observability**: Logging, metrics, adequate alerts?
- **Error handling**: Clear messages, graceful behavior?

### 6. Report Generation
Read the review language from `config.json > review.language` and generate the report in that language:

```markdown
## 🎯 QA Review - [PR title]

**Repo:** owner/repo | **PR:** #number
**Specialist:** QA

---

### Functional Analysis
[Does the implementation meet the proposal? Are there gaps?]

### Identified Edge Cases
[For each edge case:]
#### [🔴/🟠/🟡] [Scenario description]
**File:** `path/to/file` (line XX)
**Impact:** [What happens if not handled]

**Current code:**
```[lang]
[problematic code from the diff]
```

**Suggestion:** [How to handle it]

When a finding references a specific file and line, always include the "Current code" block. General findings without a specific code location may omit code blocks and will be included in the review body instead of as inline comments.

### Regression Risks
[List of existing features that could be affected]

### Compatibility
[Identified breaking changes, if any]

### Observability
[Are logging and monitoring adequate?]

### Suggested Manual Test Scenarios
1. [Scenario 1]: [Steps] → [Expected result]
2. [Scenario 2]: [Steps] → [Expected result]

---

### QA Verdict
**[READY / NEEDS_ATTENTION / NOT_READY]** - [justification]
```

### 6b. Usage Estimation (if REVIEW_VERBOSE=true)
After generating the report and before confirmation, estimate usage costs:

1. **Check toggle**: Read the `REVIEW_VERBOSE` environment variable. If not `"true"`, skip this step.
2. **Collect metrics**: Note the approximate total tokens consumed and wall-clock duration for this review. This is a single-perspective review (`num_perspectives = 1`).
3. **Resolve model**: Read `config.json > review.usage.default_model`.
   - If the value is `"auto"`, use the identity of the model currently executing (e.g., `claude-opus-4-6`). Claude Code knows its own model.
   - Otherwise, use the configured value as-is.
   - Fallback (if field missing): `"claude-sonnet-4-6"`.
4. **Calculate API cost**:
   - Read `pricing.json > models.<model_name>` for `input_per_mtok` and `output_per_mtok`
   - Read `config.json > review.usage.input_output_ratio` (fallback: `[0.70, 0.30]`)
   - `api_cost = (total_tokens * ratio[0] * input_per_mtok / 1_000_000) + (total_tokens * ratio[1] * output_per_mtok / 1_000_000)`
5. **Calculate plan percentage and viability**:
   - Read `config.json > review.usage.active_plan` and `pricing.json > plans.<plan_name>`
   - `window_pct = (total_tokens / tokens_per_window) * 100`
   - `reviews_per_window = floor(tokens_per_window / total_tokens)`
   - `monthly_windows = (30 * 24) / window_hours`
   - `reviews_per_month = reviews_per_window * monthly_windows`
   - `cost_per_review = monthly_cost_usd / reviews_per_month` (round to 2 decimals)
   - `plan_info` = plan name + cost from i18n label `usage_plan_info` (e.g., "Max 5x ($100/mo)")
6. **Format duration**: Convert wall-clock seconds to human format: `≥60s` → `~Xm Ys`, `<60s` → `~Xs`.
7. **Display in console**:
```
📊 Usage: ~{total_tokens_human} tokens ({model_name}) | 1 perspective | ~{duration_human}
💰 API Cost: ~${api_cost} USD
📋 {plan_info}: ~{window_pct}% of {window_hours}h window
📈 Viability: ~{reviews_per_window} reviews/window | ~{reviews_per_month} reviews/month | ~${cost_per_review}/review
```

### 7. Confirmation before posting
Show the report and ask if the user wants to post it on the PR.
If confirmed, post the review with inline comments:

**Step 1 — Get head commit SHA:**
```bash
HEAD_SHA=$(gh pr view <number> --repo <owner/repo> --json headRefOid -q .headRefOid)
```

**Step 2 — Split review into body + inline comments:**

Separate the findings into two groups:
- **Review body:** Summary, positive findings (✅), general findings without a specific file reference, severity table, and recommendation.
- **Inline comments:** One per finding (🔴/🟠/🟡/🔵) that references a specific file path. Each becomes a JSON object:
  - `path` — file path relative to repo root (e.g., `src/Services/TokenService.cs`)
  - `line` — line number in the new version of the file (right side of diff). Must be a line visible in the diff. If the finding's line is not in the diff, omit `line` to create a file-level comment.
  - `side` — `"RIGHT"` (commenting on new/modified code)
  - `body` — finding content in markdown: severity icon + title, description, current code block, suggested fix block

**Step 3 — Submit review with inline comments:**
Build a JSON payload and submit via the GitHub Reviews API:
```bash
gh api repos/<owner>/<repo>/pulls/<number>/reviews \
  --method POST \
  -f body="<review_body>" \
  -f event="<COMMENT|REQUEST_CHANGES>" \
  -f commit_id="$HEAD_SHA" \
  --input comments.json
```

Where the input JSON contains the comments array:
```json
{
  "comments": [
    {
      "path": "src/path/to/file",
      "line": 42,
      "side": "RIGHT",
      "body": "### 🟠 MAJOR — Issue title\n\n..."
    }
  ]
}
```

**Fallback:** If there are no findings with file references (e.g., all findings are general), use:
```bash
gh pr review <number> --repo <owner/repo> --body "<review_body>" --event <ACTION>
```

**Important:** The inline comment body should be self-contained — include the severity, title, description, and code snippets so the developer can understand and fix the issue without navigating elsewhere.

### 8. Send Notifications (after posting)
After the review is successfully posted, send notifications to configured providers.

1. Read `config.json > notifications.providers` and iterate over each provider entry
2. For each provider where `enabled` is `true`:
   a. Check if the environment variable named in `env_var` is set and non-empty
   b. If not set, skip this provider silently
   c. Load the provider template from the `template` path
   d. Build the notification payload:

**Collect notification data (once, shared across all providers):**
- `ICON` — `🎯` (QA review)
- `REVIEW_TYPE_LABEL` — localized from i18n (`labels.qa_review`)
- `OWNER`, `REPO`, `NUMBER`, `PR_TITLE`, `AUTHOR` — PR metadata
- `PR_URL` — `https://github.com/<owner>/<repo>/pull/<number>`
- `RECOMMENDATION` — APPROVE / REQUEST_CHANGES / COMMENT
- `RECOMMENDATION_EMOJI` — ✅ APPROVE, ⚠️ REQUEST_CHANGES, 💬 COMMENT
- `SUMMARY_TABLE` — severity counts: "🔴 X Critical | 🟠 X Major | 🟡 X Minor | 🔵 X Suggestion"
- `REVIEW_BODY` — review body truncated to `notifications.settings.max_body_length` (if `include_review_body` is true). Append i18n `truncated` label if truncated.

**Resolve author mention (per provider):**
Follow the user resolution algorithm in `templates/user-resolution.md` to resolve
the PR author's GitHub username to a provider-specific user ID. This uses the
priority chain: manual mapping → cache → auto-resolve by email → ask user → fallback.

**Include usage stats (if enabled):**
If `REVIEW_VERBOSE` is `"true"` AND `notifications.settings.include_usage_stats` is `true`, include the `usage_block` from the provider template with all usage placeholders replaced (see `/full-review` Step 10 for the full placeholder list, including `{{PLAN_INFO}}`, `{{DURATION}}`, `{{NUM_PERSPECTIVES}}`, `{{USAGE_VIABILITY}}`, `{{REVIEWS_PER_WINDOW}}`, `{{COST_PER_REVIEW}}`). If not enabled, omit usage blocks from the payload.

**Send notification:**
```bash
curl -s -X POST "$<ENV_VAR_NAME>" \
  -H "Content-Type: <content_type_from_template>" \
  -d '<payload_json>'
```

3. After all providers: show summary (e.g., "Notification sent via slack." or "Notifications skipped (not configured).")
4. Notification failures must NOT fail the review command — log warning and continue.
