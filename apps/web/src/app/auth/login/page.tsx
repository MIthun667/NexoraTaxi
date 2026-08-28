'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Binary,
  Building2,
  LockKeyhole,
  Radar,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@northstar-universal.demo',
      password: 'Nexora@123',
    },
  });

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-transparent lg:grid-cols-[1.15fr_0.85fr]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(248,203,115,0.12),transparent_24%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.1),transparent_18%),radial-gradient(circle_at_40%_100%,rgba(244,180,79,0.08),transparent_28%)]" />

      <div className="relative hidden border-r border-white/6 px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
            <Building2 className="h-6 w-6 text-[var(--brand-500)]" />
          </div>
          <div>
            <p className="text-xl font-semibold text-white">Nexora OS</p>
            <p className="text-sm tracking-[0.24em] text-slate-400 uppercase">Admin Center</p>
          </div>
        </div>

        <div className="max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Operational Command
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-white xl:text-6xl">
              Run workforce, assets, operations, and approvals from one hardened control plane.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Enterprise visibility for live operations, built for supervisors, controllers, and platform
              operators managing live readiness, compliance posture, and execution flow.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.34)] backdrop-blur-xl">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Command Surface</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Nexora Company Operations Grid</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Platform state</p>
                  <p className="mt-1 text-sm font-medium text-emerald-300">Hardened and live</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: 'RBAC secured',
                    value: 'Permission-bound control',
                    Icon: Shield,
                  },
                  {
                    label: 'Workflow aware',
                    value: 'Approval and task context',
                    Icon: LockKeyhole,
                  },
                  {
                    label: 'Operations ready',
                    value: 'Operators, assets, operations',
                    Icon: Radar,
                  },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-slate-950/45 p-4">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      <Icon className="h-4.5 w-4.5 text-[var(--brand-500)]" />
                    </div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#08111d]/80 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.3)] backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Binary className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live posture</p>
                  <p className="text-base font-semibold text-white">Operational visibility</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  'Supervise workforce readiness and department capacity.',
                  'Track operations flow, issues, and active assignment pressure.',
                  'Review compliance signals across operators, assets, and approvals.',
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--brand-500)]" />
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/[0.035] px-5 py-4 text-sm text-slate-400">
          <p>Enterprise visibility for live enterprise operations.</p>
          <div className="flex items-center gap-2 text-slate-300">
            <span>Command surface</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="relative grid place-items-center px-6 py-10 lg:px-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.22),rgba(3,7,18,0.7))]" />
        <Card className="relative w-full max-w-[28rem] rounded-[30px] border-white/10 bg-[linear-gradient(180deg,rgba(11,24,40,0.94),rgba(7,14,24,0.92))] p-1 shadow-[0_35px_120px_rgba(2,6,23,0.55)]">
          <div className="rounded-[26px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(248,203,115,0.08),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,15,26,0.98))] p-6">
          <CardHeader className="mb-0 flex-col gap-3 border-b border-white/8 pb-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-300">
              <Shield className="h-3.5 w-3.5 text-[var(--brand-500)]" />
              Secure access
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Sign in to Admin Center</CardTitle>
              <CardDescription className="leading-6">
                Use a seeded platform account to access Nexora Company OS surfaces.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  setErrorMessage(null);
                  await login(values.email, values.password);
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error ? error.message : 'Authentication failed.',
                  );
                }
              })}
            >
              <div className="space-y-2.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Email</label>
                <Input
                  type="email"
                  autoComplete="email"
                  className="h-11 rounded-2xl border-white/10 bg-[#07111d]/85 px-4 text-slate-100 placeholder:text-slate-600"
                  {...form.register('email')}
                />
                {form.formState.errors.email ? (
                  <p className="text-xs text-rose-300">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2.5">
                <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Password</label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  className="h-11 rounded-2xl border-white/10 bg-[#07111d]/85 px-4 text-slate-100 placeholder:text-slate-600"
                  {...form.register('password')}
                />
                {form.formState.errors.password ? (
                  <p className="text-xs text-rose-300">{form.formState.errors.password.message}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Development access</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Default platform credentials are prefilled for development. Reseed the backend to use
                  {' '}
                  <span className="font-medium text-white">admin@northstar-universal.demo</span>
                  {' '}and{' '}
                  <span className="font-medium text-white">Nexora@123</span>.
                </p>
              </div>

              {errorMessage ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {errorMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full rounded-2xl text-sm font-semibold shadow-[0_16px_40px_rgba(244,180,79,0.22)]"
                disabled={isLoading || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
