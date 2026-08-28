import { ReactNode } from 'react';

import { SectionCard } from '@/components/layout/section-card';

export function DetailSection({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <SectionCard eyebrow={eyebrow} title={title} description={description}>
      {children}
    </SectionCard>
  );
}
