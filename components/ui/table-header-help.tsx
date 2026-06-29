import { HelpTooltip } from "@/components/ui/help-tooltip";
import type { HelpContent } from "@/lib/help-content";

export function TableHeaderHelp({
  help,
  label,
}: {
  help?: HelpContent;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      {help && <HelpTooltip {...help} />}
    </span>
  );
}
