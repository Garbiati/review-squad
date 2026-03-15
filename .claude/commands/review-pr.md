Perform a specialized code review on PR: $ARGUMENTS

## Instructions

### 1. Parse the Reference and Tier
Extract owner, repo, and PR number from the argument. Accepted formats:
- `owner/repo#123`
- `repo#123` (assumes `default_org` from config.json)
- `#123` (needs repo context)
- GitHub URL: `https://github.com/owner/repo/pull/123`

**Tier selection:** Check if the arguments include `--quick`, `--focused`, or `--full`.
- If no flag is provided, use `config.json > review.default_tier` (fallback: `"focused"`)
- **Quick**: Only report critical and major findings. Skip local context reading.
- **Focused**: Full analysis. Read up to 15 local source files for context.
- **Full**: Deep analysis. Read up to 30 local source files for context.

### 2. Data Collection
Run the following commands to collect PR information:

```bash
# PR metadata
gh pr view <number> --repo <owner/repo> --json title,body,author,baseRefName,headRefName,files,additions,deletions,state,reviewDecision,labels

# PR diff
gh pr diff <number> --repo <owner/repo>

# Existing comments (to avoid repeating feedback)
gh pr view <number> --repo <owner/repo> --json reviews,comments
```

**Large PR check:** If the PR has more files than `config.json > review.max_files_inline_review` (default: 30), use summary-level feedback rather than per-file inline comments.

### 3. Local Context Gathering (focused and full tiers only)
If the selected tier has `read_local_context: true`, gather context from local source files:

1. **Read modified files in full**: For each file in the diff, read the complete file from the local filesystem (not just the diff hunks). This provides full context for understanding changes.
2. **Read related files**: Identify files that import, reference, or are referenced by the modified files. Read up to `max_context_files` (15 for focused, 30 for full) related files.
3. **Read configuration files**: Read relevant configuration files (DI registration, appsettings, package.json, tsconfig, etc.) that may affect the changed code.

If the repository is not cloned locally (files not found), skip this step and analyze the diff only.

### 4. Profile Identification
Check `config.json` to identify which repository profile to use.
Load the corresponding profile from `profiles/stacks/<profile>.md`.

If no profile is mapped, attempt auto-detection:
1. Run `gh api repos/{owner}/{repo}/languages` to detect the primary language
2. Map the language to a default profile: C# → dotnet-core-api, TypeScript → typescript-react, Python → python, Go → go, Rust → rust, Java → java-spring, Vue → vue, SQL → sql
3. If no match, use `profiles/stacks/default.md`

### 5. Diff Analysis
Read the repository profile and analyze the PR diff (plus local context if gathered) based on the profile's checklist.
Skip files matching patterns in `config.json > review.ignore_patterns`.

For each changed file, analyze:
- Compliance with profile standards
- Potential bugs
- Code smells
- Improvement opportunities
- How changes interact with the surrounding codebase (when local context is available)

If the tier is **quick**, only report findings with severity critical or major. Skip minor, suggestion, and positive.

### 6. Review Generation
Read the review language from `config.json > review.language` and generate the review in that language using the following format:

```markdown
## 🔍 Code Review - [PR title]

**Repo:** owner/repo | **PR:** #number | **Author:** @author
**Profile applied:** [profile name]
**Review tier:** [Quick / Focused / Full]

---

### Summary
[1-3 paragraphs summarizing changes and overall impression]

### Findings

#### 🔴 Critical
[critical findings, if any]

#### 🟠 Major
[major findings]

#### 🟡 Minor
[minor findings — omitted in quick tier]

#### 🔵 Suggestions
[improvement suggestions — omitted in quick tier]

#### ✅ Positive
[positive aspects of the code — omitted in quick tier]

---

### Recommendation
**[APPROVE / REQUEST_CHANGES / COMMENT]** - [one-sentence justification]
```

**Per-finding format:**
#### [SEVERITY_ICON] [SEVERITY] — [Issue Title]
**File:** `path/to/file` (line XX)
[Description]

**Current code:**
```[lang]
[problematic code from the diff]
```

**Suggested fix** (when applicable):
```[lang]
[improved code]
```

When a finding references a specific file and line, always include the "Current code" block. General findings without a specific code location may omit code blocks and will be included in the review body instead of as inline comments.

### 6b. Usage Estimation (if REVIEW_VERBOSE=true)
After generating the review and before preview, estimate usage costs:

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

### 7. Preview and Confirmation
Show the complete review to the user and ask:
- "Would you like me to post this review on the PR?"
- "Would you like to change anything before posting?"
- "Which action? (APPROVE, REQUEST_CHANGES, COMMENT) - default: COMMENT"

### 8. Posting (only after confirmation)
If the user confirms, post the review with inline comments:

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

**Important:** The inline comment body should be self-contained — include the severity, title, description, and code snippets so the developer can understand and fix the issue without navigating elsewhere.

### 9. Send Notifications (after posting)
After the review is successfully posted, send notifications to configured providers.

1. Read `config.json > notifications.providers` and iterate over each provider entry
2. For each provider where `enabled` is `true`:
   a. Check if the environment variable named in `env_var` is set and non-empty
   b. If not set, skip this provider silently
   c. Load the provider template from the `template` path
   d. Build the notification payload:

**Collect notification data (once, shared across all providers):**
- `ICON` — `🔍` (code review)
- `REVIEW_TYPE_LABEL` — localized from i18n (`labels.code_review`)
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
