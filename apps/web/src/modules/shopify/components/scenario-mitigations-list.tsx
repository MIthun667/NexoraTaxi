'use client';

export function ScenarioMitigationsList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No mitigation guidance is available for this scenario yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
