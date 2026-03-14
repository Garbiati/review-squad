# Profile: .NET Core API (WebAPI)

## Tech Stack
- **.NET Core 3.1 / .NET 6+** (check version in .csproj)
- **ASP.NET Core WebAPI** with REST controllers
- **Entity Framework Core** for data access
- **SQL Server** as primary database
- **AutoMapper** for DTO <-> Entity mapping
- **FluentValidation** for validations
- **MediatR** for CQRS (when present)
- **Swagger/OpenAPI** for documentation

## Expected Architectural Patterns
- **Clean Architecture** with layers: API → Application → Domain → Infrastructure
- **DDD** (Domain-Driven Design) with Entities, Value Objects, Aggregates
- **Repository Pattern** with Unit of Work
- **CQRS** with Commands and Queries separated (via MediatR when applicable)
- **Dependency Injection** native to ASP.NET Core

## Review Checklist

### Controllers
- [ ] Controllers should be thin (delegate logic to services/handlers)
- [ ] Use `[ApiController]` attribute
- [ ] Return `ActionResult<T>` with correct status codes
- [ ] Validation via FluentValidation, not manual in controller
- [ ] No business logic in the controller
- [ ] Use `[ProducesResponseType]` for Swagger documentation

### Services / Handlers
- [ ] Single Responsibility - each service/handler does one thing
- [ ] Do not access HttpContext directly in services
- [ ] Use interfaces for DI
- [ ] Proper exception handling (do not swallow exceptions)

### Domain
- [ ] Entities with encapsulation (private setters)
- [ ] Immutable Value Objects
- [ ] Domain validations in entity constructor/methods
- [ ] No data annotations in domain (use FluentValidation)

### Repository / Data Access
- [ ] No raw SQL queries without parameterization (SQL Injection)
- [ ] Use async/await for I/O operations
- [ ] Avoid N+1 queries (use Include/ThenInclude)
- [ ] Do not return IQueryable from repositories
- [ ] Migrations with descriptive names

### Configuration
- [ ] Secrets not hardcoded (use appsettings, env vars, or vault)
- [ ] Connection strings via configuration, not hardcoded
- [ ] Use Options Pattern for typed configuration

### Performance
- [ ] Use `AsNoTracking()` for read queries
- [ ] Pagination on endpoints that return lists
- [ ] Avoid loading entire object graphs
- [ ] Caching when appropriate

### Tests
- [ ] Unit tests for domain logic
- [ ] Integration tests for repositories
- [ ] Use mocks/stubs for external dependencies
- [ ] Naming: `MethodUnderTest_Scenario_ExpectedResult`
