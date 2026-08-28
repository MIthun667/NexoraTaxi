import { ReactNode } from 'react';

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {children}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </label>
  );
}
