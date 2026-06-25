export default function ProductsLoading() {
  return (
    <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-6 xl:px-10">
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[#E2E8F0] bg-white p-7 shadow-sm">
          <div className="h-4 w-24 rounded-full bg-[#E2E8F0]" />
          <div className="mt-4 h-10 w-56 rounded-2xl bg-[#E2E8F0]" />
          <div className="mt-4 h-5 w-full max-w-2xl rounded-full bg-[#E2E8F0]" />
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 rounded-[1.5rem] border border-[#E2E8F0] bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-24 rounded-full bg-[#E2E8F0]" />
              <div className="mt-5 h-8 w-16 rounded-xl bg-[#E2E8F0]" />
            </div>
          ))}
        </section>
        <section className="h-96 rounded-[2rem] border border-[#E2E8F0] bg-white shadow-sm" />
      </div>
    </main>
  );
}
