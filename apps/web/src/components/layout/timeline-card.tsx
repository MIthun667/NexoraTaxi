import { HistoryTimeline, TimelineItem } from '@/components/layout/history-timeline';
import { SectionCard } from '@/components/layout/section-card';

export function TimelineCard({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: TimelineItem[];
}) {
  return (
    <SectionCard title={title} description={description}>
      <HistoryTimeline items={items} />
    </SectionCard>
  );
}
