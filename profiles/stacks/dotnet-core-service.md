# Profile: .NET Core Background Service

## Tech Stack
- **.NET Core 3.1 / .NET 6+**
- **Worker Service** or **Hosted Services**
- **Message Queue** (RabbitMQ, Azure Service Bus, or similar)
- **Entity Framework Core**
- **SQL Server**

## Architectural Patterns
- Background processing with `IHostedService` or `BackgroundService`
- Event-driven architecture
- Retry patterns and circuit breakers
- Idempotency in message processing

## Review Checklist

### Message Processing
- [ ] Handlers are idempotent (reprocessing the same message causes no side effects)
- [ ] Dead letter queue configured for failing messages
- [ ] Retry with exponential backoff
- [ ] Timeout configured for long operations
- [ ] Adequate logging for traceability

### Resilience
- [ ] Circuit breaker for external calls
- [ ] Graceful shutdown (CancellationToken respected)
- [ ] Health checks implemented
- [ ] Metrics and monitoring

### Concurrency
- [ ] Thread safety on shared state
- [ ] Avoid deadlocks in async code
- [ ] Connection pooling properly configured
- [ ] No tasks created without await (controlled fire-and-forget)
