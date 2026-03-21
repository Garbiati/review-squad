# Multi-Model Support

review-squad's profiles and templates are **model-agnostic** — they are pure domain knowledge written in Markdown. The integration layer adapts them to each AI coding tool.

## Integration Status

| Tool | Status | Slash Commands | Agent Parallelism | gh CLI | Notes |
|------|--------|---------------|-------------------|--------|-------|
| **Claude Code** | ✅ Full | ✅ Native | ✅ Agent tool | ✅ Native | Primary integration |
| **Cursor** | 🟡 Experimental | ❌ Manual | ❌ No | ❌ Manual | Via .cursorrules |
| **Aider** | 🟡 Experimental | ❌ Manual | ❌ No | ❌ Manual | Via .aider.conf.yml |
| **Codex CLI** | 🟡 Experimental | ❌ Manual | ❌ No | ✅ Native | Via AGENTS.md |

## What's Shared vs Tool-Specific

### Shared (Model-Agnostic)
These work with any AI tool that can read Markdown:
- `profiles/stacks/*.md` — Stack review checklists
- `profiles/agents/*.md` — Specialist agent knowledge
- `templates/*.md` — Output formatting
- `templates/i18n/*.json` — Localized labels
- `config.json` — Repository mappings and settings

### Tool-Specific
Each integration adapts the shared knowledge to the tool's capabilities:
- `CLAUDE.md` — Claude Code system instructions
- `.claude/commands/` — Claude Code slash commands
- `integrations/cursor/.cursorrules` — Cursor system instructions
- `integrations/aider/.aider.conf.yml` — Aider config
- `integrations/codex-cli/AGENTS.md` — Codex CLI instructions

## Adding a New Integration

1. Create `integrations/your-tool/`
2. Add the tool's config/instruction file that references the shared profiles
3. Add a `README.md` with setup instructions
4. Update this document with the tool's status

## Key Differences by Tool

### Claude Code
- Full slash command support (`/review-pr`, `/full-review`, etc.)
- Parallel agent execution via the Agent tool
- Direct `gh` CLI access for fetching PRs and posting reviews
- Hooks for validation (e.g., checking config.json exists)

### Cursor
- No slash commands — use natural language ("review this PR for security issues")
- Reads `.cursorrules` for system context
- May need manual diff pasting for PRs
- Works well for reviewing local changes before opening a PR

### Aider
- Code-editing focused — better for implementing fixes than reviewing
- Can read profiles as context files
- No direct PR integration
- Best used for pre-commit reviews of local changes

### Codex CLI
- Reads `AGENTS.md` for instructions
- Has shell access for `gh` CLI
- Different tool-calling model than Claude Code
- Experimental — capabilities evolving
