import { HelpTooltip } from "@/components/ui/help-tooltip";
import type { HelpContent } from "@/lib/help-content";

export function FieldLabel({
  appearance = "light",
  help,
  label,
  required = false,
}: {
  appearance?: "dark" | "light";
  help?: HelpContent;
  label: string;
  required?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-black ${appearance === "dark" ? "text-slate-100" : "text-[#0F172A]"}`}>
      {label}
      {required && <span className="text-[#EF4444]">*</span>}
      {help && <HelpTooltip {...help} />}
    </span>
  );
}
