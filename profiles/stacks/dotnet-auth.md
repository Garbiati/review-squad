# Profile: .NET Auth Server

## Tech Stack
- **.NET Core** with **IdentityServer4** or similar
- **ASP.NET Core Identity**
- **JWT / OAuth2 / OpenID Connect**
- **SQL Server** for persistence

## MAXIMUM ATTENTION - Security
This is an authentication server. EVERY change must be analyzed with extreme rigor.

## Review Checklist

### Authentication
- [ ] JWT tokens with adequate lifetime (not too long)
- [ ] Refresh tokens with rotation
- [ ] Rigorous claims validation
- [ ] Do not expose sensitive information in tokens
- [ ] PKCE for public flows

### Passwords and Credentials
- [ ] Hashing with bcrypt/Argon2 (NEVER MD5/SHA1 for passwords)
- [ ] Password policy enforcement
- [ ] Rate limiting on login endpoints
- [ ] Account lockout after failed attempts
- [ ] Never log passwords or tokens

### OAuth/OIDC
- [ ] Redirect URIs validated (no wildcards accepted)
- [ ] State parameter mandatory
- [ ] Minimum necessary scopes
- [ ] Client secrets adequately protected

### Infrastructure
- [ ] HTTPS mandatory
- [ ] CORS configured restrictively
- [ ] Security headers (HSTS, X-Frame-Options, etc.)
- [ ] Audit logging of authentication events
