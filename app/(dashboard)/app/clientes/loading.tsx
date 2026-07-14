export default function CustomersLoading() {
  return (
    <main className="w-full animate-pulse space-y-6 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
      <div className="h-40 rounded-[2rem] bg-[#E2E8F0]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-36 rounded-[1.75rem] bg-[#E2E8F0]" />)}</div>
      <div className="h-24 rounded-[2rem] bg-[#E2E8F0]" />
      <div className="h-96 rounded-[2rem] bg-[#E2E8F0]" />
    </main>
  );
}
