import { entity, role, text, int, date, uuid } from '@microsoft/rayfin-core';

@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Lead {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) name!: string;
  @text({ max: 120 }) company!: string;
  @text({ max: 160 }) email!: string;
  @text({ max: 40 }) phone!: string;
  @text({ max: 24 }) status!: string;
  @text({ max: 40 }) source!: string;
  @text({ max: 48 }) industry!: string;
  @int() value!: number;
  @int() score!: number;
  @date() createdAt!: Date;
  @text({ max: 200 }) user_id!: string;
}
