List open PRs: $ARGUMENTS

## Instructions

### Parse the Argument
The argument can be:
- `owner/repo` — list PRs for a specific repo
- `repo` — assumes `default_org` from config.json
- empty — list PRs for ALL repos in the `default_org` from config.json
- `--mine` — list only PRs where I am a reviewer or author
- `--review-requested` — list PRs where my review was requested

### For a specific repo:
```bash
gh pr list --repo <owner/repo> --state open --json number,title,author,createdAt,baseRefName,headRefName,additions,deletions,reviewDecision,labels,isDraft --limit 20
```

### For the entire org (when no argument):
Read `default_org` from config.json and use it:
```bash
gh search prs --owner <default_org> --state open --sort updated --limit 30 --json repository,number,title,author,createdAt,updatedAt
```

### For PRs pending my review:
```bash
gh search prs --review-requested=@me --state open --owner <default_org> --json repository,number,title,author,createdAt
```

### Output Format
Present in an organized table:

```markdown
## Open PRs - [repo or org]

| # | Repo | Title | Author | Created | +/- | Status |
|---|------|-------|--------|---------|-----|--------|
| #123 | backend-api | PR Title | @user | 2d ago | +50/-20 | ⏳ Pending |

**Total:** X open PRs
```

For each PR, include a hint on how to review:
```
💡 For full review: /full-review owner/repo#123
```
