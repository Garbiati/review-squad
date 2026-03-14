# Profile: Java Spring Boot

## Tech Stack
- **Java 17+** (check version)
- **Spring Boot 3.x** (or 2.x for legacy)
- **Spring Data JPA** / **Hibernate** for ORM
- **Spring Security** for auth
- **Spring MVC** or **Spring WebFlux** for web
- **Lombok** for boilerplate reduction
- **MapStruct** for DTO mapping
- **JUnit 5** + **Mockito** for tests

## Architectural Patterns
- Layered architecture: Controller → Service → Repository
- DTO pattern for API contracts
- Domain entities separate from persistence entities
- Configuration via `application.yml` / `application.properties`

## Review Checklist

### Bean Lifecycle
- [ ] Proper scope annotations (@Scope, default singleton is correct)
- [ ] No mutable shared state in singleton beans
- [ ] @PostConstruct / @PreDestroy used correctly
- [ ] Lazy initialization where appropriate (@Lazy)
- [ ] Constructor injection preferred over field injection

### Transactions
- [ ] @Transactional on service methods (not controllers)
- [ ] Correct propagation level (REQUIRED, REQUIRES_NEW, etc.)
- [ ] Read-only transactions for queries (`@Transactional(readOnly = true)`)
- [ ] Rollback rules for checked exceptions when needed
- [ ] No long-running transactions (keep scope minimal)

### Spring Security
- [ ] Endpoints properly secured (@PreAuthorize, SecurityFilterChain)
- [ ] CSRF protection enabled (or intentionally disabled for APIs)
- [ ] Password encoding with BCrypt
- [ ] Method-level security where appropriate
- [ ] Security configuration not overly permissive

### JPA / Hibernate
- [ ] Proper fetch types (LAZY by default, EAGER only when justified)
- [ ] N+1 query prevention (JOIN FETCH, @EntityGraph)
- [ ] Proper use of @Transactional boundaries
- [ ] Database indexes for frequently queried fields
- [ ] Flyway/Liquibase for migrations

### API Design
- [ ] Proper HTTP methods and status codes
- [ ] Request validation with @Valid and Bean Validation
- [ ] Consistent error response format (@ControllerAdvice)
- [ ] API versioning strategy
- [ ] Pagination for list endpoints (Pageable)

### Performance
- [ ] Connection pool sizing (HikariCP configuration)
- [ ] Caching with @Cacheable where appropriate
- [ ] Async processing with @Async for non-blocking operations
- [ ] Proper logging levels (not DEBUG in production)

### Testing
- [ ] @SpringBootTest for integration tests
- [ ] @WebMvcTest for controller tests
- [ ] @DataJpaTest for repository tests
- [ ] Testcontainers for database integration tests
- [ ] Proper use of MockMvc for API testing
