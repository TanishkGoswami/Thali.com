# Thali.com — Existing Member Import Guide

## 1. Objective

Move the current paper/register member records into Thali.com while preserving unique member numbers and preventing duplicate or incorrect identity matching.

## 2. Suggested import columns

| Column                        | Requirement | Description                           |
| ----------------------------- | ----------- | ------------------------------------- |
| `member_number`               | Required    | Existing unique number                |
| `full_name`                   | Required    | Member name                           |
| `phone`                       | Recommended | Normalized contact number             |
| `email`                       | Optional    | Email address                         |
| `status`                      | Recommended | Active/inactive                       |
| `notes`                       | Optional    | Non-sensitive operational notes       |
| `current_subscription_start`  | Conditional | If reliably recorded                  |
| `current_subscription_expiry` | Conditional | If reliably recorded                  |
| `remaining_meals`             | Conditional | Only if reconciled                    |
| `payment_status`              | Conditional | Only if supported by reliable records |

Use only necessary personal data. Never import passwords, OTPs, payment-card details, or other unnecessary secrets.

## 3. Prepare the spreadsheet

1. Make an untouched backup of the original data.
2. Save member numbers as text to preserve leading zeros.
3. Trim unnecessary whitespace.
4. Standardize phone-number formatting without inventing missing digits.
5. Identify duplicate member numbers.
6. Review duplicate phone numbers; family members may share a number.
7. Check missing names or member numbers.
8. Review inconsistent active/inactive statuses.
9. Identify unreliable subscription dates and meal balances.
10. Record the approved source-row count before import.

## 4. Safe import workflow

### Step 1: Upload

Admin uploads the CSV through the import screen.

### Step 2: Map columns

The system asks the admin to match source columns to Thali.com fields.

### Step 3: Preview

Show sample rows, total row count, missing required fields, and detected duplicates.

### Step 4: Validate

Validate member-number uniqueness, required fields, date formats, status values, and numeric ranges.

### Step 5: Dry run

Show how many rows would be created, skipped, updated, or rejected. Do not modify production records during a dry run.

### Step 6: Fix errors

Provide an error report with row numbers and clear reasons.

### Step 7: Confirm

Require an authorized admin to explicitly confirm the import.

### Step 8: Import

Write records under a unique import batch ID.

### Step 9: Reconcile

Show created, updated, skipped, and failed totals. Compare these with the source spreadsheet.

### Step 10: Audit

Store the importing actor, time, file name, batch ID, and result summary.

## 5. Migration rules

- Preserve every existing member number.
- Do not merge members based only on similar names.
- Default to create-only import.
- Use an explicit reviewed update mode when updates are needed.
- Do not overwrite an existing record without showing the change to the admin.
- Do not invent missing balances or payment status.
- Do not create verified payment records without reliable evidence.
- Use deactivation rather than hard deletion when history exists.
- If a member's balance is uncertain, mark the record for admin review.
- Do not link an authentication account solely because its name matches a paper record.

## 6. Subscription migration decision

Before launch, the owner must choose one approach:

**Option A — Migrate current state:** Import reliable current subscription start/expiry and remaining-meal values after reconciling them against the paper register.

**Option B — Start fresh:** Import member identities only, then create new subscriptions through the verified payment workflow.

Do not combine these approaches inconsistently. The selected policy must be communicated to members.

## 7. Account linking

Existing members may not have login accounts yet. Design account linking separately from the member import.

- Require a verified identifier or an admin-approved identity-check process.
- Do not rely on name-only matching.
- Preserve the existing member record and unique number.
- Prevent one login account from being linked to multiple members unless the owner explicitly supports that arrangement.
- Audit manual linking and corrections.

## 8. Post-import checklist

- Imported count reconciles with the approved source.
- Member numbers are preserved.
- Duplicate member numbers are resolved.
- Invalid rows are documented.
- Random records are checked against the original register.
- Subscription dates and balances are validated if migrated.
- Account linking is tested with a small pilot group.
- Import report and source backup are retained securely.
