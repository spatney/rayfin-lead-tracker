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

import { Account } from './Account.js';
import { Contact } from './Contact.js';
import { SalesRep } from './SalesRep.js';
import { Activity } from './Activity.js';
import { DealTag } from './DealTag.js';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Deal {
  @uuid() id!: string;
  @text({ min: 1, max: 140 }) name!: string;
  @set('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')
  stage!: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
  @set(
    'Website',
    'Referral',
    'Cold Call',
    'Email Campaign',
    'Social Media',
    'Event',
    'Partner'
  )
  source!:
    | 'Website'
    | 'Referral'
    | 'Cold Call'
    | 'Email Campaign'
    | 'Social Media'
    | 'Event'
    | 'Partner';
  @int() value!: number;
  @int() score!: number;
  @int() probability!: number;
  @date() expectedCloseDate!: Date;
  @date({ optional: true }) closedAt?: Date;

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
