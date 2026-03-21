# Aider Integration

Use review-squad profiles with [Aider](https://aider.chat/).

## Setup

1. Copy `.aider.conf.yml` from this directory to the review-squad root
2. Copy `config.example.json` to `config.json` and configure
3. Run aider in the project directory

## How It Works

Aider reads `.aider.conf.yml` for configuration. The config references review-squad profiles as read-only context files, so Aider can use them when analyzing code.

## Usage

```bash
# Start aider with review context
aider --read profiles/stacks/dotnet-core-api.md --read profiles/agents/security.md

# Then ask for a review
> Review the changes in PR #123 using the security checklist
```

## Status

**Experimental** — Aider is primarily a code editing tool. Review workflows require manual orchestration (fetching diffs, loading profiles, posting results).

## Limitations

- No native PR integration (must fetch diffs manually)
- No slash commands (use natural language)
- No agent parallelism
- Best suited for reviewing local changes before opening a PR
