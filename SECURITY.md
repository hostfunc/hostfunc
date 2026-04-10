# Security policy

## Reporting a vulnerability

Email: security@openfn.dev (set up the address before going public)

Please include:
- A description of the vulnerability
- Steps to reproduce
- Affected versions
- Suggested fix (if any)

We'll acknowledge within 48 hours and aim to release a fix within 7 days
for critical issues.

## Scope

In scope:
- Sandbox escapes
- Auth bypass
- Cross-tenant data leaks
- Secret exposure

Out of scope:
- DoS via execution limits (use the rate limiter)
- Vulnerabilities in third-party dependencies (report to them)

## Hall of fame

We credit reporters here once issues are fixed and disclosed.