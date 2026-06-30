# LeadFlow — Lead Tracker

A visually polished, Fabric-authenticated **lead tracker** built on React + Vite,
Tailwind, Rayfin data and the [graphein](https://github.com/spatney/graphein)
visualization library. Sign in with Microsoft, capture leads (or generate 1,000
realistic samples), work them through the pipeline, and watch the dashboard light
up — all persisted to Fabric with per-user row-level security.

> This is a Fabricator template: there is **no local backend, dev server, or
> test harness**. You build your app and deploy it to a Fabric test workspace —
> the Fabricator agent does this for you and validates the running app in its
> built-in browser.

## Getting started

In Fabricator, just describe what you want to build. To deploy from the CLI:

```bash
npm run rayfin:up
```

## Project structure

```text
├── rayfin/
│   ├── rayfin.yml          # Fabric service configuration
│   └── data/
│       ├── schema.ts       # Data schema (registers the Lead entity)
│       └── Lead.ts         # Lead entity with per-user access policy
├── src/
│   ├── main.tsx            # Entry point + Rayfin client bootstrap
│   ├── App.tsx             # Routes, auth gate, leads provider + app shell
│   ├── main.css            # Tailwind theme
│   ├── hooks/
│   │   ├── AuthContext.tsx  # React context wrapping the auth helpers
│   │   └── LeadsContext.tsx # Shared leads state (fetch / refresh / optimistic)
│   ├── components/
│   │   ├── AuthPage.tsx     # Sign-in UI
│   │   ├── AppLayout.tsx    # Sidebar shell + routed content
│   │   ├── icons.tsx        # Line icon set
│   │   ├── ui.tsx           # KPI cards, chart cards, badges
│   │   └── leadActions.tsx  # Generate-samples / clear-all buttons
│   ├── pages/
│   │   ├── DashboardPage.tsx # graphein charts + KPI tiles
│   │   └── LeadsPage.tsx     # Interactive table, filters, add-lead modal
│   └── services/
│       ├── IAuthService.ts        # Auth service contract + AuthUser type
│       ├── RayfinAuthService.ts   # Fabric brokered auth
│       ├── rayfinClient.ts        # Typed Rayfin client singleton
│       ├── leadTypes.ts           # Lead types, status/source/industry constants
│       ├── sampleData.ts          # Weighted sample-lead generator
│       ├── analytics.ts           # KPI + chart aggregations (pure)
│       ├── chartSpecs.ts          # graphein chart spec builders + theme
│       ├── format.ts              # Currency / number / date formatters
│       ├── leads.ts               # Lead CRUD + bulk generate against Rayfin
│       └── bootstrap.ts           # Reads env, builds the auth service
└── package.json
```

## The data model

`rayfin/data/Lead.ts` defines a `Lead` entity scoped to the signed-in user, so
each person only ever sees their own pipeline:

```typescript
import { entity, role, text, int, date, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', '*', { policy: (claims, item) => claims.sub.eq(item.user_id) })
export class Lead {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) name!: string;
  @text({ max: 120 }) company!: string;
  @text({ max: 160 }) email!: string;
  @text({ max: 40 }) phone!: string;
  @text({ max: 24 }) status!: string;
  @text({ max: 40 }) source!: string;
  @text({ max: 48 }) industry!: string;
  @int() value!: number;
  @int() score!: number;
  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
```

`src/services/leads.ts` wraps the typed Rayfin client with `getLeads`,
`createLead`, `updateLead`, `deleteLead`, `generateSampleLeads`, and
`deleteAllLeads`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run build:fabric` | Build for Fabric deployment (entrypoint for `rayfin up`) |
| `npm run lint` | Lint with ESLint |
| `npm run rayfin:up` | Deploy the app to a Fabric test workspace |
| `npm run rayfin:db` | Apply data-model changes to the deployed database |
