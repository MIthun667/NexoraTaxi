import { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  actions,
  variant = 'panel',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  variant?: 'panel' | 'subtle' | 'plain';
}) {
  const wrapperClass =
    variant === 'plain'
      ? 'border-0 bg-transparent p-0 shadow-none backdrop-blur-none'
      : variant === 'subtle'
        ? 'border border-white/5 bg-white/[0.015] p-4 shadow-none backdrop-blur-none'
        : undefined;

  return (
    <Card className={wrapperClass}>
      <CardHeader className={variant === 'plain' ? 'mb-3' : 'mb-5'}>
        <div className="space-y-1.5 min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80">
              {eyebrow}
            </p>
          ) : null}
          <CardTitle className="leading-tight">{title}</CardTitle>
          {description ? <CardDescription className="text-slate-500/80 max-w-xl">{description}</CardDescription> : null}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </CardHeader>
      <CardContent className={variant === 'plain' ? 'p-0' : undefined}>
        {children}
      </CardContent>
    </Card>
  );
}
