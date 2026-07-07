import {
  entity,
  role,
  uuid,
  text,
  date,
  set,
  one,
} from '@microsoft/rayfin-core';

import { Deal } from './Deal.js';
import { SalesRep } from './SalesRep.js';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Activity {
  @uuid() id!: string;
  @set('Call', 'Email', 'Meeting', 'Demo', 'Note')
  type!: 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Note';
  @text({ min: 1, max: 160 }) subject!: string;
  @text({ max: 400, optional: true }) notes?: string;
  @date() occurredAt!: Date;

  @uuid() deal_id!: string;
  @one(() => Deal) deal?: Deal;

  @uuid() owner_id!: string;
  @one(() => SalesRep) owner?: SalesRep;

  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
