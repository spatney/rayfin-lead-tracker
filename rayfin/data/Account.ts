import {
  entity,
  role,
  uuid,
  text,
  int,
  date,
  set,
  one,
  many,
} from '@microsoft/rayfin-core';

import { SalesRep } from './SalesRep.js';
import { Contact } from './Contact.js';
import { Deal } from './Deal.js';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Account {
  @uuid() id!: string;
  @text({ min: 1, max: 140 }) name!: string;
  @text({ max: 48 }) industry!: string;
  @text({ max: 140 }) website!: string;
  @text({ max: 60 }) city!: string;
  @text({ max: 60 }) country!: string;
  @int() employeeCount!: number;
  @int() annualRevenue!: number;
  @set('Strategic', 'Enterprise', 'Mid-Market', 'SMB')
  tier!: 'Strategic' | 'Enterprise' | 'Mid-Market' | 'SMB';

  @uuid() owner_id!: string;
  @one(() => SalesRep) owner?: SalesRep;

  @many(() => Contact) contacts?: Contact[];
  @many(() => Deal) deals?: Deal[];

  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
