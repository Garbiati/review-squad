# Profile: .NET Legacy API

## Tech Stack
- **.NET Core** (possibly older version)
- **ASP.NET Core WebAPI**
- **Entity Framework Core**
- **SQL Server**
- Legacy project with older patterns

## Special Context
This is a legacy API with established patterns.
Default branch may be `development`.

## Review Standards
- Apply the same standards as the `dotnet-core-api` profile
- **Be more tolerant** with existing legacy patterns
- Focus on: does the change IMPROVE or WORSEN the code?
- Do not require massive refactoring of existing code
- If new code follows the project's old pattern, suggest the modern pattern as SUGGESTION, not MAJOR

## Special Attention
- Check backward compatibility of endpoints
- Watch for breaking changes in API contracts
- Validate that EF migrations won't cause downtime
- Verify that changes are compatible with existing consumers
