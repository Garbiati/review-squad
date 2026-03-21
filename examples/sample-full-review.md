# Sample Full Review Output

This is a fictional example of a `/full-review` output with 6 agents running in parallel.

> **Note:** On GitHub, the review body contains the summary, consolidated table, and recommendation. Each finding below is posted as an inline comment on the respective file.

---

## 📋 Full Review - Add JWT refresh token rotation

**Repo:** acme-health/auth-service | **PR:** #89 | **Author:** @alex-sec
**Branch:** feature/refresh-token-rotation → main
**Changes:** +342 / -28 in 12 files
**Review tier:** Full

---

### 📝 Code Review
**Profile:** dotnet-auth

The PR implements refresh token rotation following RFC 6749 recommendations. Token family tracking is well-implemented with proper cascade invalidation. The migration adds appropriate indexes.

#### 🟡 MINOR — Magic number for token lifetime
**File:** `src/Services/TokenService.cs` (line 34)
`TimeSpan.FromDays(30)` should be configurable via `IOptions<TokenSettings>`.

#### ✅ POSITIVE — Token family invalidation
Invalidating the entire token family on reuse detection is the correct approach per security best practices.

---

### 🛡️ Security Review

#### 🟠 MAJOR — Timing attack on token comparison — CWE-208
**File:** `src/Services/TokenService.cs` (line 67)
Token comparison uses `==` instead of constant-time comparison, potentially vulnerable to timing attacks.

**Current code:**
```csharp
if (storedToken.Value == providedToken)
```

**Suggested fix:**
```csharp
if (CryptographicOperations.FixedTimeEquals(
    Encoding.UTF8.GetBytes(storedToken.Value),
    Encoding.UTF8.GetBytes(providedToken)))
```

#### 🔵 SUGGESTION — Add rate limiting on token refresh endpoint
Consider adding rate limiting to prevent refresh token brute-force attempts.

---

### 🧪 Test Review

#### Test Coverage
| Changed File | Tests Exist | Scenarios Covered | Gap |
|-------------|-------------|-------------------|-----|
| TokenService.cs | ✅ | 5/8 | Missing: expired family, concurrent refresh, invalid format |
| RefreshTokenRepository.cs | ✅ | 3/3 | - |
| TokenController.cs | ❌ | 0/3 | Missing integration tests |

#### 🟠 MAJOR — Missing test for concurrent refresh race condition
**Affected code:** `TokenService.RefreshAsync()` — concurrent refresh requests could both succeed if not properly synchronized.

**Suggested test:**
```csharp
[Fact]
public async Task RefreshAsync_ConcurrentRequests_OnlyOneSucceeds()
{
    // Arrange
    var token = await CreateValidRefreshToken();

    // Act
    var task1 = _service.RefreshAsync(token.Value);
    var task2 = _service.RefreshAsync(token.Value);
    var results = await Task.WhenAll(task1, task2);

    // Assert
    results.Count(r => r.IsSuccess).Should().Be(1);
    results.Count(r => r.IsFailure).Should().Be(1);
}
```

---

### 🎯 QA Review

#### 🟠 MAJOR — Token family invalidation doesn't notify active sessions
**File:** `src/Services/TokenService.cs` (line 89)
When a token family is invalidated due to reuse detection, existing sessions using tokens from that family continue to work until their access token expires. Consider emitting an event to force re-authentication.

**Current code:**
```csharp
await _repository.InvalidateFamily(token.FamilyId);
return Result.Fail("Token reuse detected");
```

**Suggested fix:**
```csharp
await _repository.InvalidateFamily(token.FamilyId);
await _domainEvents.Publish(new TokenFamilyCompromisedEvent(token.FamilyId, token.UserId));
return Result.Fail("Token reuse detected");
```

#### 🟡 MINOR — No user-facing error message for "token family compromised"
**File:** `src/Controllers/TokenController.cs` (line 52)
The error response returns a generic 401. A specific error code would help client apps show appropriate messaging (e.g., "Your session was terminated for security reasons. Please log in again.").

**Current code:**
```csharp
return Unauthorized();
```

**Suggested fix:**
```csharp
return Unauthorized(new { error = "session_terminated", message = "Your session was terminated for security reasons. Please log in again." });
```

---

### 🏗️ Architecture Review

#### 🔵 SUGGESTION — Consider separating token generation from validation
**File:** `src/Services/TokenService.cs` (line 1)
`TokenService` handles both token generation and validation. As complexity grows, splitting into `TokenGenerator` and `TokenValidator` would improve single responsibility.

**Current code:**
```csharp
public class TokenService : ITokenService
{
    public async Task<TokenResult> GenerateAsync(User user) { ... }
    public async Task<TokenResult> RefreshAsync(string refreshToken) { ... }
    public async Task<bool> ValidateAsync(string token) { ... }
    public async Task RevokeAsync(string token) { ... }
}
```

**Suggested refactoring:**
```csharp
public class TokenGenerator : ITokenGenerator
{
    public async Task<TokenResult> GenerateAsync(User user) { ... }
    public async Task<TokenResult> RefreshAsync(string refreshToken) { ... }
}

public class TokenValidator : ITokenValidator
{
    public async Task<bool> ValidateAsync(string token) { ... }
    public async Task RevokeAsync(string token) { ... }
}
```

#### ✅ POSITIVE — Good use of domain events
Token reuse detection emits a domain event, allowing other systems (audit, alerting) to react without coupling.

---

### ⚡ Performance Review

#### 🟡 MINOR — Missing index on RefreshToken.FamilyId
**File:** `src/Migrations/AddRefreshTokenRotation.cs`
Queries by `FamilyId` for cascade invalidation will benefit from an index, especially as the token table grows.

#### ✅ POSITIVE — Efficient cascade invalidation
Using a single UPDATE with WHERE FamilyId instead of loading and updating individual tokens.

---

### 📊 Consolidated Summary

| Category | 🔴 Critical | 🟠 Major | 🟡 Minor | 🔵 Suggestion | ✅ Positive |
|----------|-------------|----------|----------|---------------|------------|
| Code | 0 | 0 | 1 | 0 | 1 |
| Security | 0 | 1 | 0 | 1 | 0 |
| Testing | 0 | 1 | 0 | 0 | 0 |
| QA | 0 | 1 | 1 | 0 | 0 |
| Architecture | 0 | 0 | 0 | 1 | 1 |
| Performance | 0 | 0 | 1 | 0 | 1 |
| **Total** | **0** | **3** | **3** | **2** | **3** |

### Final Recommendation
**REQUEST_CHANGES**
Three major findings need attention: timing attack vulnerability in token comparison (Security), missing tests for concurrent refresh (Testing), and session invalidation gap (QA). The security fix is critical for an auth service.

### Next Steps
1. Fix timing attack vulnerability with `CryptographicOperations.FixedTimeEquals`
2. Add concurrent refresh test and verify behavior
3. Consider session invalidation notification for compromised token families
4. Add missing index on FamilyId
