import {
  entity,
  role,
  uuid,
  text,
  email,
  date,
  one,
  many,
} from '@microsoft/rayfin-core';

import { Account } from './Account.js';
import { Deal } from './Deal.js';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Contact {
  @uuid() id!: string;
  @text({ min: 1, max: 60 }) firstName!: string;
  @text({ min: 1, max: 60 }) lastName!: string;
  @email() email!: string;
  @text({ max: 40 }) phone!: string;
  @text({ max: 90 }) title!: string;

  @uuid() account_id!: string;
  @one(() => Account) account?: Account;

  @many(() => Deal) deals?: Deal[];

  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
