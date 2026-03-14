# Profile: TypeScript Node.js (Backend/Services)

## Tech Stack
- **TypeScript** with Node.js
- **Express** / **Fastify** / **NestJS** (check)
- **Socket.io** (for real-time services)
- **Prisma** / **TypeORM** / **Knex** (check ORM)

## Review Checklist

### Node.js
- [ ] Proper error handling (no process.exit in production)
- [ ] Graceful shutdown
- [ ] Environment variables validated on startup
- [ ] Structured logging (no console.log in production)
- [ ] No callback hell (use async/await)

### TypeScript
- [ ] Strict mode enabled
- [ ] No `any` types
- [ ] Error types defined
- [ ] Zod/Joi for runtime validation

### API Design
- [ ] RESTful or consistent with project patterns
- [ ] Standardized error responses
- [ ] Rate limiting
- [ ] Input validation on all routes

### Performance
- [ ] Connection pooling for databases
- [ ] Streams for large data
- [ ] Proper caching
- [ ] Don't block the event loop (CPU-intensive operations in workers)
