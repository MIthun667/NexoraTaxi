import { createHash } from 'crypto';

import { SEED_NAMESPACE } from './catalog';

export const deterministicUuid = (seed: string): string => {
  const digest = createHash('sha256')
    .update(`${SEED_NAMESPACE}:${seed}`)
    .digest('hex');

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `${((parseInt(digest.slice(16, 17), 16) & 0x3) | 0x8).toString(16)}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
};

export const rotatePick = <T>(items: readonly T[], index: number): T =>
  items[index % items.length];

export const toTitleCase = (value: string): string =>
  value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const startOfDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const hireDateFromIndex = (index: number, recentBias = false): Date => {
  const baseYear = recentBias ? 2024 : 2018;
  const yearSpan = recentBias ? 2 : 8;
  const year = baseYear + (index % yearSpan);
  const month = (index * 7) % 12;
  const day = ((index * 11) % 27) + 1;

  return startOfDay(new Date(Date.UTC(year, month, day)));
};

export const phoneNumberFromIndex = (index: number): string => {
  const area = 200 + (index % 700);
  const exchange = 100 + ((index * 17) % 900);
  const subscriber = `${1000 + ((index * 97) % 9000)}`;

  return `+1${area}${exchange}${subscriber}`;
};
