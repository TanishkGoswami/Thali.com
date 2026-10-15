# Thali.com — Database Schema

## 1. Design principles

- PostgreSQL is the source of truth.
- Preserve existing member numbers.
- Use UUID primary keys for internal record identity.
- Store money as integer paise.
- Keep payment, subscription, and meal history auditable.
- Use foreign keys, unique constraints, and check constraints.
- Put balance deductions in a trusted transactional operation.
- Enable and test RLS on every client-accessible table.

## 2. Core tables

### `profiles`

Stores application users and member/staff profile information.

| Column            | Type        | Notes                                                   |
| ----------------- | ----------- | ------------------------------------------------------- |
| `id`              | UUID        | Primary key; linked to Auth user when applicable        |
| `member_number`   | TEXT        | Unique legacy number; nullable for staff                |
| `full_name`       | TEXT        | Required                                                |
| `phone`           | TEXT        | Normalized contact number                               |
| `email`           | TEXT        | Optional                                                |
| `role`            | TEXT/ENUM   | `owner_admin`, `receptionist`, `member`, `menu_manager` |
| `status`          | TEXT/ENUM   | `active`, `inactive`, `archived`                        |
| `created_at`      | TIMESTAMPTZ | Creation time                                           |
| `updated_at`      | TIMESTAMPTZ | Update time                                             |
| `import_batch_id` | UUID        | Nullable import reference                               |

If member records must exist before users have login accounts, use a separate `members` table and a nullable link to the authenticated user. This is often preferable for migrating the paper register.

### `subscription_plans`

Stores configurable plan definitions.

| Column           | Type        | Notes                          |
| ---------------- | ----------- | ------------------------------ |
| `id`             | UUID        | Primary key                    |
| `name`           | TEXT        | Plan name                      |
| `price_paise`    | INTEGER     | Default 280000                 |
| `meal_allowance` | INTEGER     | Default 54                     |
| `validity_days`  | INTEGER     | Default 30                     |
| `is_active`      | BOOLEAN     | Whether available for purchase |
| `created_at`     | TIMESTAMPTZ | Creation time                  |

### `subscriptions`

Stores individual subscription periods.

| Column                       | Type        | Notes                                                 |
| ---------------------------- | ----------- | ----------------------------------------------------- |
| `id`                         | UUID        | Primary key                                           |
| `member_id`                  | UUID        | Member reference                                      |
| `plan_id`                    | UUID        | Plan reference                                        |
| `status`                     | TEXT/ENUM   | Pending, queued, active, expired, cancelled, refunded |
| `starts_at`                  | TIMESTAMPTZ | Period start                                          |
| `expires_at`                 | TIMESTAMPTZ | Period expiry                                         |
| `meals_granted`              | INTEGER     | Snapshot of purchased allowance                       |
| `created_at`                 | TIMESTAMPTZ | Creation time                                         |
| `activated_at`               | TIMESTAMPTZ | Activation time                                       |
| `renewal_of_subscription_id` | UUID        | Nullable previous subscription reference              |
| `created_by`                 | UUID        | Actor or system reference                             |

Do not activate a subscription while payment remains pending.

### `payments`

Stores payment attempts and receipts.

| Column                | Type        | Notes                                                             |
| --------------------- | ----------- | ----------------------------------------------------------------- |
| `id`                  | UUID        | Primary key                                                       |
| `member_id`           | UUID        | Member reference                                                  |
| `subscription_id`     | UUID        | Subscription reference                                            |
| `amount_paise`        | INTEGER     | Amount in paise                                                   |
| `method`              | TEXT/ENUM   | `cash`, `upi_direct`, `gateway`                                   |
| `status`              | TEXT/ENUM   | `pending`, `verified`, `failed`, `refunded`, `partially_refunded` |
| `provider`            | TEXT        | Optional gateway name                                             |
| `provider_order_id`   | TEXT        | Gateway order reference                                           |
| `provider_payment_id` | TEXT        | Gateway payment reference                                         |
| `reference_text`      | TEXT        | UPI or receipt reference                                          |
| `verified_by`         | UUID        | Verifier for manual methods                                       |
| `verified_at`         | TIMESTAMPTZ | Verification time                                                 |
| `created_at`          | TIMESTAMPTZ | Creation time                                                     |

Add uniqueness constraints for gateway IDs where appropriate. Keep gateway webhook event IDs in a separate event table or equivalent idempotency store.

### `meal_sessions`

Represents an actual lunch or dinner service.

| Column         | Type        | Notes                         |
| -------------- | ----------- | ----------------------------- |
| `id`           | UUID        | Primary key                   |
| `service_date` | DATE        | Local service date            |
| `meal_period`  | TEXT/ENUM   | `lunch`, `dinner`             |
| `starts_at`    | TIMESTAMPTZ | Session opening               |
| `ends_at`      | TIMESTAMPTZ | Session closing               |
| `status`       | TEXT/ENUM   | `scheduled`, `open`, `closed` |
| `created_by`   | UUID        | Creator                       |
| `created_at`   | TIMESTAMPTZ | Creation time                 |

If only one lunch and one dinner session exist per day, enforce that rule. If the mess operates multiple sessions, use explicit session rules.

### `meal_transactions`

Records consumption and corrections.

| Column                    | Type        | Notes                                                             |
| ------------------------- | ----------- | ----------------------------------------------------------------- |
| `id`                      | UUID        | Primary key                                                       |
| `member_id`               | UUID        | Member reference                                                  |
| `subscription_id`         | UUID        | Subscription reference                                            |
| `meal_session_id`         | UUID        | Nullable session reference                                        |
| `service_date`            | DATE        | Local meal date                                                   |
| `meal_period`             | TEXT/ENUM   | Lunch, dinner, or approved adjustment type                        |
| `transaction_type`        | TEXT/ENUM   | `consumption`, `grant`, `adjustment`, `reversal`, `carry_forward` |
| `meal_delta`              | INTEGER     | Consumption normally `-1`                                         |
| `status`                  | TEXT/ENUM   | `accepted`, `reversed`, `rejected` where retained                 |
| `source`                  | TEXT/ENUM   | Staff QR, venue QR, manual, admin, system                         |
| `idempotency_key`         | TEXT        | Unique request identifier where supplied                          |
| `actor_id`                | UUID        | Staff/member/system actor                                         |
| `reason`                  | TEXT        | Required for manual/adjustment operations                         |
| `reverses_transaction_id` | UUID        | Nullable link to original transaction                             |
| `created_at`              | TIMESTAMPTZ | Creation time                                                     |

Keep a clear distinction between an attempted check-in and an accepted consumption. Rejected attempts may be recorded in a separate `checkin_attempts` table to avoid mixing them with the financial/meal ledger.

### `menus`

| Column         | Type        | Notes              |
| -------------- | ----------- | ------------------ |
| `id`           | UUID        | Primary key        |
| `service_date` | DATE        | Menu date          |
| `meal_period`  | TEXT/ENUM   | Lunch or dinner    |
| `title`        | TEXT        | Optional           |
| `notes`        | TEXT        | Optional           |
| `status`       | TEXT/ENUM   | Draft or published |
| `created_by`   | UUID        | Creator            |
| `created_at`   | TIMESTAMPTZ | Creation time      |
| `updated_at`   | TIMESTAMPTZ | Update time        |

### `menu_items`

| Column        | Type        | Notes                 |
| ------------- | ----------- | --------------------- |
| `id`          | UUID        | Primary key           |
| `menu_id`     | UUID        | Parent menu           |
| `name`        | TEXT        | Required              |
| `description` | TEXT        | Optional              |
| `sort_order`  | INTEGER     | Display order         |
| `image_path`  | TEXT        | Optional storage path |
| `created_at`  | TIMESTAMPTZ | Creation time         |

### `qr_tokens`

Stores revocable token metadata.

| Column            | Type        | Notes                          |
| ----------------- | ----------- | ------------------------------ |
| `id`              | UUID        | Primary key                    |
| `member_id`       | UUID        | Nullable member token owner    |
| `meal_session_id` | UUID        | Nullable venue token session   |
| `token_hash`      | TEXT        | Unique hash of token           |
| `token_type`      | TEXT/ENUM   | `member_pass`, `venue_session` |
| `expires_at`      | TIMESTAMPTZ | Expiry where applicable        |
| `revoked_at`      | TIMESTAMPTZ | Nullable revocation            |
| `created_at`      | TIMESTAMPTZ | Creation time                  |

### `audit_logs`

| Column        | Type        | Notes                             |
| ------------- | ----------- | --------------------------------- |
| `id`          | UUID        | Primary key                       |
| `actor_id`    | UUID        | Actor or system                   |
| `action`      | TEXT        | Action identifier                 |
| `entity_type` | TEXT        | Entity type                       |
| `entity_id`   | TEXT        | Target record                     |
| `reason`      | TEXT        | Required for sensitive exceptions |
| `before_data` | JSONB       | Safe prior values                 |
| `after_data`  | JSONB       | Safe new values                   |
| `request_id`  | TEXT        | Optional correlation identifier   |
| `created_at`  | TIMESTAMPTZ | Timestamp                         |

### `import_batches`

Tracks member imports.

Fields: `id`, `file_name`, `status`, `row_count`, `created_count`, `updated_count`, `skipped_count`, `error_count`, `created_by`, `created_at`, `completed_at`.

### Optional supporting tables

- `checkin_attempts`: rejected/failed scan attempts and safe diagnostics.
- `payment_webhook_events`: gateway event IDs, processing status, and timestamps.
- `notifications`: in-app notifications and later delivery status.
- `system_settings`: approved operational settings, with change audit.
- `member_links`: if login accounts and member records must be linked separately.

## 3. Relationships

- One member can have multiple subscriptions.
- One subscription can have multiple payment attempts/records.
- One subscription can have multiple meal transactions.
- One member can have many meal transactions.
- One meal session can have many meal transactions.
- One menu can have many menu items.
- Admin actions generate audit records.

## 4. Constraints and indexes

Implement:

- Unique member number where present.
- Foreign keys on related records.
- Valid status constraints.
- Positive plan allowance and validity.
- Non-negative payment amounts.
- Indexes on member, subscription status, expiry, payment status, service date, and meal period.
- Unique gateway payment/event IDs where available.
- Unique idempotency keys for check-in requests.
- Database-level duplicate constraints that reflect the owner-approved meal policy.

## 5. Balance design

Choose one canonical balance model.

**Recommended:** maintain a ledger of meal grants, consumption, and adjustments. Consumption is `-1`; a grant is positive. Remaining balance is the sum of relevant ledger entries for the subscription.

If performance requires a cached counter, update it in the same database transaction as the ledger entry. Never update a balance counter independently from its transaction record.

## 6. Atomic check-in transaction

A secure database function should:

1. Validate the authenticated actor and QR/session token.
2. Resolve the member and subscription.
3. Verify payment and subscription validity.
4. Check the open meal session.
5. Serialize or lock the relevant balance/subscription state.
6. Check remaining balance.
7. Enforce the duplicate rule using a database constraint.
8. Insert exactly one accepted consumption record.
9. Update any cached counter in the same transaction.
10. Return the canonical balance and result.

If any step fails, no meal should be deducted.
