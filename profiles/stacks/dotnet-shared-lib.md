# Profile: .NET Shared Library

## Context
Shared library used by multiple projects in the organization.
Changes here impact ALL consumers.

## Review Checklist

### Versioning
- [ ] Follow SemVer rigorously
- [ ] Breaking changes must increment MAJOR version
- [ ] CHANGELOG updated

### API Surface
- [ ] Well-defined public interfaces
- [ ] Do not expose internal types unnecessarily
- [ ] Backward compatibility maintained (or breaking change documented)
- [ ] XML documentation on public APIs

### Dependencies
- [ ] Minimum external dependencies
- [ ] Do not force specific package versions on consumers
- [ ] Use abstractions (interfaces) for optional dependencies

### Quality
- [ ] 100% unit test coverage for public APIs
- [ ] No unexpected side effects
- [ ] Thread-safe when applicable
- [ ] No implicit dependency injection (library should not register its own services)
