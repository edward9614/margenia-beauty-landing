type IconProps = {
  className?: string;
};

export function SalesIcon({ className = "" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 15v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 15V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 15v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ProfitIcon({ className = "" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 17 10 12l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8h3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoxIcon({ className = "" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4.5 8 12 12.2 19.5 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 21v-8.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WalletIcon({ className = "" }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16 13h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyActivityIcon() {
  return (
    <div className="relative mx-auto h-28 w-40" aria-hidden="true">
      <div className="absolute inset-x-4 bottom-3 h-16 rounded-[2rem] bg-[#EFF6FF]" />
      <div className="absolute left-8 top-5 h-16 w-16 rounded-3xl border border-[#BFDBFE] bg-white shadow-sm" />
      <div className="absolute right-6 top-2 h-20 w-20 rounded-full bg-[#E0F7FA]" />
      <div className="absolute left-14 top-10 h-3 w-14 rounded-full bg-[#2563EB]/20" />
      <div className="absolute left-14 top-16 h-3 w-20 rounded-full bg-[#06B6D4]/20" />
    </div>
  );
}
