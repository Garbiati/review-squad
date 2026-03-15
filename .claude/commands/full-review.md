Execute a FULL analysis on PR with ALL specialist perspectives: $ARGUMENTS

## Instructions

### 1. Parse the Reference and Tier
Extract owner, repo, and PR number from the argument. Accepted formats:
- `owner/repo#123` | `repo#123` (assumes `default_org` from config.json) | GitHub URL

**Tier selection:** Check if the arguments include `--quick`, `--focused`, or `--full`.
- If no flag is provided, use `config.json > review.default_tier` (fallback: `"focused"`)
- **Quick**: Run only the `code` perspective. Diff only, no local context. Report only critical/major.
- **Focused**: Run `code`, `security`, `testing`, `qa`. Read up to 15 local files for context.
- **Full**: Run all 6 perspectives. Read up to 30 local files for context.

The tier's agent list can be overridden by `config.json > review.tiers.<tier>.agents`.

### 2. Data Collection
First, collect all PR information:
```bash
gh pr view <number> --repo <owner/repo> --json title,body,author,baseRefName,headRefName,files,additions,deletions,state,reviewDecision,labels,reviews,comments
gh pr diff <number> --repo <owner/repo>
```

### 3. Local Context Gathering (focused and full tiers only)
If the selected tier has `read_local_context: true`, gather context from local source files ONCE before launching perspectives:

1. **Read modified files in full**: For each file in the diff, read the complete file from the local filesystem.
2. **Read related files**: Identify files that import, reference, or are referenced by the modified files. Read up to `max_context_files` (15 for focused, 30 for full) related files.
3. **Read configuration files**: Read relevant configuration files (DI registration, appsettings, package.json, tsconfig, etc.).

This context is gathered once and passed to all perspectives, avoiding redundant file reads.

If the repository is not cloned locally (files not found), skip this step and analyze the diff only.

### 4. Repository Profile Identification
Check `config.json` for the profile. Load the profile from `profiles/stacks/`.

If no profile is mapped, attempt auto-detection:
1. Run `gh api repos/{owner}/{repo}/languages` to detect the primary language
2. Map the language to a default profile: C# → dotnet-core-api, TypeScript → typescript-react, Python → python, Go → go, Rust → rust, Java → java-spring, Vue → vue, SQL → sql
3. If no match, use `profiles/stacks/default.md`

### 5. Determine Which Perspectives to Run
Use the tier to determine which perspectives run:
- **Quick**: `["code"]` (or `config.json > review.tiers.quick.agents`)
- **Focused**: `["code", "security", "testing", "qa"]` (or `config.json > review.tiers.focused.agents`)
- **Full**: `["code", "security", "testing", "qa", "architecture", "performance"]` (or `config.json > review.tiers.full.agents`)

Also check `config.json > agents.available` for which perspectives are enabled.

### 6. Execute Perspectives in Parallel
Launch perspectives in PARALLEL using the Agent tool. Pass local context (if gathered) to each perspective.

**Perspective 1 - Code Review (stack-specialized):**
Pass the full diff, local context, and the repository profile (from profiles/stacks/).
Request a full analysis following the profile's checklist.
The perspective should return findings classified by severity.

**Perspective 2 - Security:**
Pass the full diff, local context, and the security profile (profiles/agents/security.md).
Request analysis focused on OWASP Top 10, secrets, injection, auth.
Prioritize local context for: auth middleware, configuration files, env files, dependency manifests.
The perspective should return classified security findings.

**Perspective 3 - Testing:**
Pass the full diff, local context, and the testing profile (profiles/agents/testing.md).
Request analysis of test coverage and quality.
Prioritize local context for: existing tests for modified code, test infrastructure (conftest, TestBase).
The perspective should return test gaps and feedback.

**Perspective 4 - QA:**
Pass the full diff, local context, and the QA profile (profiles/agents/qa.md).
Request functional analysis, edge cases, regressions.
Prioritize local context for: API contracts, schemas, migrations, environment configs.
The perspective should return QA findings and test scenarios.

**Perspective 5 - Architecture (if enabled):**
Pass the full diff, local context, and the architecture profile (profiles/agents/architecture.md).
Request analysis of SOLID violations, layering, coupling, API design.
Prioritize local context for: project structure, DI registration, interfaces.
The perspective should return architecture findings.

**Perspective 6 - Performance (if enabled):**
Pass the full diff, local context, and the performance profile (profiles/agents/performance.md).
Request analysis of algorithmic complexity, N+1, memory, caching.
Prioritize local context for: DbContext/models, cache configuration, hot-path callers.
The perspective should return performance findings.

### 6b. Usage Estimation (if REVIEW_VERBOSE=true)
After all perspectives return and before consolidation, estimate usage costs:

1. **Check toggle**: Read the `REVIEW_VERBOSE` environment variable. If not `"true"`, skip this step entirely.
2. **Collect metrics**: For each perspective agent that ran, note the approximate total tokens consumed and wall-clock duration. Sum tokens across all perspectives to get `total_tokens`. Record the total wall-clock time (perspectives run in parallel, so use the longest duration). Record `num_perspectives` (number of agents that ran).
3. **Resolve model**: Read `config.json > review.usage.default_model`.
   - If the value is `"auto"`, use the identity of the model currently executing (e.g., `claude-opus-4-6`). Claude Code knows its own model.
   - Otherwise, use the configured value as-is.
   - Fallback (if field missing): `"claude-sonnet-4-6"`.
4. **Calculate API cost**:
   - Read `pricing.json > models.<model_name>` for `input_per_mtok` and `output_per_mtok`
   - Read `config.json > review.usage.input_output_ratio` (fallback: `[0.70, 0.30]`)
   - `input_tokens = total_tokens * ratio[0]`
   - `output_tokens = total_tokens * ratio[1]`
   - `api_cost = (input_tokens * input_per_mtok / 1_000_000) + (output_tokens * output_per_mtok / 1_000_000)`
5. **Calculate plan percentage and viability**:
   - Read `config.json > review.usage.active_plan` (fallback: `"pro"`)
   - Read `pricing.json > plans.<plan_name>` for `tokens_per_window`, `window_hours`, `monthly_cost_usd`, `name`
   - `window_pct = (total_tokens / tokens_per_window) * 100`
   - `reviews_per_window = floor(tokens_per_window / total_tokens)`
   - `monthly_windows = (30 * 24) / window_hours`
   - `reviews_per_month = reviews_per_window * monthly_windows`
   - `cost_per_review = monthly_cost_usd / reviews_per_month` (round to 2 decimals)
   - `plan_info` = plan name + cost from i18n label `usage_plan_info` (e.g., "Max 5x ($100/mo)")
6. **Format duration**: Convert wall-clock seconds to human format: `≥60s` → `~Xm Ys`, `<60s` → `~Xs`.
7. **Display in console**:
```
📊 Usage: ~{total_tokens_human} tokens ({model_name}) | {num_perspectives} perspectives | ~{duration_human}
💰 API Cost: ~${api_cost} USD
📋 {plan_info}: ~{window_pct}% of {window_hours}h window
📈 Viability: ~{reviews_per_window} reviews/window | ~{reviews_per_month} reviews/month | ~${cost_per_review}/review
```

Format tokens with K/M suffix (e.g., "55K", "1.2M"). Round costs to 2 decimal places.

### 7. Consolidation
After all perspectives return, consolidate into a single report.
Read the review language from `config.json > review.language` and generate the report in that language.

If the tier is **quick**, only include critical and major findings.

Consolidation rules:
- **Deduplication**: If multiple perspectives flag the same issue, keep only the most detailed version and note which perspectives flagged it
- **Severity ranking**: Sort findings by severity (Critical → Major → Minor → Suggestion)
- **Conflict resolution**: If perspectives disagree on severity, use the higher severity
- **Preserve code snippets**: Always preserve "Current code" and "Suggested fix" code blocks from perspectives. When deduplicating, keep snippets from the most detailed version.
- **Preserve file references**: Each finding must retain its `path` and `line` for inline comment posting.

```markdown
## 📋 Full Review - [PR title]

**Repo:** owner/repo | **PR:** #number | **Author:** @author
**Branch:** head → base
**Changes:** +additions / -deletions in N files
**Review tier:** [Quick / Focused / Full]

---

### 📝 Code Review
**Profile:** [applied profile name]
[Code review summary]
[Perspective 1 findings]

---

### 🛡️ Security Review
[Perspective 2 findings]

---

### 🧪 Test Review
[Perspective 3 findings]

---

### 🎯 QA Review
[Perspective 4 findings]

---

### 🏗️ Architecture Review
[Perspective 5 findings, if enabled]

---

### ⚡ Performance Review
[Perspective 6 findings, if enabled]

---

### 📊 Consolidated Summary

| Category | 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Suggestion | ✅ Positive |
|----------|-------------|----------|----------|---------------|------------|
| Code | X | X | X | X | X |
| Security | X | X | X | X | - |
| Testing | - | X | X | X | X |
| QA | X | X | X | X | X |
| Architecture | X | X | X | X | X |
| Performance | X | X | X | X | X |
| **Total** | **X** | **X** | **X** | **X** | **X** |

### Final Recommendation
**[APPROVE / REQUEST_CHANGES / COMMENT]**
[Consolidated justification based on findings from all perspectives]

### Next Steps
1. [Required action 1]
2. [Required action 2]

---
```

### 8. Preview and Confirmation
Show the complete consolidated report to the user.

**Auto-post behavior (based on severity):**
- If there are **any 🔴 CRITICAL or 🟠 MAJOR findings**: automatically post as `REQUEST_CHANGES` and send notifications. Do NOT ask for confirmation — the answer is always REQUEST_CHANGES when critical/major issues exist.
- If there are **only 🟡 MINOR or 🔵 SUGGESTION findings** (no critical or major): show preview and ask:
  - "Deseja que eu poste este review na PR?"
  - "Deseja alterar algo antes de postar?"
  - "Qual action? (APPROVE, REQUEST_CHANGES, COMMENT)"

### 9. Posting
If auto-posting (critical/major found) or user confirmed, post the review with inline comments:

**Step 1 — Get head commit SHA:**
```bash
HEAD_SHA=$(gh pr view <number> --repo <owner/repo> --json headRefOid -q .headRefOid)
```

**Step 2 — Split review into body + inline comments:**

Separate the findings into two groups:
- **Review body:** Summary, positive findings (✅), general findings without a specific file reference, severity table, consolidated summary table, and recommendation.
- **Inline comments:** One per finding (🔴/🟠/🟡/🔵) that references a specific file path. Each becomes a JSON object:
  - `path` — file path relative to repo root (e.g., `src/Services/TokenService.cs`)
  - `line` — line number in the new version of the file (right side of diff). Must be a line visible in the diff. If the finding's line is not in the diff, omit `line` to create a file-level comment.
  - `side` — `"RIGHT"` (commenting on new/modified code)
  - `body` — finding content in markdown: severity icon + title, description, perspective label, current code block, suggested fix block

**Step 3 — Submit review with inline comments:**
Build a JSON payload and submit via the GitHub Reviews API:
```bash
gh api repos/<owner>/<repo>/pulls/<number>/reviews \
  --method POST \
  -f body="<review_body>" \
  -f event="<APPROVE|REQUEST_CHANGES|COMMENT>" \
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
      "body": "### 🔴 CRITICAL — Issue title\n\n..."
    }
  ]
}
```

**Fallback:** If there are no findings with file references (e.g., all findings are general), use:
```bash
gh pr review <number> --repo <owner/repo> --body "<review_body>" --event <ACTION>
```

**Important:** The inline comment body should be self-contained — include the severity, title, description, perspective label, and code snippets so the developer can understand and fix the issue without navigating elsewhere.

### 10. Send Notifications (after posting)
After the review is successfully posted, send notifications to configured providers.

1. Read `config.json > notifications.providers` and iterate over each provider entry
2. For each provider where `enabled` is `true`:
   a. Check if the environment variable named in `env_var` is set and non-empty
   b. If not set, skip this provider silently
   c. Load the provider template from the `template` path
   d. Build the notification payload:

**Collect notification data (once, shared across all providers):**
- `ICON` — `📋` (full review)
- `REVIEW_TYPE_LABEL` — localized from i18n (`labels.full_review`)
- `OWNER`, `REPO`, `NUMBER`, `PR_TITLE`, `AUTHOR` — PR metadata
- `PR_URL` — `https://github.com/<owner>/<repo>/pull/<number>`
- `HEAD_BRANCH`, `BASE_BRANCH` — branch names
- `ADDITIONS`, `DELETIONS`, `FILE_COUNT` — change stats
- `RECOMMENDATION` — APPROVE / REQUEST_CHANGES / COMMENT
- `RECOMMENDATION_EMOJI` — ✅ APPROVE, ⚠️ REQUEST_CHANGES, 💬 COMMENT

**Build Slack notification with detailed per-perspective content (NOT truncated):**

The Slack notification must include the FULL review with per-perspective breakdown. Structure:

1. **`EXECUTIVE_SUMMARY`** — `📌 *Resumo Executivo*` block: max 5 lines, non-technical, C-Level readable. Always praise what's good first, then flag what needs attention. End with recommendation.

2. **`POSITIVES_BLOCK`** — `✅  *O que está bom*` with bullet points, `\n\n` spacing between items.

3. **`PERSPECTIVE_*` blocks** — One section per perspective (CODE, SECURITY, TESTING, QA, ARCHITECTURE, PERFORMANCE). Each block:
   - Starts with emoji + bold header (e.g., `📝  *Code Review*`)
   - 🔴/🟠 findings: full description with file reference and `→ Fix:` suggestion, separated by `\n\n`
   - 🟡/🔵 findings: one-liner each
   - Each block must stay under 3000 chars (Slack section text limit)
   - Omit perspective blocks that didn't run (e.g., architecture/performance in focused tier)

4. **`SUMMARY_COUNTS`** — Inline format (NO markdown tables): `🔴 X Críticos  ·  🟠 X Importantes  ·  🟡 X Menores  ·  🔵 X Sugestões  ·  ✅ X Positivos`

5. **`RECOMMENDATION_BLOCK`** — `⚠️ REQUEST_CHANGES` or `✅ APPROVE` + numbered priority list split into "Correções prioritárias" and "Melhorias recomendadas"

**Formatting rules:**
- Use `  ·  ` as separator instead of `|`
- Use `\n\n` between findings for breathing room
- Separate every perspective with a `divider` block
- NO markdown tables (Slack doesn't render them)
- File paths in backticks, shortened when possible (e.g., `AddressService.cs:84` not full path)

**Resolve author mention (per provider):**
Follow the user resolution algorithm in `templates/user-resolution.md` to resolve
the PR author's GitHub username to a provider-specific user ID. This uses the
priority chain: manual mapping → cache → auto-resolve by email → ask user → fallback.

**Include usage stats (if enabled):**
If `REVIEW_VERBOSE` is `"true"` AND `notifications.settings.include_usage_stats` is `true`:
- Read the `usage_block` from the provider template
- Replace usage placeholders with calculated values from Step 6b:
  - `{{USAGE_TOKENS}}` — i18n `notifications.usage_tokens`
  - `{{TOTAL_TOKENS}}` — formatted token count (e.g., "~421K")
  - `{{USAGE_COST_API}}` — i18n `notifications.usage_cost_api`
  - `{{API_COST}}` — formatted cost (e.g., "~$4.46")
  - `{{USAGE_COST_PLAN}}` — i18n `notifications.usage_cost_plan`
  - `{{WINDOW_PCT}}` — window percentage (e.g., "0.19")
  - `{{USAGE_WINDOW_PCT}}` — i18n `notifications.usage_window_pct` with `{{WINDOW_HOURS}}` replaced
  - `{{USAGE_MODEL}}` — i18n `notifications.usage_model`
  - `{{MODEL_NAME}}` — resolved model name (e.g., "claude-opus-4-6")
  - `{{USAGE_DURATION}}` — i18n `notifications.usage_duration`
  - `{{DURATION}}` — formatted duration (e.g., "~3m 23s")
  - `{{USAGE_PERSPECTIVES}}` — i18n `notifications.usage_perspectives`
  - `{{NUM_PERSPECTIVES}}` — number of perspectives that ran (e.g., "4")
  - `{{PLAN_INFO}}` — i18n `notifications.usage_plan_info` with `{{PLAN_NAME}}` and `{{MONTHLY_COST}}` replaced (e.g., "Max 5x ($100/mo)")
  - `{{USAGE_VIABILITY}}` — i18n `notifications.usage_viability`
  - `{{REVIEWS_PER_WINDOW}}` — i18n `notifications.usage_reviews_per_window` with `{{COUNT}}` replaced (e.g., "~534 reviews/window")
  - `{{COST_PER_REVIEW}}` — i18n `notifications.usage_cost_per_review` with `{{COST}}` replaced (e.g., "~$0.00/review")
- Insert the usage block into the payload:
  - **Slack**: Insert `usage_block` elements before the `actions` block in `body.blocks`
  - **Teams**: The `usage_block` facts section is already part of the template sections array
  - **Discord**: The `usage_block` data is already in the footer template

If `REVIEW_VERBOSE` is not `"true"` or `include_usage_stats` is `false`:
- **Slack**: Do not include the `usage_block` elements
- **Teams**: Remove the usage facts section from sections array
- **Discord**: Use plain `"review-squad"` as footer text

**Send notification:**
```bash
curl -s -X POST "$<ENV_VAR_NAME>" \
  -H "Content-Type: <content_type_from_template>" \
  -d '<payload_json>'
```

3. After all providers: show summary (e.g., "Notification sent via slack." or "Notifications skipped (not configured).")
4. Notification failures must NOT fail the review command — log warning and continue.
