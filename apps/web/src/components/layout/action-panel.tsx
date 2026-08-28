import { ReactNode } from 'react';

import { SectionCard } from '@/components/layout/section-card';

export function ActionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SectionCard eyebrow="Actions" title={title} description={description}>
      {children}
    </SectionCard>
  );
}
