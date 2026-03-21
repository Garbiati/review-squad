# Adding Stack Profiles

Stack profiles define what to look for when reviewing code in a specific tech stack.

## Quick Start

1. Create `profiles/stacks/your-stack.md`
2. Add repo mapping in `config.json`
3. Done — the review commands will use it automatically

## Profile Template

```markdown
# Profile: [Stack Name]

## Tech Stack
- **[Primary language/framework]** version X+
- **[ORM/data layer]**
- **[Testing framework]**
- **[Other key libraries]**

## Architectural Patterns
- [Expected architecture]
- [Design patterns]
- [Project structure]

## Review Checklist

### [Category 1]
- [ ] [Specific, actionable check item]
- [ ] [Another check item]

### [Category 2]
- [ ] [Check item]

### [Tests]
- [ ] [Testing expectations]
```

## Guidelines

- **Be specific**: "Use `AsNoTracking()` for read queries" is better than "optimize queries"
- **Be actionable**: Each item should be something a reviewer can verify in the diff
- **Use checkbox format**: `- [ ]` for consistency with all other profiles
- **Include categories**: Group items by concern (Security, Performance, Tests, etc.)
- **Cover the stack's unique risks**: What's the most common mistake in this stack?

## Config Mapping

Add your repo-to-profile mapping in `config.json`:

```json
{
  "repo_profiles": {
    "your-org/kotlin-api": "kotlin",
    "your-org/kotlin-lib": "kotlin"
  }
}
```

## Auto-Detection

If no mapping exists, review commands will auto-detect the primary language via the GitHub API and map to the closest profile. Add your language mapping to the auto-detection logic in the review commands if needed.

## Existing Profiles

| Profile | File | Key Focus |
|---------|------|-----------|
| .NET Core API | `dotnet-core-api.md` | Clean Architecture, DDD, EF Core |
| .NET Background Service | `dotnet-core-service.md` | Idempotency, resilience, messaging |
| .NET Auth Server | `dotnet-auth.md` | OAuth2, JWT, extreme security |
| .NET Shared Library | `dotnet-shared-lib.md` | SemVer, backward compatibility |
| .NET Legacy API | `dotnet-legacy-api.md` | Tolerant review, don't worsen |
| TypeScript React | `typescript-react.md` | Hooks, type safety, accessibility |
| TypeScript React Native | `typescript-react-native.md` | Mobile perf, touch UX, security |
| TypeScript Node.js | `typescript-node.md` | Event loop, error handling, streams |
| Python | `python.md` | Type hints, ETL, Airflow |
| Vue.js | `vue.md` | Composition API, Pinia/Vuex |
| SQL/T-SQL | `sql.md` | Idempotent scripts, performance |
| Go | `go.md` | Error handling, goroutines, interfaces |
| Rust | `rust.md` | Ownership, unsafe, Result/Option |
| Java Spring | `java-spring.md` | Bean lifecycle, transactions, JPA |
| Default | `default.md` | Generic code quality checks |
