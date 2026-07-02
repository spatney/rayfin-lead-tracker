import { getRayfinClient } from './rayfinClient';
import { buildSampleLeads } from './sampleData';
import { timed } from './metrics';
import type { LeadItem, NewLead } from './leadTypes';

const LEAD_FIELDS = [
  'id',
  'name',
  'company',
  'email',
  'phone',
  'status',
  'source',
  'industry',
  'value',
  'score',
  'createdAt',
] as const;

export type LeadUpdate = Partial<
  Pick<
    LeadItem,
    | 'name'
    | 'company'
    | 'email'
    | 'phone'
    | 'status'
    | 'source'
    | 'industry'
    | 'value'
    | 'score'
  >
>;

export type ProgressFn = (done: number, total: number) => void;

const PAGE_SIZE = 500;
const WRITE_CHUNK = 50;

/** Fetch every lead for the signed-in user, paging through the cursor API. */
async function fetchAllLeads(): Promise<LeadItem[]> {
  const client = getRayfinClient();
  const all: LeadItem[] = [];
  let cursor: string | undefined;

  for (let guard = 0; guard < 500; guard++) {
    let query = client.data.Lead.select(LEAD_FIELDS)
      .orderBy({ createdAt: 'desc' })
      .first(PAGE_SIZE);
    if (cursor) query = query.after(cursor);

    const page = await query.executePaginated();
    for (const row of page.items) {
      all.push({
        id: String(row.id),
        name: row.name,
        company: row.company,
        email: row.email,
        phone: row.phone,
        status: row.status,
        source: row.source,
        industry: row.industry,
        value: Number(row.value),
        score: Number(row.score),
        createdAt: new Date(row.createdAt as unknown as string),
      });
    }

    if (!page.hasNextPage || !page.endCursor) break;
    cursor = page.endCursor;
  }

  return all;
}

/** Fetch every lead for the signed-in user, timed as a `query` metric. */
export function getLeads(): Promise<LeadItem[]> {
  return timed('query', 'Load all leads', fetchAllLeads, (rows) => rows.length);
}

function currentUserId(): string {
  const client = getRayfinClient();
  const session = client.auth.getSession();
  if (!session.isAuthenticated || !session.user) {
    throw new Error('You must be signed in to manage leads.');
  }
  return session.user.id;
}

export async function createLead(input: NewLead): Promise<void> {
  const client = getRayfinClient();
  const userId = currentUserId();
  await timed(
    'create',
    'Create lead',
    () => client.data.Lead.create({ ...input, user_id: userId }),
    () => 1
  );
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<void> {
  const client = getRayfinClient();
  await timed('update', 'Update lead', () => client.data.Lead.update({ id }, updates), () => 1);
}

export async function deleteLead(id: string): Promise<void> {
  const client = getRayfinClient();
  await timed('delete', 'Delete lead', () => client.data.Lead.delete({ id }), () => 1);
}

/** Bulk-create varied sample leads in parallel chunks, reporting progress. */
async function insertSampleLeads(
  count: number,
  onProgress?: ProgressFn
): Promise<number> {
  const client = getRayfinClient();
  const userId = currentUserId();
  const leads = buildSampleLeads(count);

  let done = 0;
  onProgress?.(0, leads.length);
  for (let i = 0; i < leads.length; i += WRITE_CHUNK) {
    const chunk = leads.slice(i, i + WRITE_CHUNK);
    await Promise.all(
      chunk.map((lead) => client.data.Lead.create({ ...lead, user_id: userId }))
    );
    done += chunk.length;
    onProgress?.(done, leads.length);
  }
  return done;
}

/** Generate sample leads, timed as an `insert` metric. */
export function generateSampleLeads(
  count = 1000,
  onProgress?: ProgressFn
): Promise<number> {
  return timed(
    'insert',
    `Generate ${count.toLocaleString()} leads`,
    () => insertSampleLeads(count, onProgress),
    (inserted) => inserted
  );
}

/** Delete every lead for the signed-in user (used by the "Clear all" action). */
async function clearAllLeads(onProgress?: ProgressFn): Promise<number> {
  const client = getRayfinClient();
  const ids: string[] = [];
  let cursor: string | undefined;

  for (let guard = 0; guard < 1000; guard++) {
    let query = client.data.Lead.select(['id']).first(PAGE_SIZE);
    if (cursor) query = query.after(cursor);
    const page = await query.executePaginated();
    for (const row of page.items) ids.push(String(row.id));
    if (!page.hasNextPage || !page.endCursor) break;
    cursor = page.endCursor;
  }

  let done = 0;
  onProgress?.(0, ids.length);
  for (let i = 0; i < ids.length; i += WRITE_CHUNK) {
    const chunk = ids.slice(i, i + WRITE_CHUNK);
    await Promise.all(chunk.map((id) => client.data.Lead.delete({ id })));
    done += chunk.length;
    onProgress?.(done, ids.length);
  }
  return done;
}

/** Clear all leads, timed as a `delete` metric. */
export function deleteAllLeads(onProgress?: ProgressFn): Promise<number> {
  return timed(
    'delete',
    'Clear all leads',
    () => clearAllLeads(onProgress),
    (deleted) => deleted
  );
}
