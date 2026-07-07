# LeadFlow — Sales CRM

A visually polished, Fabric-authenticated **sales CRM** built on React + Vite,
Tailwind, Rayfin data and the [graphein](https://github.com/spatney/graphein)
visualization library. Sign in with Microsoft, generate a full sample workspace
(reps, accounts, contacts, deals and activities), work deals through the
pipeline, drill into accounts, track quota attainment — all persisted to Fabric
with per-user row-level security.

> This is a Fabricator template: there is **no local backend, dev server, or
> test harness**. You build your app and deploy it to a Fabric test workspace —
> the Fabricator agent does this for you and validates the running app in its
> built-in browser.

## Getting started

In Fabricator, just describe what you want to build. To deploy from the CLI:

```bash
npm run rayfin:up
```

## The data model

The workspace is a small relational CRM — seven entities, all scoped to the
signed-in user so each person only ever sees their own data. Relationships are
expressed with Rayfin's `@one` / `@many` navigations over explicit `{property}_id`
foreign keys, and a `DealTag` join entity models the many-to-many between deals
and tags.

```text
SalesRep ──< Account ──< Contact
   │            │           │
   │            └────< Deal >┘   (Deal.account, Deal.contact, Deal.owner)
   └──────────────────< Deal
                         │
                         ├──< Activity
                         └──< DealTag >── Tag
```

| Entity     | Purpose                          | Key relationships |
|------------|----------------------------------|-------------------|
| `SalesRep` | Account executive (owner)        | owns accounts, deals, activities |
| `Account`  | Company / customer               | `@one` owner → `SalesRep`; `@many` contacts, deals |
| `Contact`  | Person at an account             | `@one` account → `Account` |
| `Deal`     | Opportunity in the pipeline      | `@one` account, contact (optional), owner |
| `Activity` | Logged call / email / meeting    | `@one` deal, owner |
| `Tag`      | Reusable label                   | `@many` deal tags |
| `DealTag`  | Join row for Deal ↔ Tag          | `@one` deal, tag |

For example, `rayfin/data/Deal.ts` uses enum sets, foreign keys and navigations:

```typescript
import { entity, role, uuid, text, int, date, set, one, many } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', '*', { policy: (claims, item) => claims.sub.eq(item.user_id) })
export class Deal {
  @uuid() id!: string;
  @text({ min: 1, max: 140 }) name!: string;
  @set('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')
  stage!: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  @int() value!: number;
  @int() probability!: number;
  @date() expectedCloseDate!: Date;

  @uuid() account_id!: string;
  @one(() => Account) account?: Account;

  @uuid({ optional: true }) contact_id?: string;
  @one(() => Contact, { optional: true }) contact?: Contact;

  @uuid() owner_id!: string;
  @one(() => SalesRep) owner?: SalesRep;

  @many(() => Activity) activities?: Activity[];
  @many(() => DealTag) dealTags?: DealTag[];

  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
```

`src/services/crm.ts` wraps the typed Rayfin client with the data-access layer:
`loadWorkspace` (parallel, joined reads that flatten the graph for the UI),
`createDeal` / `updateDealStage` / `deleteDeal`, `generateSampleData` (seeds the
whole graph in dependency order) and `resetWorkspace` (deletes children before
parents).

## Project structure

```text
├── rayfin/
│   ├── rayfin.yml          # Fabric service configuration
│   └── data/
│       ├── schema.ts       # Registers all 7 entities
│       ├── SalesRep.ts     # Account executive (owner)
│       ├── Account.ts      # Company; @one owner
│       ├── Contact.ts      # Person; @one account
│       ├── Deal.ts         # Opportunity; @one account/contact/owner
│       ├── Activity.ts     # Interaction; @one deal/owner
│       ├── Tag.ts          # Label
│       └── DealTag.ts      # Deal ↔ Tag join entity
├── src/
│   ├── main.tsx            # Entry point + Rayfin client bootstrap
│   ├── App.tsx             # Routes, auth gate, CRM provider + app shell
│   ├── main.css            # Tailwind theme
│   ├── hooks/
│   │   ├── AuthContext.tsx        # React context wrapping the auth helpers
│   │   ├── CrmContext.tsx         # Shared workspace state (fetch / refresh / optimistic)
│   │   └── useResetWorkspace.tsx  # Reset-all action + progress overlay
│   ├── components/
│   │   ├── AuthPage.tsx    # Sign-in UI
│   │   ├── AppLayout.tsx   # Sidebar shell + routed content
│   │   ├── icons.tsx       # Line icon set
│   │   ├── ui.tsx          # KPI cards, chart cards, badges, chips
│   │   └── dataActions.tsx # Generate-samples / reset-all buttons
│   ├── pages/
│   │   ├── DashboardPage.tsx # graphein charts + KPI tiles + activity feed
│   │   ├── DealsPage.tsx     # Interactive table, filters, add-deal modal
│   │   ├── AccountsPage.tsx  # Account list + drill-in (contacts + deals)
│   │   ├── TeamPage.tsx      # Rep leaderboard + quota attainment
│   │   └── MetricsPage.tsx   # Live data-operation performance metrics
│   └── services/
│       ├── IAuthService.ts        # Auth service contract + AuthUser type
│       ├── RayfinAuthService.ts   # Fabric brokered auth
│       ├── rayfinClient.ts        # Typed Rayfin client singleton
│       ├── crmTypes.ts            # Flattened item types + enums + display metadata
│       ├── sampleData.ts          # Weighted sample-graph generator
│       ├── analytics.ts           # KPI + chart aggregations (pure)
│       ├── chartSpecs.ts          # graphein chart spec builders + theme
│       ├── format.ts              # Currency / number / date formatters
│       ├── crm.ts                 # Workspace load, deal CRUD, seed + reset
│       ├── metrics.ts             # Data-operation timing instrumentation
│       └── bootstrap.ts           # Reads env, builds the auth service
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run build:fabric` | Build for Fabric deployment (entrypoint for `rayfin up`) |
| `npm run lint` | Lint with ESLint |
| `npm run rayfin:up` | Deploy the app to a Fabric test workspace |
| `npm run rayfin:db` | Apply data-model changes to the deployed database |
