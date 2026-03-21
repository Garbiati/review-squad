# Adding Specialist Agents

Specialist agents provide a focused review perspective (security, testing, QA, etc.). Each agent sees the same diff but analyzes it through a different lens.

## Quick Start

1. Create `profiles/agents/your-agent.md`
2. Create `.claude/commands/your-agent-review.md`
3. Add to `full-review.md` for parallel execution
4. Done

## Agent Profile Template

```markdown
# Specialist Agent: [Name]

## Role
You are a [specialization] specialist performing review focused on [focus area].
Your perspective is that of [viewpoint description].

## Analysis Scope

### [Category 1]
- [What to look for]
- [Specific checks]

### [Category 2]
- [What to look for]

### By Stack

#### C# / .NET
- [Stack-specific checks]

#### TypeScript
- [Stack-specific checks]

#### Python
- [Stack-specific checks]

## Output Format
For each finding:
- 🔴 **CRITICAL**: [When to use critical]
- 🟠 **MAJOR**: [When to use major]
- 🟡 **MINOR**: [When to use minor]
- 🔵 **SUGGESTION**: [When to use suggestion]
- ✅ **POSITIVE**: [When to use positive]
```

## Command Template

Create `.claude/commands/your-agent-review.md`:

```markdown
Perform a [TYPE] analysis on PR: $ARGUMENTS

## Instructions

### 1. Parse the Reference
Extract owner, repo, and PR number. Accepted formats:
- `owner/repo#123` | `repo#123` (assumes `default_org` from config.json) | GitHub URL

### 2. Data Collection
\`\`\`bash
gh pr view <number> --repo <owner/repo> --json title,body,author,files
gh pr diff <number> --repo <owner/repo>
\`\`\`

### 3. Load Context
Read the specialist profile at `profiles/agents/your-agent.md`.

### 4. Analysis
[Describe what to analyze and how]

### 5. Report Generation
Read the review language from `config.json > review.language` and generate the report in that language.

### 6. Confirmation before posting
Show the report and ask if the user wants to post it on the PR.
```

## Adding to Full Review

Edit `.claude/commands/full-review.md` to include your agent:

1. Add it to the agent list in step 5
2. Add a section in the consolidation template in step 6
3. Add a row in the summary table

## Existing Agents

| Agent | File | Focus |
|-------|------|-------|
| Security | `security.md` | OWASP, CVEs, secrets, injection |
| Testing | `testing.md` | Coverage, quality, anti-patterns |
| QA | `qa.md` | Edge cases, regressions, compatibility |
| Architecture | `architecture.md` | SOLID, layering, coupling, patterns |
| Performance | `performance.md` | Complexity, N+1, memory, caching |

## Ideas for New Agents

- **Accessibility**: WCAG compliance, aria attributes, keyboard navigation
- **Documentation**: API docs, code comments, README updates
- **DevOps**: Dockerfile, CI/CD, infrastructure-as-code
- **Data Privacy**: GDPR/LGPD compliance, PII handling, data retention
- **API Design**: REST maturity, GraphQL best practices, versioning
