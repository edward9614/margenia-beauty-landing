import { HelpTooltip } from "@/components/ui/help-tooltip";
import type { HelpContent } from "@/lib/help-content";

export function ActionHelp({ help }: { help: HelpContent }) {
  return (
    <span className="inline-flex shrink-0">
      <HelpTooltip {...help} />
    </span>
  );
}
