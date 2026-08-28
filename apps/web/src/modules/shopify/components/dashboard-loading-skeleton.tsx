export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.72))] p-8">
        <div className="h-4 w-32 rounded-full bg-white/10" />
        <div className="mt-4 h-10 w-80 rounded-full bg-white/10" />
        <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-32 rounded-3xl border border-white/10 bg-white/[0.03]" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[28rem] rounded-3xl border border-white/10 bg-white/[0.03]" />
        <div className="space-y-6">
          <div className="h-60 rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-52 rounded-3xl border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
    </div>
  );
}
