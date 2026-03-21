# OpenAI Codex CLI Integration

Use review-squad profiles with [Codex CLI](https://github.com/openai/codex).

## Setup

1. Copy `AGENTS.md` from this directory to the review-squad root
2. Copy `config.example.json` to `config.json` and configure
3. Run Codex CLI in the project directory

## How It Works

Codex CLI reads `AGENTS.md` as system instructions (similar to how Claude Code reads `CLAUDE.md`). The instructions reference the review-squad profiles and define the review workflow.

## Status

**Experimental** — Codex CLI has different capabilities than Claude Code. The core profiles and templates are model-agnostic, but the orchestration flow may need adjustment.

## Limitations

- Different tool-calling capabilities than Claude Code
- May not support parallel agent execution
- `gh` CLI integration depends on Codex CLI's shell access
