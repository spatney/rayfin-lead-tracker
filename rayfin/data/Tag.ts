import { entity, role, uuid, text, date, many } from '@microsoft/rayfin-core';

import { DealTag } from './DealTag.js';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Tag {
  @uuid() id!: string;
  @text({ min: 1, max: 40 }) label!: string;
  @text({ max: 16 }) color!: string;

  @many(() => DealTag) dealTags?: DealTag[];

  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
