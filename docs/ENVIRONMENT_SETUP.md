# Thali.com — Environment Setup and Deployment

## 1. Prerequisites

- Node.js LTS compatible with the selected Vite version.
- npm or the package manager used by the repository.
- Git.
- Supabase development project.
- Online payment gateway sandbox account when gateway integration begins.

## 2. Local development

1. Open the repository.
2. Inspect `package.json`, existing routes, environment configuration, and current project structure.
3. Install dependencies using the repository's package manager.
4. Configure development environment variables.
5. Create and apply database migrations.
6. Start the app using the script actually defined in `package.json`.
7. Verify authentication and RLS before implementing payment or check-in flows.
8. Keep development data separate from real member records.

Do not assume a start script or replace the existing project configuration without checking it first.

## 3. Environment variables

A typical frontend configuration may use:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Trusted server-side configuration may include:

```
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_GATEWAY_KEY_ID=
PAYMENT_GATEWAY_KEY_SECRET=
PAYMENT_WEBHOOK_SECRET=
```

The server-side variables must never be bundled into the browser. Use the provider's secret-management system for Edge Functions or backend services.

Create an `.env.example` containing blank placeholders. Never commit actual credentials to Git.

## 4. Database migrations

- Keep schema changes in version-controlled SQL migration files.
- Apply migrations to development first.
- Review indexes, constraints, functions, and RLS policies.
- Test migrations in staging before production.
- Capture any emergency schema fix in a migration.
- Never assume the production schema matches local development without checking.

## 5. PWA requirements

- Configure a web app manifest.
- Add suitable application icons.
- Test installability on supported browsers.
- Use HTTPS.
- Cache static assets cautiously.
- Do not treat cached data as current payment or check-in confirmation.
- Do not implement offline meal deduction in the first release.

## 6. Deployment checklist

- Production domain and HTTPS configured.
- Staging and production projects separated.
- Production environment variables verified.
- RLS enabled and tested.
- Owner account created securely.
- Public signup cannot create privileged roles.
- Meal check-in function tested for concurrency and idempotency.
- Gateway webhooks verified server-side.
- Secrets absent from frontend bundles.
- Camera scanning tested on target devices.
- Member import reconciled.
- Backup and restore tested.
- Error logging configured without secrets or raw QR tokens.
- Staff trained on network failures and rejected check-ins.
- Owner signs off on business rules.

## 7. Operational support

Maintain a short runbook for:

- Failed or delayed payment verification.
- Member unable to access a QR pass.
- Invalid or revoked QR token.
- Check-in timeout with unknown result.
- Accidental check-in correction.
- Member-number mismatch.
- Import failure.
- Database or network outage.

Every manual correction must follow the same authorization and audit requirements as normal operations.
