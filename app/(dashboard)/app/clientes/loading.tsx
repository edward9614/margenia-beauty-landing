export default function CustomersLoading() {
  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9" aria-busy="true" aria-label="Cargando clientes">
      <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(145deg,#06101d_0%,#091827_48%,#07111f_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />

        <header className="border-b border-white/[0.07] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
          <div className="h-3 w-32 animate-pulse rounded-full bg-cyan-300/15 motion-reduce:animate-none" />
          <div className="mt-4 h-10 w-44 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
          <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/[0.07] motion-reduce:animate-none" />
        </header>

        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="h-72 animate-pulse rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] motion-reduce:animate-none lg:col-span-7" />
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
              <div className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05] motion-reduce:animate-none sm:col-span-2" />
              <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05] motion-reduce:animate-none" />
              <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05] motion-reduce:animate-none" />
            </div>
          </div>
          <div className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05] motion-reduce:animate-none" />
          <div className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05] motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}
