import { HelpTooltip } from "@/components/ui/help-tooltip";

export function InfoTooltip({
  content,
  example,
  title,
}: {
  content: string;
  example?: string;
  title?: string;
}) {
  return <HelpTooltip content={content} example={example} title={title} />;
}

export const FieldHelpTooltip = InfoTooltip;
