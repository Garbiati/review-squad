# Profile: SQL/T-SQL Scripts

## Context
Database scripts for SQL Server (T-SQL).

## Review Checklist

### Security
- [ ] No DROP TABLE/DATABASE without WHERE or confirmation
- [ ] Adequate permissions (GRANT/REVOKE)
- [ ] No sensitive data in scripts

### Performance
- [ ] Adequate indexes for queries
- [ ] Avoid SELECT * in production
- [ ] Efficient JOINs
- [ ] Use SET NOCOUNT ON in procedures
- [ ] Transactions with minimum scope

### Maintainability
- [ ] Idempotent scripts (IF EXISTS before CREATE)
- [ ] Rollback scripts when applicable
- [ ] Consistent naming conventions
- [ ] Comments on complex logic
