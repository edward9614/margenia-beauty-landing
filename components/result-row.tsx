import { currencyFormatter } from "@/components/calculator-utils";

type ResultRowProps = {
  label: string;
  value: number;
  percentage?: boolean;
};

export function ResultRow({ label, value, percentage = false }: ResultRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] py-3 last:border-none">
      <span className="text-sm text-[#475569]">{label}</span>
      <strong className="text-right text-base text-[#0F172A]">
        {percentage ? `${value.toFixed(1)}%` : currencyFormatter.format(value)}
      </strong>
    </div>
  );
}
