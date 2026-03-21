# Claude Code Integration

This is the **primary integration** — review-squad was built for Claude Code.

## Setup

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
2. Authenticate with GitHub CLI: `gh auth login`
3. Copy `config.example.json` to `config.json` and configure your org/repos
4. Open Claude Code in the project directory:
   ```bash
   cd review-squad
   claude
   ```
5. All slash commands are available automatically

## How It Works

Claude Code reads:
- `.claude/commands/*.md` — slash commands that define review flows
- `CLAUDE.md` — system instructions and project rules
- `profiles/` — stack and agent profiles loaded on demand
- `templates/` — output formatting templates

The commands orchestrate `gh` CLI calls to fetch PR data, analyze diffs using the profiles, and post reviews.

## Available Commands

| Command | Description |
|---------|-------------|
| `/review-pr` | Stack-specialized code review |
| `/security-review` | OWASP/CVE security analysis |
| `/test-review` | Test coverage and quality |
| `/qa-review` | Edge cases, regressions, compatibility |
| `/architecture-review` | SOLID, layering, coupling |
| `/performance-review` | Algorithmic complexity, N+1, memory |
| `/full-review` | All agents in parallel |
| `/list-prs` | List open PRs |
| `/approve-pr` | Approve with confirmation |
