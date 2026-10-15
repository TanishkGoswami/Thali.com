# Thali.com — Application Flow

## 1. High-level navigation

```
Thali.com
├── Authentication
│   ├── Login
│   └── Register
├── Owner/Admin
│   ├── Dashboard
│   ├── Members
│   ├── Import Members
│   ├── Subscriptions
│   ├── Payments
│   ├── Meal Check-ins
│   ├── Menus
│   ├── Reports
│   ├── Staff & Roles
│   ├── Audit Logs
│   └── Settings
├── Receptionist
│   ├── Reception Dashboard
│   ├── Scan Member QR
│   ├── Search Member
│   └── Recent Check-ins
├── Member
│   ├── Dashboard
│   ├── My QR Pass
│   ├── My Subscription
│   ├── Renew Subscription
│   ├── Meal History
│   ├── Menu
│   └── Profile
└── Menu Manager
    └── Menu Management
```

## 2. Authentication flow

1. User opens Thali.com.
2. If not authenticated, show login or registration.
3. Authenticate through the configured method.
4. Resolve the user's role from trusted database data.
5. Load the appropriate dashboard.
6. Reject unauthorized route and database requests.
7. Never rely on a frontend role selector as proof of permission.

## 3. Existing member import

1. Admin uploads a CSV file.
2. System previews the rows and maps the columns.
3. System validates required fields and unique member numbers.
4. Duplicate or invalid rows are highlighted.
5. Admin downloads/fixes the error report.
6. Admin runs validation again.
7. Admin confirms import.
8. System imports records under a batch ID.
9. System displays created, skipped, updated, and failed totals.
10. Admin reconciles totals and spot-checks member records.

## 4. New member registration

1. User registers through the configured authentication flow.
2. System collects the required profile details.
3. System checks whether the person is an existing imported member using the approved identity-verification process.
4. If an existing record matches safely, link the account without changing the member number.
5. If the user is genuinely new, assign a new unique number using trusted server-side logic.
6. User can view the profile and proceed to subscription purchase.
7. Public registration must never grant staff/admin privileges.

## 5. New subscription and payment

1. Member selects the plan.
2. System displays price, 54 meals, and 30-day validity.
3. System creates a pending subscription/payment record.
4. Member chooses cash, direct UPI, or online gateway.
5. For cash/direct UPI, authorized staff verifies the payment.
6. For gateway payments, trusted server-side verification confirms success.
7. If payment fails or remains pending, subscription stays unusable.
8. If payment is verified, activate the subscription or queue it if an earlier subscription is still active.
9. Show status and dates to the member.

## 6. Staff-scans-member QR

1. Receptionist signs in.
2. Opens **Scan Member QR**.
3. Browser requests camera permission.
4. Receptionist scans the member's personal QR.
5. App sends the opaque token and request ID to the backend.
6. Backend validates token, member, payment, subscription dates, service session, balance, and duplicate rules.
7. One database transaction records the check-in and deducts one meal.
8. App displays confirmed success and remaining balance.
9. If rejected, show the reason and do not deduct a meal.

## 7. Member-scans-venue QR

1. Member signs in on their phone.
2. Member opens **Scan Mess QR**.
3. Member scans the venue/session QR.
4. Backend verifies the session token and authenticated member.
5. Member confirms check-in if required by the UI.
6. Backend performs the same eligibility and duplicate checks.
7. Database records one meal deduction atomically.
8. Member sees the confirmed result.

**Security note:** A printed static venue QR can be photographed and shared. Prefer a short-lived or rotating QR displayed at the mess. A static QR should not be treated as strong proof of physical presence.

## 8. Renewal flow

### Early renewal

1. Member requests renewal before the current subscription expires.
2. Payment is verified.
3. The new subscription is marked queued.
4. It starts after the current subscription ends.
5. The current subscription remains unchanged until its expiry.

### Renewal after expiry

1. Member requests renewal after the prior subscription has expired.
2. Payment is verified.
3. A new subscription starts from its activation timestamp.
4. It receives its own 54-meal allowance and 30-day validity.

## 9. Admin payment verification

1. Admin opens pending payments.
2. Reviews member, amount, payment method, and reference.
3. Confirms receipt or rejects the claim with a reason.
4. System updates payment status and activates/queues the subscription.
5. Audit log records actor, action, time, and relevant details.

Gateway payments must still use trusted server-side verification; a manual dashboard action must not bypass gateway signature validation.

## 10. Menu flow

1. Admin/Menu Manager chooses a date and meal period.
2. Adds or edits menu items.
3. Saves the draft.
4. Publishes the menu.
5. Members see the published menu.
6. System records who changed it.

## 11. Manual check-in and correction

1. Authorized staff selects a member.
2. System validates the same eligibility rules as QR check-in.
3. Staff enters a reason.
4. System records the check-in and actor.
5. For an erroneous accepted transaction, admin creates a reversal or adjustment linked to the original transaction.
6. Historical transactions are never silently deleted.

## 12. Failure flows

- Invalid QR: reject, no deduction.
- Expired subscription: reject, no deduction.
- Pending payment: reject, no deduction.
- Zero balance: reject, no deduction.
- Duplicate scan: reject, no deduction.
- Network timeout: show “Not confirmed”; retry safely using the same idempotency key or query the result.
- Backend unavailable: do not pretend that a meal was recorded.
- Insufficient permission: deny the action and log sensitive denied operations where appropriate.
