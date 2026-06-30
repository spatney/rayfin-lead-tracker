import { RayfinClient } from '@microsoft/rayfin-client';

import type { AppSchema } from '../../rayfin/data/schema';

export interface RayfinClientConfig {
  baseUrl: string;
  publishableKey: string;
}

let client: RayfinClient<AppSchema> | null = null;

export function initRayfinClient(
  config: RayfinClientConfig
): RayfinClient<AppSchema> {
  if (client) {
    throw new Error('Rayfin client is already initialized.');
  }
  client = new RayfinClient<AppSchema>({
    baseUrl: config.baseUrl,
    publishableKey: config.publishableKey,
    useProxy: false,
    authStorage: true,
  });
  return client;
}

export function getRayfinClient(): RayfinClient<AppSchema> {
  if (!client) {
    throw new Error(
      'Rayfin client not initialized. Call bootstrapAuth() first.'
    );
  }
  return client;
}
