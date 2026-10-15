# Thali.com — Business Rules

## 1. Subscription plan

Default plan:

- Price: ₹2,800.
- Meal allowance: 54.
- Validity: 30 days from start/activation.
- Meal periods: lunch and dinner.
- Balance: shared across both meal periods.

Store plan values in the database, not in multiple hard-coded frontend components.

## 2. Meal deduction

- One accepted check-in equals one meal.
- A valid lunch or dinner check-in deducts one meal from the shared balance.
- A rejected check-in deducts zero.
- A balance must never become negative.
- Do not let the browser directly update the balance.
- Every accepted consumption must have a corresponding transaction record.

## 3. Validity and expiry

- Each subscription has a start timestamp and expiry timestamp.
- Validity is 30 days from the defined start, not a calendar month.
- Use Asia/Kolkata for operational display and service-date grouping.
- Before launch, define whether expiry occurs at the exact timestamp 30 days later or at an agreed local end-of-day boundary.
- Expired subscriptions are not usable unless an authorized admin approves an extension.
- Extensions must be auditable.

## 4. Renewal

### Early renewal

- A payment may be completed before the current subscription expires.
- Once verified, the new subscription is queued.
- The new subscription starts immediately after the current subscription's expiry.
- The queued subscription must not provide credits before its start time.

### Late renewal

- If the previous subscription has expired, the new subscription begins at the verified activation time.
- The new subscription receives its own 54-meal allowance and 30-day period.

### General

- Keep every renewal as a separate subscription record.
- Prevent accidental overlapping periods.
- Do not change the old subscription's history when a new subscription is purchased.

## 5. Payment methods

### Cash

1. Record amount and member.
2. Mark payment pending.
3. Authorized admin verifies receipt.
4. Store verifier and verification time.
5. Activate or queue the subscription.

### Direct UPI

1. Record amount and available reference.
2. Keep payment pending.
3. Authorized admin verifies receipt through the approved procedure.
4. Store verification details.
5. Activate or queue the subscription.

A screenshot alone should not automatically activate a subscription unless the owner explicitly approves a documented manual-verification procedure.

### Online gateway

1. Create a payment order using trusted server-side code.
2. Verify the gateway response/webhook.
3. Validate signature, amount, currency, order association, and payment status.
4. Process repeated events idempotently.
5. Activate or queue the subscription only after verification.

### All methods

- Pending or failed payment grants no usable meals.
- Payment corrections must be recorded.
- Refunds must have a defined policy, especially when meals have already been consumed.

## 6. Check-in validation order

Every check-in must be validated on the server:

1. Actor is authenticated.
2. Actor is permitted to perform this type of check-in.
3. QR token is valid, not revoked, and not expired.
4. Member exists and is active.
5. Payment is verified.
6. Subscription is active for the service time.
7. Meal session is open and valid.
8. At least one meal remains.
9. The duplicate policy permits the check-in.
10. Idempotency and database uniqueness checks pass.
11. Consumption is recorded atomically.
12. The updated balance is returned.

Any failed validation must produce zero deduction.

## 7. Duplicate policy

Initial proposed rule: one lunch and one dinner check-in per member per service date.

The owner must confirm this before production. If multiple servings or multiple meal sessions are allowed, define explicit session rules and update the database constraints accordingly.

A frontend warning is not sufficient. The database must enforce the rule under simultaneous requests.

## 8. QR rules

### Member QR

- Use a random, opaque token.
- Do not put personal details, phone numbers, or meal balance into the QR.
- Support revocation and regeneration if the QR is compromised.

### Venue QR

- Prefer a rotating or short-lived token for the current meal session.
- Require authenticated member identity.
- Validate the venue token on the server.
- A printed static QR can be photographed and shared; it is not strong proof of physical presence.

## 9. Unused meals

- Unused meals expire by default when the subscription expires.
- Carry-forward is not automatic.
- Validity extensions are not automatic.
- An authorized admin may approve an exception with a mandatory reason.
- The system must record the adjustment separately.
- Define how carried-forward credits relate to the new subscription so credits are not counted twice.

## 10. Manual check-in

- Only authorized roles may use it.
- A reason is mandatory.
- It must follow the same payment, expiry, balance, and duplicate rules as QR check-in.
- The system records actor, time, member, meal session, and reason.
- Manual check-in must not be a backdoor for bypassing subscription rules.

## 11. Corrections and reversals

- Never silently delete an accepted meal transaction.
- Create a reversal or adjustment linked to the original transaction.
- Require a reason and authorized actor.
- Update the canonical balance in the same transaction.
- Keep the original and correction visible to authorized auditors.

## 12. Network and concurrency

- Do not display success until the backend confirms the result.
- Use an idempotency key per logical check-in request.
- On timeout, retry safely or query the result.
- Concurrent scans must not create duplicate deductions.
- If the server is unavailable, fail safely. Offline deductions are outside the initial MVP.
