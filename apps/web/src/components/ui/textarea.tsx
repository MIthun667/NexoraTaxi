import { forwardRef, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[110px] w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[var(--brand-500)] focus:outline-none',
      className,
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';
