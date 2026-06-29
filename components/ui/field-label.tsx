import { HelpTooltip } from "@/components/ui/help-tooltip";
import type { HelpContent } from "@/lib/help-content";

export function FieldLabel({
  help,
  label,
  required = false,
}: {
  help?: HelpContent;
  label: string;
  required?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-black text-[#0F172A]">
      {label}
      {required && <span className="text-[#EF4444]">*</span>}
      {help && <HelpTooltip {...help} />}
    </span>
  );
}
