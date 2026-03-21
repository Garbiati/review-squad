# Cursor Integration

Use review-squad profiles with [Cursor](https://cursor.sh/).

## Setup

1. Copy `.cursorrules` from this directory to your project root (or to the review-squad root)
2. Copy `config.example.json` to `config.json` and configure
3. Open the project in Cursor

## How It Works

Cursor reads `.cursorrules` as system instructions. The rules file references the review-squad profiles and templates, adapting the slash command flow to Cursor's chat interface.

## Status

**Experimental** — Cursor does not have native slash command support like Claude Code, so the workflow is conversation-based. You can paste a PR URL and ask Cursor to review it using the profiles.

## Limitations

- No native slash commands (use natural language instead)
- No direct `gh` CLI integration (you may need to paste diffs manually)
- Agent parallelism depends on Cursor's multi-file capabilities
