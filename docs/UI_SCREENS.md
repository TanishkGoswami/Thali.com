# Thali.com — UI Screens Specification

## Global UX requirements

- Mobile-first responsive interface.
- Fast, low-friction check-in workflow.
- Large scan and search actions for reception.
- Clear status indicators without relying only on color.
- Loading, empty, error, retry, and success states on every relevant screen.
- Asia/Kolkata date/time display.
- Do not display confirmed check-in success before server confirmation.
- Do not expose financial information to roles that do not need it.

## Authentication

### 1. Login

- Sign in using the configured authentication method.
- Show clear errors and retry guidance.
- Provide registration and account-help links.
- No user-selectable privileged role.

### 2. Registration

- Collect required profile details.
- Safely link an existing imported member when verified.
- Assign a new unique member number through trusted logic for new members.
- Do not match or merge users based only on name.

## Member screens

### 3. Member dashboard

Show:

- Name and member number.
- Subscription status.
- Meals remaining.
- Subscription start and expiry.
- QR pass access.
- Recent meal history.
- Today's lunch/dinner menu.
- Renewal/payment status.

### 4. My QR Pass

- High-contrast QR.
- Readable member number as a fallback identifier.
- No personal information encoded directly.
- Option to revoke/regenerate if supported by the token lifecycle.
- Explain how the pass should be used.

### 5. My Subscription

- Plan price.
- Total meals.
- Meals remaining.
- Start and expiry dates.
- Active/queued/pending/expired status.
- Renewal action.
- Approved extension details if any.

### 6. Renew Subscription

- Show plan details and price before payment.
- Offer supported payment methods.
- Clearly label pending, verified, failed, and queued states.
- Do not show the new balance as usable until activation.

### 7. Meal History

- Date and time.
- Lunch/dinner.
- Accepted meal consumption.
- Balance after transaction, if stored.
- Reversal/adjustment details where appropriate.
- Read-only for members.

### 8. Menu

- Today's lunch and dinner.
- Upcoming published menus.
- Menu notes and last-updated information if useful.

### 9. Profile

- Permitted contact/profile fields.
- Account and sign-out options.
- No editing of member number, role, balance, or payment state.

## Receptionist screens

### 10. Reception Dashboard

Primary actions:

- **Scan Member QR**
- **Search Member**

Also show:

- Current meal session status.
- Recent check-ins.
- Connection/system status.
- Minimal operational statistics.

Do not show revenue totals or full financial reports.

### 11. Scan Member QR

- Request camera permission.
- Explain how to enable the camera if denied.
- Submit scanned token to the backend.
- Prevent accidental repeated submissions in the UI.
- Display accepted/rejected result.
- On success, show member name/number, meal period, time, and remaining balance.
- On rejection, show a clear reason and next step.

### 12. Search Member

- Search by member number or name.
- Allow only approved contact search fields.
- Show the minimum information needed to confirm eligibility.
- Run the same server-side check-in operation.
- Manual check-in requires permission and a reason.

### 13. Member check-in result

Possible states:

- Meal accepted.
- Already checked in for this meal.
- Subscription expired.
- Payment pending.
- No meals remaining.
- Member inactive.
- QR invalid or revoked.
- Session closed.
- Network error; result not confirmed.

## Admin screens

### 14. Admin Dashboard

Show:

- Active members.
- Active, queued, expiring, and expired subscriptions.
- Today's lunch/dinner consumption.
- Pending payment verification.
- Low-balance members.
- Recent adjustments and rejected check-ins.

### 15. Members

- Search and filter.
- View member profile and subscription history.
- Create/edit/deactivate members.
- Import CSV with preview and error report.
- Avoid destructive deletion of records with history.

### 16. Subscriptions

- Filter by status.
- View dates, plan, meals granted, consumption, and balance.
- Show renewal chain.
- Approve extension/carry-forward through a reason-required workflow.

### 17. Payments

- Filter pending, verified, failed, refunded.
- Review cash/direct UPI payment claims.
- Verify/reject with a reason where required.
- Display gateway verification status and reference.
- Keep an audit trail.

### 18. Menus

- Date picker.
- Lunch/dinner selector.
- Add, reorder, edit, publish, and unpublish menu items.
- Preview member-facing display.

### 19. Reports

- Daily consumption by meal period.
- Unique members served.
- Subscription status and expiry.
- Low-balance members.
- Payments by method and status.
- Manual check-ins, rejected scans, adjustments.
- CSV export controlled by role permissions.

### 20. Staff and Roles

- Invite/activate/deactivate staff.
- Assign approved roles.
- Show role changes in the audit log.

### 21. Audit Log

- Filter by date, actor, action, and target.
- Read-only history.
- Restrict access to authorized admins.

### 22. Settings

- Plan price, meal allowance, and validity.
- Duplicate policy.
- Meal session windows.
- Timezone.
- Payment method settings.
- Expiry and exception rules.
- All critical setting changes must be audited.

## Required empty/error states

Design for:

- No members found.
- No active subscription.
- Pending payment.
- Queued renewal.
- Expired subscription.
- Zero meal balance.
- Duplicate check-in.
- Invalid QR.
- Camera permission denied.
- Network unavailable.
- Timed-out request with unknown result.
- Import errors.
- Unauthorized action.
