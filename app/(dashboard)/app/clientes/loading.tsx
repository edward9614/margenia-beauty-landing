export default function CustomersLoading() {
  return (
    <main className="w-full px-3 py-3 sm:px-5 sm:py-5 lg:px-7 xl:px-9">
      <div className="animate-pulse overflow-hidden rounded-[1.75rem] border border-slate-800 bg-[#07111F] p-4 sm:p-6 lg:p-8">
        <div className="h-28 rounded-2xl bg-white/[0.05]" />
        <div className="mt-5 grid gap-4 lg:grid-cols-12"><div className="h-72 rounded-2xl bg-cyan-300/[0.06] lg:col-span-7" /><div className="grid gap-3 sm:grid-cols-2 lg:col-span-5"><div className="h-36 rounded-2xl bg-white/[0.05] sm:col-span-2" /><div className="h-32 rounded-2xl bg-white/[0.05]" /><div className="h-32 rounded-2xl bg-white/[0.05]" /></div></div>
        <div className="mt-5 h-16 rounded-2xl bg-white/[0.05]" />
        <div className="mt-5 h-96 rounded-2xl bg-white/[0.05]" />
      </div>
    </main>
  );
}
