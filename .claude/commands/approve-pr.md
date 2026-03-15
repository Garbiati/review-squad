Approve the PR after confirmation: $ARGUMENTS

## Instructions

### 1. Parse the Reference
Extract owner, repo, and PR number.

### 2. Pre-Approval Check
Before approving, verify:
```bash
gh pr view <number> --repo <owner/repo> --json title,body,author,state,reviews,reviewDecision,statusCheckRollup
```

Show the user:
- PR title and author
- CI/CD check status
- Existing reviews
- Whether there are pending REQUEST_CHANGES from other reviewers

### 3. MANDATORY Confirmation
⚠️ **NEVER approve without explicit user confirmation.**

Ask:
"Confirm approval of PR #X '[title]' by @author? (yes/no)"

Optionally, ask for an approval comment.

### 4. Approval (only after explicit "yes")
```bash
gh pr review <number> --repo <owner/repo> --approve --body "<comment>"
```

If the user wants, they can also merge:
```bash
gh pr merge <number> --repo <owner/repo> --squash --delete-branch
```
But ONLY if the user explicitly requests it.

### 5. Send Notifications (after posting)
After the approval is successfully posted, send notifications to configured providers.

1. Read `config.json > notifications.providers` and iterate over each provider entry
2. For each provider where `enabled` is `true`:
   a. Check if the environment variable named in `env_var` is set and non-empty
   b. If not set, skip this provider silently
   c. Load the provider template from the `template` path
   d. Build the notification payload:

**Collect notification data (once, shared across all providers):**
- `ICON` — `✅` (approval)
- `REVIEW_TYPE_LABEL` — localized from i18n (`notifications.approval_posted`)
- `OWNER`, `REPO`, `NUMBER`, `PR_TITLE`, `AUTHOR` — PR metadata
- `PR_URL` — `https://github.com/<owner>/<repo>/pull/<number>`
- `RECOMMENDATION` — APPROVE
- `RECOMMENDATION_EMOJI` — ✅
- `SUMMARY_TABLE` — empty (not applicable for approvals)
- `REVIEW_BODY` — approval comment truncated to `notifications.settings.max_body_length` (if `include_review_body` is true). Append i18n `truncated` label if truncated.

**Resolve author mention (per provider):**
Follow the user resolution algorithm in `templates/user-resolution.md` to resolve
the PR author's GitHub username to a provider-specific user ID. This uses the
priority chain: manual mapping → cache → auto-resolve by email → ask user → fallback.

**Send notification:**
```bash
curl -s -X POST "$<ENV_VAR_NAME>" \
  -H "Content-Type: <content_type_from_template>" \
  -d '<payload_json>'
```

3. After all providers: show summary (e.g., "Notification sent via slack." or "Notifications skipped (not configured).")
4. Notification failures must NOT fail the approval command — log warning and continue.
