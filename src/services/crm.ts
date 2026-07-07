/**
 * Data-access layer for the CRM. Wraps the Rayfin GraphQL client with:
 *  - `loadWorkspace()` — one relationship-joined read of everything the signed-in
 *    user owns, flattened into the `Workspace` shape the UI/analytics consume.
 *  - deal CRUD (`createDeal`, `updateDealStage`, `deleteDeal`).
 *  - `generateSampleData()` / `resetWorkspace()` — bulk seed/clear across the
 *    whole entity graph, inserting in dependency order and deleting in reverse.
 *
 * Every operation is wrapped in `timed(...)` so the Performance page shows live
 * throughput. Relationships are read via typed dot-paths (e.g. `account.name`)
 * and written via scalar foreign keys (e.g. `account_id`).
 */

import { getRayfinClient } from './rayfinClient';
import { timed } from './metrics';
import { buildSampleGraph, totalRecords, type SampleOptions } from './sampleData';
import { STAGE_PROBABILITY } from './crmTypes';
import type {
  Workspace,
  RepItem,
  TagItem,
  AccountItem,
  ContactItem,
  DealItem,
  ActivityItem,
  NewDeal,
  DealStage,
  DealSource,
} from './crmTypes';

export type ProgressFn = (done: number, total: number) => void;

const PAGE_SIZE = 500;
const WRITE_CHUNK = 50;

const REP_FIELDS = [
  'id',
  'name',
  'email',
  'title',
  'region',
  'quota',
  'avatarColor',
  'createdAt',
] as const;

const TAG_FIELDS = ['id', 'label', 'color'] as const;

const ACCOUNT_FIELDS = [
  'id',
  'name',
  'industry',
  'website',
  'city',
  'country',
  'employeeCount',
  'annualRevenue',
  'tier',
  'createdAt',
  'owner_id',
  'owner.name',
] as const;

const CONTACT_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'title',
  'createdAt',
  'account_id',
  'account.name',
] as const;

const DEAL_FIELDS = [
  'id',
  'name',
  'stage',
  'source',
  'value',
  'score',
  'probability',
  'expectedCloseDate',
  'closedAt',
  'createdAt',
  'account_id',
  'account.name',
  'account.industry',
  'contact_id',
  'contact.firstName',
  'contact.lastName',
  'owner_id',
  'owner.name',
] as const;

const ACTIVITY_FIELDS = [
  'id',
  'type',
  'subject',
  'notes',
  'occurredAt',
  'createdAt',
  'deal_id',
  'deal.name',
  'owner_id',
  'owner.name',
] as const;

const DEALTAG_FIELDS = ['id', 'deal_id', 'tag_id'] as const;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function currentUserId(): string {
  const client = getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error('You must be signed in to manage the workspace.');
  }
  return session.user.id;
}

function toDate(value: unknown): Date {
  return new Date(value as string);
}

/** Drain a cursor-paginated query into a single array of rows. */
async function fetchAll<Row>(
  makeQuery: (
    cursor?: string
  ) => Promise<{ items: Row[]; hasNextPage: boolean; endCursor?: string }>
): Promise<Row[]> {
  const all: Row[] = [];
  let cursor: string | undefined;
  for (let guard = 0; guard < 5000; guard++) {
    const page = await makeQuery(cursor);
    all.push(...page.items);
    if (!page.hasNextPage || !page.endCursor) break;
    cursor = page.endCursor;
  }
  return all;
}

/** Collect only the ids of an entity (used before bulk deletes). */
async function collectIds(
  makeQuery: (
    cursor?: string
  ) => Promise<{ items: { id: string }[]; hasNextPage: boolean; endCursor?: string }>
): Promise<string[]> {
  const rows = await fetchAll(makeQuery);
  return rows.map((row) => String(row.id));
}

/** Create records in parallel chunks, returning their ids in input order. */
async function createChunked<TSpec>(
  items: TSpec[],
  make: (item: TSpec) => Promise<{ id: string }>,
  bump: (n: number) => void
): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < items.length; i += WRITE_CHUNK) {
    const chunk = items.slice(i, i + WRITE_CHUNK);
    const created = await Promise.all(chunk.map(make));
    for (const record of created) ids.push(String(record.id));
    bump(chunk.length);
  }
  return ids;
}

/** Delete ids in parallel chunks, reporting progress. */
async function deleteChunked(
  ids: string[],
  del: (id: string) => Promise<unknown>,
  bump: (n: number) => void
): Promise<void> {
  for (let i = 0; i < ids.length; i += WRITE_CHUNK) {
    const chunk = ids.slice(i, i + WRITE_CHUNK);
    await Promise.all(chunk.map(del));
    bump(chunk.length);
  }
}

// ---------------------------------------------------------------------------
// Load workspace
// ---------------------------------------------------------------------------

async function fetchWorkspace(): Promise<Workspace> {
  const client = getRayfinClient();

  const [repRows, tagRows, accountRows, contactRows, dealRows, activityRows, dealTagRows] =
    await Promise.all([
      fetchAll((cursor) => {
        let q = client.data.SalesRep.select(REP_FIELDS).orderBy({ name: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      fetchAll((cursor) => {
        let q = client.data.Tag.select(TAG_FIELDS).orderBy({ label: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      fetchAll((cursor) => {
        let q = client.data.Account.select(ACCOUNT_FIELDS).orderBy({ name: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      fetchAll((cursor) => {
        let q = client.data.Contact
          .select(CONTACT_FIELDS)
          .orderBy({ lastName: 'asc' })
          .first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      fetchAll((cursor) => {
        let q = client.data.Deal.select(DEAL_FIELDS).orderBy({ createdAt: 'desc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      fetchAll((cursor) => {
        let q = client.data.Activity
          .select(ACTIVITY_FIELDS)
          .orderBy({ occurredAt: 'desc' })
          .first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      fetchAll((cursor) => {
        let q = client.data.DealTag.select(DEALTAG_FIELDS).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
    ]);

  const tagsByDeal = new Map<string, string[]>();
  for (const row of dealTagRows) {
    const dealId = String(row.deal_id);
    const list = tagsByDeal.get(dealId);
    if (list) list.push(String(row.tag_id));
    else tagsByDeal.set(dealId, [String(row.tag_id)]);
  }

  const reps: RepItem[] = repRows.map((r) => ({
    id: String(r.id),
    name: r.name,
    email: r.email,
    title: r.title,
    region: r.region,
    quota: Number(r.quota),
    avatarColor: r.avatarColor,
    createdAt: toDate(r.createdAt),
  }));

  const tags: TagItem[] = tagRows.map((t) => ({
    id: String(t.id),
    label: t.label,
    color: t.color,
  }));

  const accounts: AccountItem[] = accountRows.map((a) => ({
    id: String(a.id),
    name: a.name,
    industry: a.industry,
    website: a.website,
    city: a.city,
    country: a.country,
    employeeCount: Number(a.employeeCount),
    annualRevenue: Number(a.annualRevenue),
    tier: a.tier,
    ownerId: String(a.owner_id),
    ownerName: a.owner?.name ?? '—',
    createdAt: toDate(a.createdAt),
  }));

  const contacts: ContactItem[] = contactRows.map((c) => ({
    id: String(c.id),
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    title: c.title,
    accountId: String(c.account_id),
    accountName: c.account?.name ?? '—',
    createdAt: toDate(c.createdAt),
  }));

  const deals: DealItem[] = dealRows.map((d) => ({
    id: String(d.id),
    name: d.name,
    stage: d.stage,
    source: d.source,
    value: Number(d.value),
    score: Number(d.score),
    probability: Number(d.probability),
    expectedCloseDate: toDate(d.expectedCloseDate),
    closedAt: d.closedAt ? toDate(d.closedAt) : null,
    createdAt: toDate(d.createdAt),
    accountId: String(d.account_id),
    accountName: d.account?.name ?? '—',
    industry: d.account?.industry ?? '—',
    contactId: d.contact_id ? String(d.contact_id) : null,
    contactName: d.contact ? `${d.contact.firstName} ${d.contact.lastName}`.trim() : null,
    ownerId: String(d.owner_id),
    ownerName: d.owner?.name ?? '—',
    tagIds: tagsByDeal.get(String(d.id)) ?? [],
  }));

  const activities: ActivityItem[] = activityRows.map((a) => ({
    id: String(a.id),
    type: a.type,
    subject: a.subject,
    notes: a.notes ?? null,
    occurredAt: toDate(a.occurredAt),
    createdAt: toDate(a.createdAt),
    dealId: String(a.deal_id),
    dealName: a.deal?.name ?? '—',
    ownerId: String(a.owner_id),
    ownerName: a.owner?.name ?? '—',
  }));

  return { reps, tags, accounts, contacts, deals, activities };
}

/** Load the full workspace for the signed-in user, timed as a `query`. */
export function loadWorkspace(): Promise<Workspace> {
  return timed(
    'query',
    'Load workspace',
    fetchWorkspace,
    (ws) =>
      ws.reps.length +
      ws.tags.length +
      ws.accounts.length +
      ws.contacts.length +
      ws.deals.length +
      ws.activities.length
  );
}

// ---------------------------------------------------------------------------
// Deal mutations
// ---------------------------------------------------------------------------

export async function createDeal(input: NewDeal): Promise<void> {
  const client = getRayfinClient();
  const userId = currentUserId();
  await timed(
    'create',
    'Create deal',
    async () => {
      const deal = await client.data.Deal.create({
        name: input.name,
        stage: input.stage,
        source: input.source as DealSource,
        value: input.value,
        score: input.score,
        probability: input.probability,
        expectedCloseDate: input.expectedCloseDate,
        closedAt: input.closedAt ?? undefined,
        account_id: input.accountId,
        contact_id: input.contactId ?? undefined,
        owner_id: input.ownerId,
        createdAt: input.createdAt,
        user_id: userId,
      });
      if (input.tagIds.length > 0) {
        await Promise.all(
          input.tagIds.map((tagId) =>
            client.data.DealTag.create({
              deal_id: String(deal.id),
              tag_id: tagId,
              user_id: userId,
            })
          )
        );
      }
      return deal;
    },
    () => 1
  );
}

/** Move a deal to a new stage, syncing its default win probability. */
export async function updateDealStage(id: string, stage: DealStage): Promise<void> {
  const client = getRayfinClient();
  await timed(
    'update',
    'Update deal stage',
    () => client.data.Deal.update({ id }, { stage, probability: STAGE_PROBABILITY[stage] }),
    () => 1
  );
}

/** Delete a deal along with its dependent activities and tag links. */
export async function deleteDeal(id: string): Promise<void> {
  const client = getRayfinClient();
  await timed(
    'delete',
    'Delete deal',
    async () => {
      const [tagRows, activityRows] = await Promise.all([
        client.data.DealTag.select(['id']).where({ deal_id: { eq: id } }).execute(),
        client.data.Activity.select(['id']).where({ deal_id: { eq: id } }).execute(),
      ]);
      await Promise.all(tagRows.map((row) => client.data.DealTag.delete({ id: String(row.id) })));
      await Promise.all(
        activityRows.map((row) => client.data.Activity.delete({ id: String(row.id) }))
      );
      await client.data.Deal.delete({ id });
      return tagRows.length + activityRows.length + 1;
    },
    (n) => n
  );
}

// ---------------------------------------------------------------------------
// Bulk seed / reset across the whole graph
// ---------------------------------------------------------------------------

async function insertGraph(options?: SampleOptions, onProgress?: ProgressFn): Promise<number> {
  const client = getRayfinClient();
  const userId = currentUserId();
  const graph = buildSampleGraph(options);
  const total = totalRecords(graph);

  let done = 0;
  onProgress?.(0, total);
  const bump = (n: number) => {
    done += n;
    onProgress?.(done, total);
  };

  // Phase 1 — independent roots.
  const repIds = await createChunked(
    graph.reps,
    (r) => client.data.SalesRep.create({ ...r, user_id: userId }),
    bump
  );
  const tagIds = await createChunked(
    graph.tags,
    (t) => client.data.Tag.create({ ...t, user_id: userId }),
    bump
  );

  // Phase 2 — accounts (owned by reps).
  const accountIds = await createChunked(
    graph.accounts,
    (a) =>
      client.data.Account.create({
        name: a.name,
        industry: a.industry,
        website: a.website,
        city: a.city,
        country: a.country,
        employeeCount: a.employeeCount,
        annualRevenue: a.annualRevenue,
        tier: a.tier,
        owner_id: repIds[a.ownerIndex],
        createdAt: a.createdAt,
        user_id: userId,
      }),
    bump
  );

  // Phase 3 — contacts (belong to accounts).
  const contactIds = await createChunked(
    graph.contacts,
    (c) =>
      client.data.Contact.create({
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        title: c.title,
        account_id: accountIds[c.accountIndex],
        createdAt: c.createdAt,
        user_id: userId,
      }),
    bump
  );

  // Phase 4 — deals (account + optional contact + owner).
  const dealIds = await createChunked(
    graph.deals,
    (d) =>
      client.data.Deal.create({
        name: d.name,
        stage: d.stage,
        source: d.source,
        value: d.value,
        score: d.score,
        probability: d.probability,
        expectedCloseDate: d.expectedCloseDate,
        closedAt: d.closedAt ?? undefined,
        account_id: accountIds[d.accountIndex],
        contact_id: d.contactIndex != null ? contactIds[d.contactIndex] : undefined,
        owner_id: repIds[d.ownerIndex],
        createdAt: d.createdAt,
        user_id: userId,
      }),
    bump
  );

  // Phase 5 — activities and deal↔tag links.
  await createChunked(
    graph.activities,
    (a) =>
      client.data.Activity.create({
        type: a.type,
        subject: a.subject,
        notes: a.notes ?? undefined,
        occurredAt: a.occurredAt,
        deal_id: dealIds[a.dealIndex],
        owner_id: repIds[a.ownerIndex],
        createdAt: a.createdAt,
        user_id: userId,
      }),
    bump
  );

  const dealTagPayloads = graph.deals.flatMap((deal, dealIndex) =>
    deal.tagIndexes.map((tagIndex) => ({
      deal_id: dealIds[dealIndex],
      tag_id: tagIds[tagIndex],
    }))
  );
  await createChunked(
    dealTagPayloads,
    (p) => client.data.DealTag.create({ ...p, user_id: userId }),
    bump
  );

  return done;
}

/** Generate a coherent sample workspace, timed as an `insert` metric. */
export function generateSampleData(
  options?: SampleOptions,
  onProgress?: ProgressFn
): Promise<number> {
  return timed('insert', 'Generate sample data', () => insertGraph(options, onProgress), (n) => n);
}

async function deleteGraph(onProgress?: ProgressFn): Promise<number> {
  const client = getRayfinClient();

  const [dealTagIds, activityIds, dealIds, contactIds, accountIds, tagIds, repIds] =
    await Promise.all([
      collectIds((cursor) => {
        let q = client.data.DealTag.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      collectIds((cursor) => {
        let q = client.data.Activity.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      collectIds((cursor) => {
        let q = client.data.Deal.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      collectIds((cursor) => {
        let q = client.data.Contact.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      collectIds((cursor) => {
        let q = client.data.Account.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      collectIds((cursor) => {
        let q = client.data.Tag.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
      collectIds((cursor) => {
        let q = client.data.SalesRep.select(['id']).orderBy({ id: 'asc' }).first(PAGE_SIZE);
        if (cursor) q = q.after(cursor);
        return q.executePaginated();
      }),
    ]);

  const total =
    dealTagIds.length +
    activityIds.length +
    dealIds.length +
    contactIds.length +
    accountIds.length +
    tagIds.length +
    repIds.length;

  let done = 0;
  onProgress?.(0, total);
  const bump = (n: number) => {
    done += n;
    onProgress?.(done, total);
  };

  // Children first, then parents, to respect foreign-key constraints.
  await deleteChunked(dealTagIds, (id) => client.data.DealTag.delete({ id }), bump);
  await deleteChunked(activityIds, (id) => client.data.Activity.delete({ id }), bump);
  await deleteChunked(dealIds, (id) => client.data.Deal.delete({ id }), bump);
  await deleteChunked(contactIds, (id) => client.data.Contact.delete({ id }), bump);
  await deleteChunked(accountIds, (id) => client.data.Account.delete({ id }), bump);
  await deleteChunked(tagIds, (id) => client.data.Tag.delete({ id }), bump);
  await deleteChunked(repIds, (id) => client.data.SalesRep.delete({ id }), bump);

  return done;
}

/** Delete the entire workspace for the signed-in user, timed as a `delete`. */
export function resetWorkspace(onProgress?: ProgressFn): Promise<number> {
  return timed('delete', 'Reset workspace', () => deleteGraph(onProgress), (n) => n);
}
