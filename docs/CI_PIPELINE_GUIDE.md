# RetailFlow POS — CI Security & Quality Pipeline Guide

This document describes the automated CI pipeline defined in [ci-security-quality.yml](file:///C:/Users/vasan/antigravity/RetailFlow-POS-2026-11-23-78c68/.github/workflows/ci-security-quality.yml) and [dependabot.yml](file:///C:/Users/vasan/antigravity/RetailFlow-POS-2026-11-23-78c68/.github/dependabot.yml).

## Pipeline Stages

1. **`frontend-quality`**:
   - Installs pinned dependencies (`npm ci` via `package-lock.json`).
   - Runs TypeScript typechecking/linting (`npm run lint`), barcode unit tests, and critical E2E workflow tests (`npm test`).
   - Runs `npm audit --omit=dev --audit-level=high` and builds `dist/` with a non-production `VITE_API_BASE_URL`.
2. **`backend-security-and-tests`**:
   - Compiles Java 21 / Maven backend (`mvn -B compile test-compile`).
   - Executes all unit tests, `SecurityHardeningTests` (IDOR, RBAC, token revocation, `no-store` headers), and `InventoryConcurrencyMySqlTests` (real MySQL 8.0 via Testcontainers + Flyway `V1`–`V5` schema validation).
   - Uploads Surefire XML/TXT test reports as artifacts.
3. **`security-scans`**:
   - Runs Gitleaks secret scanning across Git history.
   - Runs GitHub CodeQL SAST for `java` and `javascript-typescript`.
4. **`docker-scan`**:
   - Builds `backend/Dockerfile` and scans the image with Trivy (`CRITICAL,HIGH` CVEs fail the build).
5. **`release-gate`**:
   - Requires all four upstream jobs to pass; never auto-deploys unreviewed commits to production.

## Maintenance Instructions

- **Branch Protection:** Configure GitHub branch protection on `main` to require `frontend-quality`, `backend-security-and-tests`, `security-scans`, `docker-scan`, and `release-gate` before merging PRs.
- **Dependency Updates:** Dependabot opens weekly PRs for `npm`, `maven`, and `github-actions`; review and let the CI pipeline pass before merging.
- **Test Credentials:** Never place production `JWT_SECRET`, TiDB credentials, or customer data in workflow files; all CI tests use ephemeral H2 / Testcontainers MySQL instances.
