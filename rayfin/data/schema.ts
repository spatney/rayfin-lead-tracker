import { SalesRep } from './SalesRep.js';
import { Account } from './Account.js';
import { Contact } from './Contact.js';
import { Deal } from './Deal.js';
import { Activity } from './Activity.js';
import { Tag } from './Tag.js';
import { DealTag } from './DealTag.js';

export type AppSchema = {
  SalesRep: SalesRep;
  Account: Account;
  Contact: Contact;
  Deal: Deal;
  Activity: Activity;
  Tag: Tag;
  DealTag: DealTag;
};

export const schema = [SalesRep, Account, Contact, Deal, Activity, Tag, DealTag];
