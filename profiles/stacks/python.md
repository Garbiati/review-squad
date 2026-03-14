# Profile: Python (Data/Scripts/Services)

## Tech Stack
- **Python 3.8+**
- **FastAPI** / **Flask** (for APIs)
- **Pandas** / **NumPy** (for data processing)
- **SQLAlchemy** (for ORM)
- **Airflow** (for pipeline orchestration)
- **Pytest** for tests

## Review Checklist

### Python
- [ ] Type hints on public functions
- [ ] Docstrings on public functions/classes
- [ ] No bare `except:` (catch specific exceptions)
- [ ] Use pathlib instead of os.path
- [ ] Virtual environment (requirements.txt or pyproject.toml updated)
- [ ] Code formatted (black/ruff)
- [ ] Linting (ruff/flake8)

### Data Processing
- [ ] Parameterized queries (no SQL injection)
- [ ] Handling of missing/null data
- [ ] Input schema validation
- [ ] Logging of metrics (rows processed, time, errors)
- [ ] Idempotency in ETL pipelines

### Security
- [ ] Credentials via environment variables
- [ ] No secrets in code
- [ ] Input sanitization
- [ ] Secure connections (SSL)

### Airflow Specific (when applicable)
- [ ] DAGs with retries configured
- [ ] Timeout on tasks
- [ ] No heavy logic in DAG file (use operators/hooks)
- [ ] Idempotency on tasks
