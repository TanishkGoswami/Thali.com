# Thali.com — Decisions and Open Questions

## 1. Confirmed project requirements

- Product name: Thali.com.
- Existing mess workflow uses unique member numbers and physical cards.
- Initial operation has 400+ members.
- Existing member numbers must be preserved.
- New member registration is required.
- Subscription price: ₹2,800.
- Subscription allowance: 54 meals.
- Validity: 30 days from activation/start, not a calendar month.
- Lunch and dinner share the same meal balance.
- Two QR flows: staff scans member QR, and member scans mess QR.
- Payment methods: cash, direct UPI, and online gateway.
- Payment must be verified before meal credits become usable.
- Unused meals expire by default.
- Admin-approved exceptions require a reason and audit record.
- Early renewal is queued after current expiry.
- Late renewal starts a new period after activation.
- Initial platform is a responsive web app + PWA.
- Recommended stack is React, Vite, TypeScript, and Supabase.

## 2. Decisions the owner must confirm

### A. Duplicate check-in policy

Is one lunch and one dinner check-in per member per service date correct? Are additional servings ever allowed?

**Suggested default:** One accepted lunch and one accepted dinner per member per service date.

### B. Exact expiry behavior

Should a subscription expire at the exact timestamp 30 days after activation, or at the end of the 30th local calendar day?

**Suggested default:** Use an exact timestamp 30 days after activation and display the expiry clearly. Confirm the convention before launch.

### C. Meal timings

What are the lunch and dinner opening/closing times? Are early or late check-ins permitted?

### D. Authentication

Should members sign in using phone OTP, email, or another supported method? Do all existing members have unique phone numbers?

### E. Current member balances

Should the initial launch migrate existing remaining meals and expiry dates, or should existing members start new subscriptions?

**Suggested default:** Migrate current state only where the paper records can be reconciled reliably.

### F. Online payment gateway

Which gateway should be used? Razorpay is a candidate, but has not been selected.

### G. UPI verification

Who will verify direct UPI payments, and what evidence will be accepted?

**Suggested default:** Keep payment pending until an authorized admin verifies receipt.

### H. Refunds

If a payment is refunded after some meals have been consumed, should the system block future check-ins, create a debt/adjustment, or follow another policy?

### I. Unused meals

Can the admin approve meal carry-forward, validity extension, or both? Is there a limit?

### J. Manual check-in

Can receptionists perform manual check-ins, or should only the admin be allowed? Should manual check-ins require later review?

### K. Venue QR

Can the mess display a rotating QR on a screen, or will it use a printed QR?

**Suggested default:** Use a rotating or short-lived QR where practical. A printed QR is less secure.

### L. New member numbers

What format should new numbers use? For example, sequential numbers or a prefixed format.

### M. Menu management

Who will update menus, and how far in advance should menus be published?

### N. Notifications

Are in-app notifications enough for launch, or are SMS/WhatsApp reminders required?

### O. Data retention

How long should member, payment, audit, and meal history be retained?

## 3. Implementation rule

Do not silently make important business decisions in code. Record the owner's answers, update these documents, and then implement the corresponding rules and tests.
