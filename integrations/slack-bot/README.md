# review-squad Slack Bot

A Slack bot that lets team members trigger PR reviews directly from Slack. It acts as a thin bridge between Slack and the Claude Code SDK — all review logic (prompts, profiles, templates, notifications) is reused from the main review-squad project.

## How it works

```
Slack (/review org/repo#123)
  → Bot receives command via Socket Mode (WebSocket, no public URL)
  → Invokes Claude Code SDK with the /full-review prompt
  → Claude Code reads profiles, runs perspectives, posts review to GitHub
  → Bot updates Slack message with progress and final result
```

The bot **never** reimplements review logic. It only:
1. Parses the Slack command
2. Starts a headless Claude Code session pointing at the review-squad directory
3. Streams progress updates to Slack
4. Reports completion or errors

## Prerequisites

- Node.js 20+
- `gh` CLI authenticated (`gh auth status`)
- review-squad `config.json` configured (see root README)
- A Slack workspace where you can create apps

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it (e.g., "Review Squad") and select your workspace

### Enable Socket Mode

3. **Settings → Socket Mode** → Toggle **Enable Socket Mode** to On
4. Create an App-Level Token with the `connections:write` scope → copy the `xapp-...` token

### Add Slash Command

5. **Features → Slash Commands** → **Create New Command**
   - Command: `/review`
   - Short Description: `Trigger a PR code review`
   - Usage Hint: `owner/repo#123 [--quick|--focused|--full]`

### Set Bot Permissions

6. **Features → OAuth & Permissions** → Add these **Bot Token Scopes**:
   - `commands`
   - `chat:write`

### Install to Workspace

7. **Settings → Install App** → **Install to Workspace** → Authorize
8. Copy the **Bot User OAuth Token** (`xoxb-...`)

## Bot Setup

```bash
cd integrations/slack-bot
npm install
cp .env.example .env
```

Edit `.env` with your tokens:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-level-token
REVIEW_SQUAD_DIR=/absolute/path/to/review-squad
```

## Running

```bash
npm start
```

You should see:

```
⚡ review-squad Slack bot is running (Socket Mode)
   Default tier: focused
   Max concurrent: 1
   Rate limit: 5/user/hour
   Timeout: 10 minutes
```

For development with auto-reload:

```bash
npm run dev
```

## Usage

In any Slack channel where the bot is invited:

```
/review owner/repo#123              → review with default tier
/review owner/repo#123 --quick      → quick (code only, critical+major)
/review owner/repo#123 --focused    → focused (4 perspectives)
/review owner/repo#123 --full       → full (all 6 perspectives)
/review status                      → show running reviews
/review help                        → show usage
```

PR reference formats:
- `owner/repo#123` — full format
- `repo#123` — uses `default_org` from config.json
- Full GitHub PR URL

## Configuration

The bot reads its settings from `config.json > slack_bot`:

```json
{
  "slack_bot": {
    "default_tier": "focused",
    "max_concurrent_reviews": 1,
    "rate_limit_per_user_hour": 5,
    "max_turns": 100,
    "timeout_minutes": 10,
    "allowed_users": [],
    "allowed_channels": [],
    "auto_post": true
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `default_tier` | `focused` | Default review tier when no flag is specified |
| `max_concurrent_reviews` | `1` | Max reviews running simultaneously (conserves plan tokens) |
| `rate_limit_per_user_hour` | `5` | Max reviews per user per hour |
| `max_turns` | `100` | Max Claude Code turns per review (prevents infinite loops) |
| `timeout_minutes` | `10` | Abort review if it exceeds this duration |
| `allowed_users` | `[]` | Slack user IDs allowed to trigger reviews (empty = all) |
| `allowed_channels` | `[]` | Channel IDs where the bot works (empty = all) |
| `auto_post` | `true` | Automatically post review to GitHub |

## Security

| Guardrail | Description |
|-----------|-------------|
| `allowed_users` | Restrict who can trigger reviews |
| `max_concurrent_reviews` | Prevents token exhaustion (default: 1 at a time) |
| `rate_limit_per_user_hour` | Per-user rate limiting |
| `disallowedTools` | Bot cannot edit/write files (`Edit`, `Write`, `NotebookEdit` blocked) |
| `event=COMMENT` | Bot never approves or requests changes — always posts as COMMENT |
| `maxTurns` | Prevents runaway sessions |
| Timeout | Hard abort after configured minutes |

## Architecture

The bot has three modules:

- **`src/app.ts`** — Slack Bolt app with Socket Mode, `/review` command handler, progress formatting
- **`src/reviewer.ts`** — Claude Code SDK wrapper, headless prompt injection, progress extraction from streamed messages
- **`src/config.ts`** — Loads review-squad `config.json`, validates environment variables
