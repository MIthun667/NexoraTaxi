'use client';

import { CommerceDataTrustStrip } from './commerce-data-trust';
import { CommerceDataTrustStatus } from '@/types/shopify-intelligence';

export function OverviewSystemStatusBar({
  trust,
}: {
  trust: CommerceDataTrustStatus | null;
}) {
  return <CommerceDataTrustStrip trust={trust} />;
}
