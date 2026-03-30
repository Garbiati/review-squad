# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

review-squad is a multi-perspective PR code review system powered by Claude Code and the `gh` CLI. It uses specialized review perspectives per tech stack and per discipline (security, testing, QA, architecture, performance) to review pull requests — with zero infrastructure.

## Development

This project is pure Markdown + JSON — there is no code to build, lint, or test. All changes are to prompt files, profiles, templates, or configuration. The `gh` CLI must be authenticated (`gh auth status`) for any review command to work.

**Setup:** `config.json` is git-ignored. New users must copy `config.example.json` to `config.json` and fill in their GitHub org/account details. A PreToolUse hook in `.claude/settings.json` blocks `gh pr review` if `config.json` is missing.

## Architecture

This project has no executable code — it is a collection of prompts, profiles, and templates that orchestrate Claude Code to review PRs via the `gh` CLI.

```
config.json                — maps each repo (owner/repo) to a stack profile (git-ignored, user-specific)
config.example.json        — template configuration for new users
pricing.json               — model pricing and plan limits (git-tracked, update via /update-pricing)
.env / .env.example        — webhook URLs and toggles for notification providers (git-ignored secrets)
.user-mapping.json         — auto-resolved user mapping cache (git-ignored, auto-populated)
profiles/stacks/           — review checklists per tech stack (dotnet-core-api, typescript-react, etc.)
profiles/agents/           — prompts for specialist review perspectives (security, testing, qa, architecture, performance)
.claude/commands/          — slash commands defining the flow for each review type
templates/                 — Handlebars-like templates to format findings and summaries
templates/i18n/            — localized labels (en, pt-BR, etc.)
templates/notifications/   — notification templates per provider (slack, teams, discord)
templates/user-resolution.md — shared user resolution algorithm for all commands
integrations/              — adapters for other AI coding tools (Cursor, Aider, Codex CLI) and Slack bot
integrations/slack-bot/    — Slack bot bridge: triggers reviews from Slack via Claude Code SDK
```

**Data flow:** Slash command → parse PR ref → `gh pr view/diff` → read local source files for context → resolve profile via `config.json` → load `profiles/stacks/<profile>.md` + `profiles/agents/*.md` → analyze diff + local context → format with `templates/` → preview → `gh api` to post review with inline comments (fallback: `gh pr review`).

### Profile Resolution

When a review command runs, the stack profile is resolved in this order:
1. Exact match in `config.json > repo_profiles` (e.g., `"org/repo": "dotnet-core-api"`)
2. Auto-detect via `gh api repos/{owner}/{repo}/languages` → map primary language to default profile (C# → dotnet-core-api, TypeScript → typescript-react, Python → python, Go → go, Rust → rust, Java → java-spring, Vue → vue, SQL → sql)
3. Fall back to `profiles/stacks/default.md`

### Review Tiers

Commands support three tiers of review depth, controlled by flags (`--quick`, `--focused`, `--full`) or `config.json > review.default_tier`:

| Tier | Perspectives | Local context | Severity filter |
|------|-------------|---------------|-----------------|
| **quick** | Code only | Diff only | Critical & Major only |
| **focused** | Code, Security, Testing, QA | Up to 15 files | All severities |
| **full** | All 6 | Up to 30 files | All severities |

Tier configuration is in `config.json > review.tiers`, which defines agents, context limits, and severity filters for each tier.

### Agent Configuration

`config.json > agents` controls which specialist perspectives run during `/full-review`:
- `agents.full_review` — array of perspective names to execute (default: `["code", "security", "testing", "qa"]`)
- `agents.available` — per-perspective enabled/disabled flags; architecture and performance are **disabled by default**
- Individual review commands (`/security-review`, `/test-review`, etc.) always run regardless of this config

### Templates and i18n

Review output is formatted using Handlebars-like templates in `templates/`. The language is controlled by `config.json > review.language` (e.g., `"en"` or `"pt-BR"`), and labels/verdicts are loaded from the matching file in `templates/i18n/`. When adding a new language, create a new JSON file in `templates/i18n/` following the structure of `en.json`.

### Notifications

After posting a review, commands can optionally send notifications to communication platforms. The system supports multiple providers via a Strategy pattern — same review data, different formatting per provider.

**Setup:**
1. Copy `.env.example` to `.env` and fill in webhook URLs for your providers
2. Enable desired providers in `config.json > notifications.providers.<provider>.enabled`
3. Map GitHub usernames to provider-specific IDs in `config.json > notifications.settings.user_mapping`

**Supported providers:**

| Provider | Env Variable | Template | Status |
|----------|-------------|----------|--------|
| Slack | `SLACK_WEBHOOK_URL` | `templates/notifications/slack.json` | Implemented |
| Microsoft Teams | `TEAMS_WEBHOOK_URL` | `templates/notifications/teams.json` | Template ready |
| Discord | `DISCORD_WEBHOOK_URL` | `templates/notifications/discord.json` | Template ready |

**Notification types:** Each provider has two templates — the initial review and the follow-up:

| Type | Slack | Teams | Discord |
|------|-------|-------|---------|
| Initial review | `slack.json` | `teams.json` | `discord.json` |
| Follow-up (re-review) | `slack-followup.json` | `teams-followup.json` | `discord-followup.json` |

The follow-up template is used when the PR author addresses review findings and the reviewer analyzes the corrections. It shows applied vs not-applied corrections, retracted findings (if any), and the updated recommendation (e.g., REQUEST_CHANGES → APPROVE).

**Adding a new provider:**
1. Create template in `templates/notifications/<provider>.json` following the existing format
2. Add entry in `config.example.json > notifications.providers`
3. Add env var to `.env.example`
4. No changes needed in commands (Open/Closed principle)

**Settings (shared across providers):**

| Setting | Default | Description |
|---------|---------|-------------|
| `include_summary_table` | `true` | Include severity counts |
| `include_review_body` | `true` | Include review content (truncated) |
| `max_body_length` | `2800` | Max chars of review body |
| `user_mapping` | `{}` | GitHub username to provider ID mapping |

Webhook URLs are stored in environment variables (`.env`, git-ignored) because this project is public.

### User Resolution

The notification system can auto-resolve GitHub usernames to provider-specific user IDs (e.g., Slack member IDs) so that PR authors get properly mentioned/notified.

**Priority chain:**
1. **Manual override** — `config.json > notifications.settings.user_mapping` (highest priority)
2. **Local cache** — `.user-mapping.json` (auto-populated, git-ignored, respects TTL)
3. **Auto-resolve by email** — match GitHub email to provider account
4. **Ask the user** — interactive prompt (terminal) or ephemeral message (Slack bot)
5. **Fallback** — `@github-username` (existing default behavior)

**Auto-resolution details:**
- Gets GitHub user email via `gh api users/<username>` or from recent commits
- **Slack**: Uses `users.lookupByEmail` API (requires `SLACK_RESOLVE_TOKEN` with `users:read.email` scope)
- **Teams**: Email is the Teams UPN/ID — no API call needed
- **Discord**: Cannot auto-resolve (no email lookup via webhooks) — manual mapping only
- Validates by fuzzy name match (first name, or one name contains the other)

**Configuration** (`config.json > notifications.settings.user_resolution`):

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable auto-resolution |
| `ttl_days` | `90` | Cache expiry in days |
| `slack_token_env` | `"SLACK_RESOLVE_TOKEN"` | Env var name for the Slack bot token |

**Cache file** (`.user-mapping.json`, git-ignored):
```json
{
  "github-username": {
    "github_email": "user@company.com",
    "github_name": "John Doe",
    "slack": { "id": "USLACKID", "name": "John Doe", "resolved_at": "...", "method": "email" },
    "teams": { "id": "user@company.com", "name": "John Doe", "resolved_at": "...", "method": "email" }
  }
}
```

**Slack bot context**: The bot pre-resolves the PR author before invoking Claude Code (since headless mode cannot ask interactively). If uncertain, it sends an ephemeral message to the requester with instructions for manual mapping.

**Required Slack scope**: `users:read.email` — add this to the Slack app's Bot Token Scopes in the Slack App configuration dashboard.

### Usage Estimation

Review commands can optionally display estimated token usage and costs after each review. This is controlled by the `REVIEW_VERBOSE` environment variable and configuration in `config.json > review.usage`.

**How it works:**
1. After a review completes, the command estimates total tokens consumed
2. Looks up model pricing from `pricing.json` (git-tracked, updatable via `/update-pricing`)
3. Calculates API-equivalent cost using the `input_output_ratio` heuristic (default: 70/30 input/output split)
4. Calculates percentage of the user's subscription plan window consumed
5. Displays results in the console and optionally in notifications

**Configuration:**
- `REVIEW_VERBOSE=true` in `.env` — enables usage display in console
- `config.json > review.usage.active_plan` — which plan the user subscribes to (for % calculation)
- `config.json > review.usage.default_model` — model for pricing lookup. Set to `"auto"` (recommended) to use the actual model running the review (Claude Code knows its own identity). Set to a specific model ID (e.g., `"claude-opus-4-6"`) to override.
- `config.json > review.usage.input_output_ratio` — heuristic split `[input, output]` (default: `[0.70, 0.30]`)
- `config.json > notifications.settings.include_usage_stats` — include usage in notification payloads
- `pricing.json` — model prices and plan limits (update via `/update-pricing`)

**Console output** (when `REVIEW_VERBOSE=true`):
```
📊 Usage: ~421K tokens (claude-opus-4-6) | 4 perspectives | ~3m 23s
💰 API Cost: ~$4.46 USD
📋 Max 5x ($100/mo): ~0.19% of 5h window
📈 Viability: ~534 reviews/window | ~76K reviews/month | ~$0.00/review
```

**Viability metrics** help assess whether the project is sustainable on your plan:
- `reviews/window` — how many reviews of similar size fit in one plan window
- `reviews/month` — extrapolated monthly capacity
- `cost/review` — effective cost per review based on subscription

**Note:** Token counts are approximate. Plan window limits (`tokens_per_window` in `pricing.json`) are estimates — adjust based on your actual experience.

### Slack Bot Integration

The Slack bot (`integrations/slack-bot/`) allows team members to trigger reviews from Slack via `/review owner/repo#123`. It runs locally on the developer's machine using Socket Mode (WebSocket, no public URL required).

**Architecture:** The bot is a thin bridge — it does NOT reimplement review logic. It receives a Slack command, invokes the Claude Code SDK with the existing `/full-review` prompt in headless mode, streams progress updates to Slack, and reports completion.

**Key constraints:**
- Uses `permissionMode: "bypassPermissions"` for non-interactive execution
- `disallowedTools: ["Edit", "Write", "NotebookEdit"]` — bot cannot modify files
- Always posts reviews as `COMMENT` (never `APPROVE` or `REQUEST_CHANGES`)
- Default: 1 concurrent review, 5/user/hour rate limit, 10 minute timeout

**Configuration:** `config.json > slack_bot` controls tier defaults, concurrency, rate limits, allowed users/channels, and timeout. Slack tokens are stored in `integrations/slack-bot/.env` (git-ignored).

### Adding a Repository

1. Add mapping in `config.json` → `repo_profiles`
2. If no existing profile fits, create a new one in `profiles/stacks/`

### Adding a Specialist Perspective

1. Create profile in `profiles/agents/`
2. Create command in `.claude/commands/`
3. Update `/full-review` to include the new perspective in parallel

## Available Commands

| Command | Usage | Description |
|---------|-------|-------------|
| `/review-pr` | `/review-pr owner/repo#123 [--quick\|--focused\|--full]` | Code review with stack-specialized perspective |
| `/security-review` | `/security-review owner/repo#123` | OWASP, CVEs, secrets analysis |
| `/test-review` | `/test-review owner/repo#123` | Test coverage and quality analysis |
| `/qa-review` | `/qa-review owner/repo#123` | Edge cases, regressions, breaking changes |
| `/architecture-review` | `/architecture-review owner/repo#123` | SOLID, layering, coupling, API design |
| `/performance-review` | `/performance-review owner/repo#123` | Algorithmic complexity, N+1, memory, caching |
| `/full-review` | `/full-review owner/repo#123 [--quick\|--focused\|--full]` | All perspectives in parallel + consolidated summary |
| `/list-prs` | `/list-prs [org/repo]` | List open PRs (accepts `--mine`, `--review-requested`) |
| `/approve-pr` | `/approve-pr owner/repo#123` | Approve after status check and confirmation |
| `/update-pricing` | `/update-pricing` | Fetch and update model pricing data |

## PR Reference Formats

All commands accept:
- `owner/repo#123` — full format
- `repo#123` — assumes `default_org` from config.json
- `#123` — needs repo context
- Full URL: `https://github.com/owner/repo/pull/123`

## Review Comment Standards

- Post reviews via the GitHub Reviews API (`gh api repos/{owner}/{repo}/pulls/{number}/reviews`) with inline comments on specific files/lines. Each finding that references a file goes as an inline comment; the review body contains only the summary, severity table, positive aspects, and recommendation. Fall back to `gh pr review --body` only when there are no file-specific findings.
- Severity levels: 🔴 CRITICAL, 🟠 MAJOR, 🟡 MINOR, 🔵 SUGGESTION, ✅ POSITIVE
- Include file and line references when possible
- When a finding references a specific file and line, always include the relevant code snippet from the diff (current code) and a suggested fix when applicable
- End with recommendation: APPROVE, REQUEST_CHANGES, or COMMENT
- Files matching `config.json > review.ignore_patterns` must be skipped
- Generate reviews in the language configured in `config.json > review.language`
- PRs with more files than `config.json > review.max_files_inline_review` (default: 30) should use summary-level feedback rather than per-file inline comments

## Rules

- NEVER approve PRs automatically without explicit user confirmation
- NEVER post reviews without first showing the preview to the user
- Respect `.gitignore` and do not analyze generated files (bin/, obj/, node_modules/, dist/)
- For C# repos: focus on Clean Architecture, DDD, SOLID
- For TypeScript repos: focus on type safety, hooks patterns, component design
- When perspectives disagree on severity for the same finding, use the higher severity
- Deduplicate findings that multiple perspectives flag — keep the most detailed version and note which perspectives flagged it
- Commands should read local source files for context when available, not just the PR diff
