# Sample Review Output

This is a fictional example of a `/review-pr` output for a .NET Core API.

> **Note:** On GitHub, the review body contains the summary and recommendation. Each finding below is posted as an inline comment on the respective file.

---

## 🔍 Code Review - Add patient search endpoint with filtering

**Repo:** acme-health/backend-api | **PR:** #247 | **Author:** @jane-dev
**Profile applied:** dotnet-core-api
**Review tier:** Focused

---

### Summary

This PR adds a new patient search endpoint with support for filtering by name, date of birth, and status. The implementation follows the existing CQRS pattern using MediatR and includes FluentValidation for input validation. Overall, the code is well-structured and follows the project's Clean Architecture patterns. A few issues with query performance and missing pagination need attention.

### Findings

#### 🔴 Critical

*No critical findings.*

#### 🟠 Major

**1. Missing pagination on search endpoint**
**File:** `src/API/Controllers/PatientController.cs` (line 45)
Returning all matching patients without pagination could lead to memory issues and slow responses for large result sets.

**Current code:**
```csharp
[HttpGet("search")]
public async Task<ActionResult<List<PatientDto>>> Search([FromQuery] SearchPatientsQuery query)
{
    var results = await _mediator.Send(query);
    return Ok(results);
}
```

**Suggested fix:**
```csharp
[HttpGet("search")]
public async Task<ActionResult<PagedResult<PatientDto>>> Search([FromQuery] SearchPatientsQuery query)
{
    var results = await _mediator.Send(query);
    return Ok(results);
}
```

**2. N+1 query on patient address loading**
**File:** `src/Infrastructure/Repositories/PatientRepository.cs` (line 78)
Each patient loads their address in a separate query. Use `.Include()` to load addresses eagerly.

**Current code:**
```csharp
var patients = await _context.Patients.Where(p => p.Name.Contains(name)).ToListAsync();
foreach (var patient in patients)
{
    patient.Address = await _context.Addresses.FirstOrDefaultAsync(a => a.PatientId == patient.Id);
}
```

**Suggested fix:**
```csharp
var patients = await _context.Patients
    .Include(p => p.Address)
    .Where(p => p.Name.Contains(name))
    .ToListAsync();
```

#### 🟡 Minor

**3. Missing AsNoTracking for read-only query**
**File:** `src/Infrastructure/Repositories/PatientRepository.cs` (line 72)
Search queries are read-only and should use `AsNoTracking()` to improve performance.

**Current code:**
```csharp
var patients = await _context.Patients
    .Include(p => p.Address)
    .Where(p => p.Name.Contains(name))
    .ToListAsync();
```

**Suggested fix:**
```csharp
var patients = await _context.Patients
    .AsNoTracking()
    .Include(p => p.Address)
    .Where(p => p.Name.Contains(name))
    .ToListAsync();
```

**4. Validation message could be more specific**
**File:** `src/Application/Validators/SearchPatientsQueryValidator.cs` (line 12)
`"Name is invalid"` could be `"Name must contain at least 2 characters"`.

**Current code:**
```csharp
RuleFor(x => x.Name).MinimumLength(2).WithMessage("Name is invalid");
```

**Suggested fix:**
```csharp
RuleFor(x => x.Name).MinimumLength(2).WithMessage("Name must contain at least 2 characters");
```

#### 🔵 Suggestions

**5. Consider adding response caching**
The patient search results could benefit from short-lived caching (30s) since the data doesn't change frequently.

**6. Add [ProducesResponseType] attributes**
Swagger documentation would be more complete with explicit response type annotations.

#### ✅ Positive

**7. Good separation of concerns** — Query handler delegates to repository, validation is in its own class.

**8. FluentValidation used correctly** — Input validated before reaching the handler.

---

### Recommendation
**REQUEST_CHANGES** — The missing pagination (#1) and N+1 query (#2) should be addressed before merge. Both are straightforward fixes.
