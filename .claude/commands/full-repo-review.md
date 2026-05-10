Execute a FULL REPO REVIEW on the master branch and open GitHub issues for each finding: $ARGUMENTS

This command analyzes an entire repository (not a PR diff), surfaces tech debt / security / architecture / breaking-change findings, and **creates GitHub issues** with stable IDs for deduplication across runs. Designed to run periodically (monthly) or on demand for repo health checks.

## Instructions

### 1. Parse the Reference and Tier

Extract `owner/repo` from the argument. Accepted formats:
- `owner/repo`
- `repo` (assumes `default_org` from config.json)
- Full GitHub URL

**Tier selection:** Check arguments for `--quick`, `--focused`, `--full`, `--dry-run`.
- If no flag: use `config.json > repo_review.default_tier` (fallback: `"focused"`)
- **Quick**: `tech-debt` only, top 15 hotspots, no dedup against existing issues, no issue creation (preview only)
- **Focused** (default): `security`, `architecture`, `tech-debt`, `breaking-change-detector`, top 30 hotspots, dedup enabled
- **Full**: all 6 standard perspectives + `tech-debt` + `breaking-change-detector`, by-layer chunking, no hotspot cap (still respects `cost_cap_usd`)
- **`--dry-run`**: any tier, but skips actual issue creation — only shows preview

The tier's agent list can be overridden by `config.json > repo_review.tiers.<tier>.agents`.

### 2. Cost cap check (before doing anything expensive)

Read `config.json > repo_review.cost_cap_usd` (default: `50`). Estimate the run upfront:
- `estimated_tokens = files_to_analyze * avg_file_tokens * num_perspectives * 1.3` (1.3 = consolidation overhead)
- `estimated_cost = estimated_tokens * pricing` (use the active model from `config.json > review.usage.default_model`, fallback `claude-opus-4-6`)

If `estimated_cost > cost_cap_usd`: STOP, display the estimate, and ask the user to either raise the cap, choose a smaller tier, or pass `--force-cap`.

### 3. Repo setup and baseline detection

1. **Locate the local clone**:
   - Check common parents: `~/projects/<repo>`, `~/code/<repo>`, `~/work/<repo>`, plus the parent of the current working directory.
   - If not found, ask the user where the clone is OR offer to `git clone https://github.com/<owner>/<repo>.git /tmp/review-squad/<repo>` (read-only — do not push from this clone).
2. **Checkout `master`** (or `main` if `master` doesn't exist) and `git pull --ff-only` to ensure freshness.
3. **Detect baseline** per `config.json > repo_review.baseline_strategy`. Apply this fallback chain:
   - `"last_tag"` (default): `git describe --tags --abbrev=0`. If no tags exist, fall back to step b.
   - `"days_ago:<N>"`: `git rev-list -1 --before="<N> days ago" HEAD`. If empty (repo younger than N days), fall back to step b.
   - **Fallback b — first commit**: `git rev-list --max-parents=0 HEAD | tail -1` — guaranteed to exist for any non-empty repo. Annotate the baseline label as `(initial commit, repo is N days old)` so the user understands the comparison window.
   - `"sha:<SHA>"`: use the literal SHA (no fallback — fail loudly if invalid).
4. **Save the original branch name** to a temp file (e.g. `/tmp/full-repo-review-<repo>-original-branch.txt`) so step 14 can restore it. This is mandatory — never leave the user's working tree on a different branch than they started on.
5. **Record metadata**: baseline ref, baseline SHA, HEAD SHA, branch name. These go into the epic tracker and every child issue.

### 4. Build the repo map

Independent of tier, gather:

1. **Languages**: `gh api repos/{owner}/{repo}/languages`
2. **File counts** by extension in the local checkout
3. **Hotspots** (always — even `--full` uses these for ordering): top 30 (focused) / top 15 (quick) files by churn:
   ```bash
   git log --since="90 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -30
   ```
   Filter out `config.json > review.ignore_patterns` paths.
4. **Profile**: resolve via `config.json > repo_profiles[<owner>/<repo>]`, with auto-detection fallback (same algorithm as `/full-review`).
5. **`.review-squad-ignore`**: if the file exists at the repo root, parse it. Lines are gitignore-style globs; matched files are excluded from analysis AND any finding referencing them is filtered out.

### 5. Determine perspectives to run

Use the tier's agent list from `config.json > repo_review.tiers.<tier>.agents`. Defaults:
- **Quick**: `["tech-debt"]`
- **Focused**: `["security", "architecture", "tech-debt", "breaking-change-detector"]`
- **Full**: `["code", "security", "testing", "qa", "architecture", "performance", "tech-debt", "breaking-change-detector"]`

Filter out perspectives where `config.json > agents.available[<name>].enabled` is `false`. (The two new perspectives default to `true`.)

### 6. Execute perspectives in parallel

Launch all perspectives in PARALLEL using the Agent tool. Each agent uses Opus with **maximum thinking budget** for depth. Pass:

- The selected file list (hotspots) **read into the prompt** — you do the file reading once and pass excerpts; agents do not re-read.
- The repo profile (`profiles/stacks/<profile>.md`)
- The agent's own profile (`profiles/agents/<agent>.md`)
- The baseline ref + HEAD SHA (especially needed by `breaking-change-detector`)
- The `.review-squad-ignore` patterns (so agents skip ignored files)
- Output format requirement (severity-classified findings with `Stable ID`, see §7)

**For `breaking-change-detector` specifically:** also pass the diff between baseline and HEAD for: all interfaces (`grep -r "public interface"`), all DTO directories, all controller files (route attributes), all migration files. Do NOT pass internal implementation diffs — that's noise for this agent.

**Per-perspective prompt template:**
> You are the {{PERSPECTIVE_NAME}} specialist on a repo-wide review (NOT a PR diff). Profile: see {{PROFILE_PATH}}. The repo's stack profile is {{STACK_PROFILE}}.
>
> **Goal**: surface findings that justify creating a GitHub issue. Each finding must be self-contained — a developer reading just the issue (no run context) should know what to do.
>
> **Files to analyze** (top {{N}} hotspots):
> {{FILE_EXCERPTS}}
>
> **Baseline:** `{{BASELINE_REF}}` ({{BASELINE_SHA}})
> **HEAD:** `{{HEAD_SHA}}`
>
> Use extended thinking. Be deep, not broad. Skip nitpicks.
>
> For each finding, output: title (short, dedup-friendly), severity, files affected, why-it-matters (impact), suggested fix (with snippet), effort estimate (S/M/L/XL), Stable ID (sha1 of normalized title — see §7).

### 7. Stable ID generation

The **Stable ID** lets future runs detect "this finding already has an open issue" and update it instead of creating a duplicate.

Algorithm:
```
normalized_title = lowercase(title)
                     .replace_regex(r"\d+", "N")          # strip line numbers
                     .replace_regex(r"\s+", " ")           # normalize whitespace
                     .strip()
stable_id = sha1(perspective + "|" + normalized_title)[0:12]
```

Examples:
- `"God class: AppointmentService.cs (1247 lines, 28 methods)"` → normalized: `"god class: appointmentservice.cs (n lines, n methods)"` → stable across runs even when the line count changes.
- `"Skipped test in PaymentTests.cs:84"` → normalized: `"skipped test in paymenttests.cs:n"` → stable when the line shifts.

Each finding MUST carry its Stable ID; consolidation uses it for intra-run dedup.

### 8. Consolidation and intra-run dedup

After all perspectives return:

1. **Intra-run dedup by Stable ID**: if two perspectives flag the same Stable ID, merge them — keep the most detailed body and union the perspective list.
2. **Severity ranking**: critical → major → minor → suggestion.
3. **Conflict resolution**: when perspectives disagree on severity, use the higher one.
4. **Apply max cap**: if total findings > `config.json > repo_review.issues.max_issues_per_run` (default 30), keep top N by severity (critical first, then major, etc.) — log the rest to the tracker as "deferred".
5. **Filter ignored**: drop findings whose primary file matches a `.review-squad-ignore` pattern.

### 9. Dedup against existing GitHub issues

For each remaining finding, query existing issues:
```bash
gh issue list --repo <owner/repo> --label review-squad --state all --limit 200 --json number,title,body,state,labels
```

Match by **Stable ID** (look for `Stable ID: <id>` in the body):
- **Open match found**: do NOT create a new issue. Instead, post a comment on the existing one:
  ```
  Still present as of run `<RUN_ID>` (HEAD `<sha>`).
  Affected files updated: <new file list>
  ```
- **Closed as `wontfix` or `won't fix`**: skip silently (respect prior decision). Only re-flag if `config.json > repo_review.issues.skip_wontfix` is `false`.
- **Closed as resolved (any other reason)**: re-create as a new issue and add a body note: `> Re-detected after previous resolution in #<old-issue-number>.`
- **No match**: queue for creation.

### 10. Preview and confirmation

Always show the user a preview before creating any issue:

```
═══════════════════════════════════════════════════════════════
📋 Repo Review Preview — <owner>/<repo>
═══════════════════════════════════════════════════════════════

Tier: focused | Baseline: v2.4.1 | HEAD: 21bb596 | Files analyzed: 30

Findings to create as new issues: 12
  🔴 Critical: 3
  🟠 Major: 5
  🟡 Minor: 3
  🚨 Breaking: 1

Findings updating existing open issues: 4

Findings skipped (wontfix or .review-squad-ignore): 2

Estimated cost: ~$18.30 USD (~250K tokens, claude-opus-4-6, ~6m 14s)

Issues will be created with labels: review-squad, severity:<level>, <perspective>
Epic tracker will be created: "📋 Repo health check — 2026-05-10"

═══════════════════════════════════════════════════════════════
```

Then list each issue with: `[severity] title — files (N) — effort (S/M/L/XL) — [NEW|UPDATE #123]`.

**Confirmation prompt**:
- If `--dry-run`: stop here, do not create anything.
- Otherwise ask: "Criar todas as issues acima? (yes / no / select)"
  - `yes` → create all
  - `no` → abort
  - `select` → interactive selection by number

**Auto-create rule**: if the tier is `quick`, NEVER auto-create — always require confirmation.

### 11. Issue creation

For each confirmed finding:

1. **Render the issue body** from `templates/issues/repo-review-issue.md` using the finding fields.
2. **Build labels**:
   - `review-squad` (always)
   - `severity:critical|major|minor|suggestion` (one)
   - `<perspective>` (e.g., `security`, `architecture`, `tech-debt`)
   - `breaking-change` (additionally, if from `breaking-change-detector` OR severity bumped due to breaking)
3. **Resolve assignee** per `config.json > repo_review.issues.assignee_strategy`:
   - `"none"`: no assignee
   - `"code_owners"`: parse `.github/CODEOWNERS`, find owner of the primary file
   - `"author"`: assign to git blame author of the affected lines
4. **Create the issue**:
   ```bash
   gh issue create --repo <owner/repo> \
     --title "<title>" \
     --body-file tmp/issue-<stable_id>.md \
     --label "review-squad,severity:major,architecture" \
     --assignee "<resolved-assignee-or-blank>"
   ```
5. **Capture the issue number** for the epic tracker.

For each **UPDATE** (existing issue), instead:
```bash
gh issue comment <number> --repo <owner/repo> --body-file tmp/comment-<stable_id>.md
```

### 12. Create the epic tracker

After all child issues exist:

1. **Render** `templates/issues/epic-tracker.md` with the run summary, child issue links grouped by perspective, breaking-change list, positives, run metadata.
2. **Create the tracker issue**:
   ```bash
   gh issue create --repo <owner/repo> \
     --title "📋 Repo health check — <YYYY-MM-DD>" \
     --body-file tmp/epic-tracker.md \
     --label "review-squad,epic-tracker"
   ```
3. **Cross-link**: post a comment on each child issue pointing back to the tracker:
   ```bash
   gh issue comment <child#> --repo <owner/repo> --body "Tracked in #<tracker#>"
   ```

If `config.json > repo_review.issues.create_epic_tracker` is `false`, skip steps 1-3.

### 13. Send notifications

Per `config.json > notifications.providers`, send a Slack/Teams/Discord summary mirroring `/full-review`'s pattern but with **issue links** instead of inline review URL.

Slack payload structure:
- **Header**: `📋 Repo Review — <owner>/<repo>`
- **Executive summary**: counts + cost + duration + tracker link
- **Top 5 critical findings** (truncated bodies, links to issues)
- **Breaking changes** section (always include, even if empty — say "Nenhum breaking change detectado")
- **Tracker link** as primary action button

Use `templates/notifications/slack.json` as base; add a section for the issue/tracker URLs.

### 14. Restore original branch (mandatory cleanup)

Before declaring done, restore the user's original branch:
```bash
ORIGINAL_BRANCH=$(cat /tmp/full-repo-review-<repo>-original-branch.txt)
cd <local_clone> && git checkout "$ORIGINAL_BRANCH"
```

If the working tree was dirty when the command started (status was non-empty), do NOT have switched branches in step 3 in the first place — analyze the current branch in-place via `git show master:<file>` reads instead. Never leave the user with their working state altered.

### 15. Usage estimation

Same as `/full-review` step 6b — display in console if `REVIEW_VERBOSE=true`. Include the cost in the epic tracker body regardless.

## Rules

- **NEVER create issues without user confirmation** (unless `--auto-confirm` is passed AND `config.json > repo_review.auto_confirm` is `true`).
- **NEVER create more than `max_issues_per_run` issues** in a single run — cap and defer the rest.
- **NEVER push to the repo** — this command is read-only on the local clone.
- **Respect `wontfix` decisions** unless explicitly overridden.
- **Always include Stable ID** in every issue body (in the `<details>` block).
- **Always create the epic tracker** unless explicitly disabled — it's the only way users can navigate findings without searching.
- **Breaking changes ALWAYS get an issue**, even if other findings are capped out — they bypass `max_issues_per_run`.
- **Honor `.review-squad-ignore`** at the repo root (gitignore-style globs).
- **Cost cap is hard** — abort if estimate exceeds, do not silently degrade.
- **Idempotent**: running twice on the same SHA must not create duplicates (Stable ID + existing-issue lookup guarantee this).
