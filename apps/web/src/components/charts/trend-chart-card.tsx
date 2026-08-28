'use client';

import { TrendChart } from '@/components/charts/trend-chart';
import { SectionCard } from '@/components/layout/section-card';

export function TrendChartCard({
  eyebrow,
  title,
  description,
  data,
  dataKey = 'count',
  color,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  data: Array<{ label: string; count: number } & Record<string, string | number>>;
  dataKey?: string;
  color?: string;
}) {
  return (
    <SectionCard eyebrow={eyebrow} title={title} description={description}>
      <TrendChart data={data} dataKey={dataKey} color={color} />
    </SectionCard>
  );
}
