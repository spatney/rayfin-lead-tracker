import {
  entity,
  role,
  uuid,
  text,
  email,
  int,
  date,
  set,
  many,
} from '@microsoft/rayfin-core';

import { Account } from './Account.js';
import { Deal } from './Deal.js';
import { Activity } from './Activity.js';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class SalesRep {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) name!: string;
  @email() email!: string;
  @text({ max: 80 }) title!: string;
  @set('North America', 'EMEA', 'APAC', 'LATAM')
  region!: 'North America' | 'EMEA' | 'APAC' | 'LATAM';
  @int() quota!: number;
  @text({ max: 16 }) avatarColor!: string;
  @date() createdAt!: Date;

  @many(() => Account) accounts?: Account[];
  @many(() => Deal) deals?: Deal[];
  @many(() => Activity) activities?: Activity[];

  @text({ max: 200 }) user_id!: string;
}
