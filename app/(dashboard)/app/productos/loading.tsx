export default function ProductsLoading() {
  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[linear-gradient(145deg,#06101d_0%,#091827_48%,#07111f_100%)]">
        <header className="border-b border-white/[0.07] px-5 py-7 sm:px-7 lg:px-8 lg:py-9">
          <div className="h-3 w-24 animate-pulse rounded-full bg-cyan-300/15" />
          <div className="mt-4 h-10 w-52 animate-pulse rounded-xl bg-white/10" />
          <div className="mt-4 h-4 w-full max-w-2xl animate-pulse rounded-full bg-white/[0.07]" />
        </header>
        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <div className="h-3 w-28 rounded-full bg-white/10" />
                <div className="mt-6 h-9 w-20 rounded-xl bg-white/10" />
              </div>
            ))}
          </section>
          <section className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />
          <section className="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/[0.035]" />
        </div>
      </div>
    </main>
  );
}
