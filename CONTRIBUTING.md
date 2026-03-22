# Contributing to review-squad

Thanks for your interest in contributing! review-squad is a prompt-based system (zero executable code), so contributing is as simple as editing Markdown and JSON files.

## Repository Structure

### Branches

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Stable, production-ready | PR required, 1 approval, no force push, linear history |
| `staging` | Homologation / pre-release testing | PR required, 1 approval, no force push |
| `develop` | Active development integration | No force push, no deletion |

### Branch Flow

```
feature/* ──→ develop ──→ staging ──→ main
fix/*     ──→ develop ──→ staging ──→ main
hotfix/*  ──→ main (via PR, emergency only)
docs/*    ──→ develop ──→ staging ──→ main
```

### Naming Conventions

| Prefix | Use for | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/add-ruby-profile` |
| `fix/` | Bug fixes | `fix/slack-notification-format` |
| `hotfix/` | Urgent production fixes | `hotfix/security-token-leak` |
| `docs/` | Documentation only | `docs/improve-setup-guide` |
| `i18n/` | Translations | `i18n/add-spanish` |

## How to Contribute

### 1. Fork and Clone

```bash
gh repo fork Garbiati/review-squad --clone
cd review-squad
git checkout develop
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature develop
```

### 3. Make Your Changes

Edit the relevant Markdown/JSON files. See [What to Contribute](#what-to-contribute) below.

### 4. Test Locally

```bash
# Verify gh CLI is authenticated
gh auth status

# Test your changes with a real PR
# /review-pr owner/repo#123
```

### 5. Commit and Push

```bash
git add <your-files>
git commit -m "Add ruby stack profile"
git push origin feature/your-feature
```

### 6. Open a Pull Request

```bash
gh pr create --base develop --title "Add ruby stack profile" --body "..."
```

> **Important:** All PRs must target `develop`, not `main`. PRs to `main` go through `staging` first.

### 7. Wait for Review

The repository maintainer ([@Garbiati](https://github.com/Garbiati)) will review and approve your PR. Currently, only the maintainer can approve and merge pull requests.

## What to Contribute

### Add a Stack Profile

1. Create `profiles/stacks/your-stack.md` following the format below
2. Add mapping in `config.example.json` → `repo_profiles` (as a comment/example)
3. Open a PR targeting `develop`

**Stack profile format** (`profiles/stacks/`):
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

### Add a Specialist Agent

1. Create `profiles/agents/your-agent.md` with role description and analysis checklist
2. Create `.claude/commands/your-agent-review.md` with the review command flow
3. Update `.claude/commands/full-review.md` to include the new agent
4. Open a PR targeting `develop`

**Agent profile format** (`profiles/agents/`):
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

### Add an Integration

1. Create `integrations/your-tool/README.md` with setup instructions
2. Add any tool-specific config files
3. Open a PR targeting `develop`

### Add a Translation

1. Create `templates/i18n/your-locale.json` following the `en.json` format
2. Open a PR targeting `develop`

### Improve Existing Content

- Add missing checklist items to profiles
- Improve descriptions and examples
- Fix typos or clarify documentation

## Guidelines

- **Keep profiles focused** — each checklist item should be actionable
- **Be language-agnostic in agents** — specialist agents (security, testing, etc.) should work across all stacks
- **Follow existing format** — look at existing profiles for the expected structure
- **Test your changes** — try your profile/command with a real PR before submitting
- **One concern per PR** — don't mix unrelated changes
- **Write clear commit messages** — describe what and why, not how

## Labels

| Label | Description |
|-------|-------------|
| `new-profile` | New stack or agent profile |
| `new-integration` | New tool integration adapter |
| `i18n` | Internationalization / new language |
| `templates` | Review templates and formatting |
| `slack-bot` | Slack bot integration |
| `notifications` | Notification system |
| `security` | Security related changes |
| `breaking-change` | Introduces breaking changes |
| `good first issue` | Good for newcomers |

## Development Setup

No build step, no tests to run — just edit Markdown and JSON files.

**Prerequisites:**
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed
- [GitHub CLI](https://cli.github.com/) authenticated (`gh auth status`)
- Copy `config.example.json` to `config.json` and fill in your details

## Maintainer Workflow

> This section describes how the maintainer promotes changes through environments.

```
develop → staging:  gh pr create --base staging --head develop
staging → main:     gh pr create --base main --head staging
```

Each promotion requires a PR and approval. Hotfixes bypass staging via `hotfix/*` → `main` PRs.

## Future: Contributor Permissions

We plan to introduce a tiered contributor system:

- **Contributor** — can open PRs (current default for everyone)
- **Trusted Contributor** — can be assigned as reviewer after consistent quality contributions
- **Maintainer** — can approve and merge PRs

Elevation criteria will be documented as the community grows. For now, all approvals go through [@Garbiati](https://github.com/Garbiati).

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to make code reviews better.
