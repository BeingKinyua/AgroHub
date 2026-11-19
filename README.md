# AgroHub BOS

AgroHub is an internal business operating system for Agro-Deliveries Kenya. It brings customer orders, supplier sourcing, warehouse stock, delivery runs, and accounts into one workspace. The app uses Next.js, React, TypeScript, and Tailwind CSS.

## Run locally

Use **Node.js 22 or later** and npm. Run these commands from the repository root.

```sh
npm install
npm run dev
```

Open [AgroHub on localhost](http://localhost:3000). The demo opens as the seeded administrator. To try another role, sign out and choose an account under **Test Accounts** on the sign-in screen.

### Environment variables

The seeded demo runs without an environment file. To enable Gemini-generated shift briefs, copy [`.env.example`](.env.example) to `.env.local` and set `GEMINI_API_KEY`. Without a key, AgroHub generates the brief from the same counts using a built-in summary. Keep API keys in `.env.local`.

The template also lists hosting and Supabase settings. The repository includes Supabase client helpers and a database migration. The demo uses its own seeded sign-in and in-memory business records.

## Core workflows

- **Orders and sourcing.** Create customer orders using warehouse stock, direct procurement, or a mix of both. Save order drafts in the current browser or use the sourcing queue to see quantities still outstanding.
- **Suppliers and purchasing.** Manage supplier profiles and quoted prices. Create itemized purchase orders, record partial collections or warehouse receipts at actual cost, and track the associated supplier payables.
- **Fulfillment and deliveries.** Pick and pack sourced orders, plan delivery runs, and capture proof of delivery at each customer stop. Review accepted, rejected, short, and excess quantities before resolving discrepancies or issuing eligible invoices.
- **Accounts and reporting.** Review customer receivables, supplier payables, and recorded payments. Filter billing reports by issue date and export the invoice list.

Business records are seeded on page load. Changes to orders, stock, deliveries, invoices, and payments live in memory and reset when the app reloads. The browser retains the demo session, preferences, and saved order drafts. Use sample data when evaluating the workflows.

## Checks and build

| Command | Purpose |
| --- | --- |
| `npm test` | Run the business-rule regression suite. |
| `npm run lint` | Type-check the project. |
| `npm run build` | Compile the production build. Next.js fetches the configured Google Fonts during the build. |
| `npm start` | Serve the compiled build on port 3000. |

## Project layout

- [`src/app/`](src/app/) contains workspace pages and API routes.
- [`src/components/`](src/components/) contains the app shell and shared UI components.
- [`src/lib/services/`](src/lib/services/) contains the business state provider, seeded data, rules, and tests.
- [`src/lib/permissions/rbac.ts`](src/lib/permissions/rbac.ts) defines roles and permissions.
- [`src/types/domain/`](src/types/domain/) contains business record types.
- [`supabase/migrations/`](supabase/migrations/) contains the database schema and row-level security policies.
