# Thali.com — Security and Row Level Security

## 1. Security objective

Protect member identity, payment information, subscription balances, check-in history, and admin operations. The browser is untrusted; hiding a button is not a security boundary.

## 2. Role permission matrix

| Action                  | Owner/Admin      | Receptionist          | Member               | Menu Manager |
| ----------------------- | ---------------- | --------------------- | -------------------- | ------------ |
| View all members        | Yes              | Limited lookup        | No                   | No           |
| Edit member records     | Yes              | No                    | Own permitted fields | No           |
| Import members          | Yes              | No                    | No                   | No           |
| Scan/check in meals     | Yes              | Yes                   | Own venue-QR flow    | No           |
| Manual check-in         | Yes              | If explicitly enabled | No                   | No           |
| Verify cash/UPI         | Yes              | No                    | No                   | No           |
| View all payments       | Yes              | No                    | No                   | No           |
| View own payment status | Yes              | Limited if needed     | Yes                  | No           |
| Adjust meal balance     | Yes, with reason | No                    | No                   | No           |
| Extend/carry-forward    | Yes, with reason | No                    | No                   | No           |
| Manage staff roles      | Yes              | No                    | No                   | No           |
| Manage menus            | Yes              | No                    | No                   | Yes          |
| View audit logs         | Yes              | No                    | No                   | No           |

## 3. Authentication and roles

- Use a trusted authentication provider.
- Resolve roles from a protected database record.
- Never accept a role from an untrusted request body.
- Public signup must never create an admin or receptionist account.
- Privileged role changes require admin permission and an audit record.
- Define a secure owner bootstrap process before production.

## 4. RLS requirements

Enable RLS on all tables exposed through the client API.

### Members

- Members can access only their own linked profile.
- Receptionists receive only fields required for check-in.
- Admins have authorized management access.
- Public users cannot enumerate the member database.

### Subscriptions

- Members can view their own subscriptions.
- Receptionists should only see the minimum eligibility result needed for check-in.
- Only trusted functions/admin operations may activate, cancel, extend, or modify subscriptions.

### Payments

- Members can view their own payment status.
- Receptionists cannot verify payments or access all financial records.
- Gateway status changes come from trusted server-side verification.
- Users cannot change payment status directly.

### Meal transactions

- Members can read their own history.
- Receptionists can initiate a permitted check-in through a restricted operation.
- Direct client-side inserts or updates to accepted meal transactions must be blocked.
- Corrections use a separate authorized function and audit record.

### Menus

- Members can read published menus.
- Menu Managers and admins can edit menus.
- Draft menus must not be exposed to unauthorized users.

### Audit logs

- Application roles cannot modify or delete historical audit records.
- Only authorized users can read audit logs.

## 5. Secrets and environment variables

- Never include the Supabase service-role key in frontend code.
- Never expose payment gateway secrets through `VITE_` environment variables.
- Keep webhook secrets in trusted server-side configuration.
- Do not commit `.env` files to version control.
- Use empty placeholders in `.env.example`.
- Avoid logging passwords, authentication tokens, raw QR tokens, or payment secrets.

## 6. Payment security

- Verify gateway signatures server-side.
- Check expected amount, currency, order ID, and subscription/member association.
- Deduplicate gateway events using stable provider event IDs.
- Keep client redirects separate from payment verification.
- Prevent the same verified payment from granting credits twice.
- Record manual verification actor and timestamp.

## 7. QR security

- Use high-entropy, random tokens.
- Store token hashes where feasible.
- Support token revocation.
- Use short-lived venue/session tokens where practical.
- Avoid returning sensitive profile data for invalid QR attempts.
- Apply reasonable rate limiting to repeated invalid attempts if supported.

## 8. Audit events

Log:

- Role changes.
- Payment verification, rejection, and refund.
- Subscription activation and queueing.
- Manual check-ins.
- Meal adjustments, reversals, carry-forward, and extensions.
- Member imports and significant edits.
- Menu publication and edits.
- Operational setting changes.

Each record should contain actor, action, target, timestamp, and reason when required. Include safe before/after values where useful.

## 9. Production checklist

- HTTPS enabled.
- RLS tested with permitted and forbidden requests.
- No secrets in frontend bundles.
- Secure database functions verified.
- Payment webhook verification tested.
- QR token lifecycle tested.
- Admin bootstrap secured.
- Backup and restore tested.
- Staging and production credentials separated.
- Member data access and exports reviewed.
