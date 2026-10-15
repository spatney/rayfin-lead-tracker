import { entity, authenticated, uuid, text, one } from '@microsoft/rayfin-core';

import { Deal } from './Deal.js';
import { Tag } from './Tag.js';

@entity()
@authenticated('*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class DealTag {
  @uuid() id!: string;

  @uuid({ optional: true }) deal_id?: string;
  @one(() => Deal) deal?: Deal;

  @uuid({ optional: true }) tag_id?: string;
  @one(() => Tag) tag?: Tag;

  @text({ max: 200 }) user_id!: string;
}
