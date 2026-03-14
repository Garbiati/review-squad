# Profile: Rust

## Tech Stack
- **Rust (latest stable)**
- **Tokio** / **async-std** for async runtime
- **Actix-web** / **Axum** / **Rocket** (check web framework)
- **SQLx** / **Diesel** / **SeaORM** (check database)
- **Serde** for serialization
- **Clap** for CLI argument parsing

## Review Checklist

### Ownership and Lifetimes
- [ ] Ownership semantics correct (no unnecessary cloning)
- [ ] Lifetimes explicit only when compiler cannot infer
- [ ] References preferred over owned values when possible
- [ ] `Cow<str>` for flexible ownership when needed
- [ ] No unnecessary `Box`, `Rc`, or `Arc`

### Error Handling
- [ ] `Result<T, E>` used for fallible operations (not panics)
- [ ] Custom error types with `thiserror` or manual implementation
- [ ] Error context with `anyhow` (applications) or custom types (libraries)
- [ ] `?` operator for error propagation
- [ ] `unwrap()` / `expect()` only in tests or truly invariant conditions

### Unsafe Code
- [ ] `unsafe` blocks have clear justification comments
- [ ] Minimal scope for unsafe blocks
- [ ] Safety invariants documented
- [ ] Prefer safe abstractions over raw unsafe
- [ ] FFI boundaries properly validated

### Type System
- [ ] Newtype pattern for domain types (avoid primitive obsession)
- [ ] Enums for state machines and variants
- [ ] `Option<T>` vs default values (prefer Option for optional data)
- [ ] Trait implementations appropriate and complete
- [ ] Derive macros used where applicable (Debug, Clone, PartialEq)

### Performance
- [ ] Iterator chains preferred over manual loops with indices
- [ ] `&str` preferred over `String` in function parameters
- [ ] Stack allocation where possible (avoid unnecessary heap)
- [ ] Proper use of `Vec::with_capacity` for known sizes

### Async
- [ ] No blocking calls in async context
- [ ] `tokio::spawn` for concurrent tasks
- [ ] Proper cancellation handling
- [ ] `Send + Sync` bounds where needed

### Testing
- [ ] Unit tests in `#[cfg(test)]` module
- [ ] Integration tests in `tests/` directory
- [ ] Property-based testing for invariants (proptest/quickcheck)
- [ ] `#[should_panic]` for expected panics
