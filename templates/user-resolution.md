## Resolve Author Mention for Notifications

When building notification payloads, resolve the PR author's GitHub username to provider-specific user IDs using this priority chain. Run this ONCE per review (not per provider) and reuse results across all enabled providers.

### Priority 1: Manual Override (config.json)

Look up `notifications.settings.user_mapping.<github_username>.<provider_name>`.
If found, use the provider template's `mention_format` with the mapped ID. **Done — skip remaining steps for this provider.**

### Priority 2: Local Cache (.user-mapping.json)

Read `.user-mapping.json` from the project root. If the file does not exist, skip to Priority 3.

Look up `<github_username>.<provider_name>` in the cache:
- If the entry exists AND `resolved_at` is within the configured TTL (`notifications.settings.user_resolution.ttl_days`, default: 90 days):
  - Use the cached `id` with the provider template's `mention_format`. **Done.**
- If the entry is expired (older than TTL), proceed to Priority 3 to re-resolve.

### Priority 3: Auto-Resolution

Check `notifications.settings.user_resolution.enabled` (default: `true`). If `false`, skip to Priority 4.

#### Step 3a — Get GitHub user email and name

```bash
# Try public profile first
GITHUB_EMAIL=$(gh api users/<github_username> --jq '.email // empty' 2>/dev/null)
GITHUB_NAME=$(gh api users/<github_username> --jq '.name // empty' 2>/dev/null)

# If no public email, try most recent commit in the PR's repo
if [ -z "$GITHUB_EMAIL" ]; then
  GITHUB_EMAIL=$(gh api "repos/<owner>/<repo>/commits?author=<github_username>&per_page=1" --jq '.[0].commit.author.email // empty' 2>/dev/null)
fi
```

Filter out unusable emails:
- Skip if email is empty
- Skip if email matches `*noreply*` (e.g., `user@users.noreply.github.com`)
- Skip if email matches `*github.com` (GitHub service emails)

If no usable email is found, skip to Priority 4.

#### Step 3b — Resolve per provider

**Slack:**

Requires `SLACK_RESOLVE_TOKEN` (or the env var name from `notifications.settings.user_resolution.slack_token_env`). If the token is not set, skip Slack auto-resolution.

```bash
SLACK_TOKEN_ENV=$(# read from config.json > notifications.settings.user_resolution.slack_token_env, default: "SLACK_RESOLVE_TOKEN")
SLACK_TOKEN=$(eval echo \$$SLACK_TOKEN_ENV)

if [ -n "$SLACK_TOKEN" ]; then
  SLACK_RESPONSE=$(curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
    "https://slack.com/api/users.lookupByEmail?email=$GITHUB_EMAIL")
fi
```

Parse the response:
- If `ok` is `true`: extract `user.id` and `user.real_name`
- If `ok` is `false` (e.g., `users_not_found`): no Slack user with this email — skip to Priority 4 for Slack

**Teams:**

Teams uses email (UPN) as the user identifier. No API call needed.
- Set `teams_id = $GITHUB_EMAIL`
- Set `teams_name = $GITHUB_NAME` (from GitHub profile)

**Discord:**

Discord webhooks do not support email-based user lookup. Cannot auto-resolve.
- Skip to Priority 4 for Discord.

#### Step 3c — Validate by name (fuzzy match)

Compare the GitHub display name with the provider's display name to increase confidence:

1. Normalize both names: lowercase, trim whitespace
2. **Confident** if any of these match:
   - Names are equal
   - First name (first word) is equal
   - One name fully contains the other
3. **Uncertain** if names don't match at all — proceed to Priority 4 for this provider

For Teams (where we only have the GitHub name, not a Teams name), skip name validation and accept the email match as sufficient.

#### Step 3d — Cache the result

If resolution was confident, write to `.user-mapping.json`:

Read the current cache, add/update the entry for `<github_username>`, and write back:

```json
{
  "<github_username>": {
    "github_email": "<email>",
    "github_name": "<name>",
    "<provider>": {
      "id": "<resolved_id>",
      "name": "<display_name>",
      "resolved_at": "<ISO 8601 timestamp>",
      "method": "email"
    }
  }
}
```

Merge with existing entries — do not overwrite other providers or other users. Use the provider template's `mention_format` with the resolved ID. **Done.**

### Priority 4: Interactive Fallback

**Terminal context (interactive):**

Show the user what was found and ask for input:

```
⚠️ Could not auto-resolve <provider> user for GitHub user @<github_username>.
   Email found: <email or "none">
   Name found: <name or "none">
   <Provider> lookup: <result or "skipped — no token">

   Please provide the <provider> user ID for @<github_username>:
   - Slack: the member ID (e.g., U0123ABC456 — find it in the user's Slack profile → ⋮ → Copy member ID)
   - Teams: the user's email/UPN
   - Discord: the user's numeric ID (enable Developer Mode → right-click user → Copy User ID)

   Or press Enter to skip (will use @<github_username> as fallback).
```

If the user provides an ID:
- Cache it in `.user-mapping.json` with `"method": "manual"`
- Use it with the provider's `mention_format`

**Headless context (Slack bot):**

The Slack bot resolves users BEFORE invoking Claude Code. If running headlessly (no terminal), skip the interactive prompt and proceed to Priority 5.

### Priority 5: Fallback

Use the provider template's `fallback_mention_format` with the GitHub username. This is the existing default behavior — no mention, just `@github-username`.

---

### Error Handling

- **All resolution failures are non-blocking.** If any step fails (API error, network timeout, malformed response, missing token), log a brief warning and fall through to the next priority.
- **Never block or fail the review** because of user resolution issues.
- **Cache write failures** are silently ignored — the next review will simply re-resolve.
- If `.user-mapping.json` is malformed, treat it as empty and proceed normally.
