'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--brand-500)] text-slate-950 hover:bg-[var(--brand-400)] focus-visible:ring-[var(--brand-500)]',
        secondary: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-700',
        outline: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus-visible:ring-white/20',
        ghost: 'text-slate-300 hover:bg-white/5 hover:text-white focus-visible:ring-white/20',
        danger: 'bg-rose-500 text-white hover:bg-rose-400 focus-visible:ring-rose-400',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
