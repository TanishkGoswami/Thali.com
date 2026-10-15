# Thali.com — Technology Stack and Architecture

## 1. Recommended stack

| Layer                 | Technology                                       | Responsibility                                   |
| --------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Frontend              | React                                            | UI components and application screens            |
| Build tool            | Vite                                             | Development and production builds                |
| Language              | TypeScript                                       | Type safety                                      |
| Routing               | React Router                                     | Role-based navigation                            |
| Server state          | TanStack Query                                   | Fetching, caching, loading, retry states         |
| Form validation       | React Hook Form + Zod                            | Forms and validation                             |
| Authentication        | Supabase Auth                                    | Login and sessions                               |
| Database              | PostgreSQL via Supabase                          | Members, payments, subscriptions, transactions   |
| Authorization         | PostgreSQL RLS                                   | Restrict database access                         |
| Critical operations   | PostgreSQL functions/RPC                         | Atomic meal deduction and balance changes        |
| Trusted backend       | Supabase Edge Functions or equivalent            | Payment webhooks and secret-dependent operations |
| QR                    | Maintained browser-compatible QR scanner library | Camera scanning                                  |
| Hosting               | HTTPS static hosting                             | Frontend deployment                              |
| Optional file storage | Supabase Storage                                 | Menu images and approved files                   |

## 2. Why a web app + PWA?

The first release should be a responsive web application that can be installed as a PWA on supported devices.

Advantages:

- One main codebase for reception computers and members' phones.
- No requirement to publish native apps before testing the business workflow.
- Centralized updates.
- Lower initial implementation and maintenance effort.
- Accessible through a browser using a domain.

A PWA is not identical to a native application. Camera access and installation behavior vary by browser and device. Test scanning on the actual devices used by the mess.

## 3. Frontend structure

Suggested organization:

```
src/
├── app/
│   ├── router.tsx
│   └── providers.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   ├── qr/
│   └── feedback/
├── features/
│   ├── auth/
│   ├── members/
│   ├── subscriptions/
│   ├── payments/
│   ├── checkins/
│   ├── menus/
│   ├── reports/
│   └── settings/
├── hooks/
├── lib/
│   ├── supabase.ts
│   ├── validation/
│   └── formatters/
├── types/
├── styles/
└── main.tsx
```

Adapt this structure to the existing repository if one already exists. Do not replace working project architecture without reviewing it.

## 4. Backend architecture

Use Supabase Auth for identity and PostgreSQL as the source of truth.

The frontend may request member data and initiate operations, but it must not be trusted to determine:

- Whether a payment is genuine.
- Whether a subscription is active.
- Whether a member has meals remaining.
- Whether a duplicate check-in is permitted.
- Whether a user can edit a balance.
- Whether an admin action is authorized.

These rules belong in database constraints, RLS policies, secure functions, and trusted server-side code.

## 5. Payment architecture

Cash and direct UPI are recorded as pending until authorized verification.

For an online gateway:

1. Trusted server-side code creates or verifies the payment order.
2. Gateway returns payment events.
3. Server verifies the signature and expected amount/order.
4. Event processing is idempotent.
5. Subscription status is updated transactionally.
6. The frontend refreshes and displays the verified status.

Razorpay may be evaluated as a candidate, but the gateway is not finalized. Review transaction fees, settlement, refunds, webhook reliability, and account requirements before selecting it.

## 6. QR architecture

### Member QR

Use a random opaque token associated with the member. Do not encode phone number, balance, payment status, or other sensitive data.

### Venue QR

Prefer a short-lived token associated with a particular meal session. The member must be authenticated, and the backend must validate the venue token.

### Check-in

Use a secure backend/database operation that validates and records the transaction atomically. The frontend should receive a result such as accepted, duplicate, expired, payment pending, or insufficient balance.

## 7. Deployment architecture

```
Member / Receptionist / Admin
             |
             v
React + Vite + TypeScript PWA
             |
      +------+------+
      |             |
      v             v
Supabase Auth   PostgreSQL + RLS
                    |
             Secure DB functions
                    |
          Meal check-in and ledger

Payment Gateway
       |
       v
Trusted webhook / Edge Function
       |
       v
Signature verification + idempotency
       |
       v
PostgreSQL payment/subscription update
```

## 8. Technical rules

- Use HTTPS in production.
- Store money in integer paise, not floating-point values.
- Use database transactions for critical operations.
- Use unique constraints for duplicate protection.
- Use idempotency keys for retryable operations.
- Keep secrets out of frontend environment variables.
- Do not use cached frontend state as proof of payment or check-in.
- Version database migrations.
- Separate development, staging, and production environments.
- Test RLS policies using both permitted and forbidden requests.
- Configure backup and restore procedures before launch.
