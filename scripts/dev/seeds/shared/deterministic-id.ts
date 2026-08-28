import { createHash } from 'crypto';

const buildUuid = (namespace: string, seed: string): string => {
  const digest = createHash('sha256').update(`${namespace}:${seed}`).digest('hex');

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${((parseInt(digest.slice(16, 17), 16) & 0x3) | 0x8).toString(16)}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
};

export const deterministicPackUuid = (packNamespace: string, seed: string): string =>
  buildUuid(`seed-pack:${packNamespace}`, seed);

export const deterministicGlobalSeedUuid = (seed: string): string =>
  buildUuid('seed-pack:global', seed);
