# RentEase Kenya

A full-stack rental property management platform connecting **landlords**, **tenants** and **administrators** — built for the Kenyan rental market with M-Pesa rent payments.

**Stack:** Next.js (App Router) · TypeScript (strict) · Tailwind CSS · PostgreSQL · Prisma ORM

---

## Features

- **Role-based accounts** — ADMIN / LANDLORD / TENANT with server-side authorization (DB-backed sessions, no session secret required)
- **Flexible building registration** — any floor names, any house numbers (`001`, `101`, `61B`, `A1`, `Shop 4`…), rent, deposit, bedrooms, bathrooms, amenities, photos
- **Admin approvals** — buildings (approve / reject / request changes), tenant applications, M-Pesa payments
- **Public rental search** — only APPROVED buildings with VACANT houses; filters (location, rent, bedrooms, bathrooms, type), sorting, pagination
- **Tenant journeys** — apply for a vacant house → approved → assigned → unit becomes OCCUPIED
- **Manual M-Pesa payments** — tenant submits transaction code + amount + date; admin confirms or rejects with a reason; duplicate codes blocked
- **Rent tracking** — PAID / PENDING / OVERDUE, default due day 5th (configurable per building and globally)
- **Dashboards** — landlord (buildings, tenants, payments, overdue), tenant (my house, rent, payment history), admin (users, buildings, payments, reports, audit logs)
- **Notifications** — in-app for approvals, payments, rent due/overdue
- **Audit log** — every important administrative action recorded
- **Image uploads** — local filesystem storage behind a swappable `StorageService` interface

## 1. Prerequisites

- Node.js 20+
- PostgreSQL 14+

## 2. Install

```bash
npm install
```

## 3. Configure `.env`

Copy the example and set your database connection string — **this is the only environment variable the application needs**:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/rentalhub?schema=public"
```

No other configuration is required. There is no `AUTH_SECRET`, no public app URL, no storage keys — sessions are stored in PostgreSQL and images are saved to the local filesystem.

## 4. Create the database

```bash
createdb rentalhub          # or: CREATE DATABASE rentalhub; via your SQL client
```

## 5. Run Prisma migrations

```bash
npx prisma migrate dev      # applies migrations and generates the client
```

## 6. Seed the admin account

```bash
npm run db:seed
```

This creates the initial administrator:

- **Email:** `admin@rentease.co.ke`
- **Password:** `Admin@12345`

**Change this password immediately after the first login** (Profile → Change password). The credentials are defined at the top of `prisma/seed.ts`.

To also seed demo data (landlords, buildings, floors, units, tenants, payments) for development:

```bash
npm run db:seed:demo
```

## 7. Start development

```bash
npm run dev
```

Open http://localhost:3000

## 8. Build for production

```bash
npm run build
npm run start
```

## 9. Deploy

### Vercel (recommended)

1. **Use a hosted PostgreSQL** that Vercel can reach (e.g. Neon, Supabase, Railway). A `localhost`/private database will never work from Vercel.
2. Import the GitHub repo into Vercel (framework preset: Next.js). The `vercel-build` script runs `prisma migrate deploy` automatically on every build — **migrations are applied to the hosted database for you** — followed by `prisma generate` (with the `debian-openssl-3.0.x` engine target included) and `next build`. No extra build settings are required.
3. **Critical:** in Vercel → Project → Settings → Environment Variables, add:
   - `DATABASE_URL` = your hosted PostgreSQL connection string
   - Make sure it is enabled for the **Production** environment (the build runs with production env vars). Add it for Preview/Development too if you use them.
4. **One-time:** create the admin account on the hosted database:
   ```bash
   # locally, with DATABASE_URL pointing at your hosted DB:
   npm run db:seed        # creates admin (see section 6); add --demo for demo data
   ```
   (Or run the same command inside a one-off Vercel build / your CI.)
5. Deploy. If you see `P2021: table does not exist` errors, the migrations did not reach that database — check that `DATABASE_URL` is set for Production and redeploy (the `vercel-build` step applies pending migrations).

> Note: property image uploads are stored on the local filesystem, which is ephemeral on Vercel. For production image persistence, add a cloud storage driver to `lib/storage.ts`.

### VPS / self-hosted

1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. `npm ci && npx prisma migrate deploy && npm run db:seed`
3. `npm run build && npm run start`

Serve the `.next` build with the included `next start` (or a process manager such as PM2); optionally front it with Nginx for TLS.

## Testing

The end-to-end integration test exercises the real service layer against the database — the complete landlord → admin → tenant → payment flow:

```bash
npm run test:flow
```

## Project structure

```
app/          Next.js App Router pages (public site, dashboards, admin)
app/actions/  Server actions (auth, buildings, applications, payments, admin)
components/   Reusable UI (forms, modals, toasts, dashboards)
lib/          db, auth/sessions, guards, services, validations (Zod), storage, rent-status
prisma/       Schema, migrations, seed
scripts/      End-to-end integration test
```

## Security notes

- Passwords hashed with bcrypt; sessions stored in PostgreSQL (only a SHA-256 hash of the cookie token is persisted)
- Every dashboard route and server action enforces role + ownership server-side
- M-Pesa transaction codes are unique; confirmed payments are immutable
- `DATABASE_URL` is never exposed to the browser (no `NEXT_PUBLIC_*` variables exist)
