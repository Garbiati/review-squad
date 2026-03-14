# Profile: Go

## Tech Stack
- **Go 1.21+**
- **Standard library** (net/http, database/sql, encoding/json)
- **Chi** / **Gin** / **Echo** (check router)
- **sqlx** / **GORM** / **ent** (check ORM/query builder)
- **Testify** for assertions
- **Wire** / manual DI for dependency injection

## Review Checklist

### Error Handling
- [ ] All errors checked (no ignored return values)
- [ ] Errors wrapped with context (`fmt.Errorf("...: %w", err)`)
- [ ] Custom error types for domain errors
- [ ] No panic in library code (only in main/init when appropriate)
- [ ] Sentinel errors with `errors.Is()` / `errors.As()`

### Goroutines and Concurrency
- [ ] Goroutines have proper lifecycle management (no leaks)
- [ ] Channels properly closed by sender
- [ ] Context propagation and cancellation respected
- [ ] sync.Mutex used for shared mutable state
- [ ] WaitGroup for goroutine synchronization
- [ ] No data races (run with `-race` flag)

### Interfaces
- [ ] Interfaces defined by consumer, not implementor
- [ ] Small interfaces (1-3 methods ideally)
- [ ] Accept interfaces, return structs
- [ ] No unnecessary interface abstractions

### Code Organization
- [ ] Package names are short, lowercase, singular
- [ ] Internal packages for unexported code
- [ ] No circular imports
- [ ] Clean separation: handler → service → repository

### Performance
- [ ] `sync.Pool` for frequently allocated objects
- [ ] `strings.Builder` for string concatenation
- [ ] Proper buffer sizing for channels and slices
- [ ] Context timeout/deadline on external calls

### Testing
- [ ] Table-driven tests for multiple scenarios
- [ ] Test helpers with `t.Helper()`
- [ ] `httptest` for HTTP handler tests
- [ ] Subtests with `t.Run()`
