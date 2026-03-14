# Contributing to review-squad

Thanks for your interest in contributing! review-squad is a prompt-based system (zero executable code), so contributing is as simple as editing Markdown and JSON files.

## Ways to Contribute

### Add a Stack Profile
1. Create `profiles/stacks/your-stack.md` following the existing format
2. Include: tech stack description, architectural patterns, and review checklist
3. Open a PR with the new profile

### Add a Specialist Agent
1. Create `profiles/agents/your-agent.md` with role description and analysis checklist
2. Create `.claude/commands/your-agent-review.md` with the review command flow
3. Update `.claude/commands/full-review.md` to include the new agent
4. Open a PR

### Add an Integration
1. Create `integrations/your-tool/README.md` with setup instructions
2. Add any tool-specific config files
3. Open a PR

### Improve Existing Profiles
- Add missing checklist items
- Improve descriptions and examples
- Add language/framework-specific checks

### Add Translations
1. Create `templates/i18n/your-locale.json` following the `en.json` format
2. Open a PR

## Guidelines

- **Keep profiles focused** — each checklist item should be actionable
- **Be language-agnostic in agents** — specialist agents (security, testing, etc.) should work across all stacks
- **Follow existing format** — look at existing profiles for the expected structure
- **Test your changes** — try your profile/command with a real PR before submitting

## Profile Format

Stack profiles (`profiles/stacks/`) should follow this structure:
```markdown
# Profile: [Stack Name]

## Tech Stack
- [List of technologies]

## Architectural Patterns
- [Expected patterns]

## Review Checklist

### [Category]
- [ ] [Actionable check item]
```

Agent profiles (`profiles/agents/`) should follow this structure:
```markdown
# Specialist Agent: [Name]

## Role
[One paragraph describing the agent's perspective]

## Analysis Scope

### [Category]
- [What to look for]

## Output Format
[Severity classification and finding format]
```

## Development

No build step, no tests to run — just edit Markdown files. The only requirement for local testing is:
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- [GitHub CLI](https://cli.github.com/) authenticated

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to make code reviews better.
