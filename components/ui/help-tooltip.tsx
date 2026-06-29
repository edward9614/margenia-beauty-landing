"use client";

import { useId, useState } from "react";

type HelpTooltipProps = {
  title?: string;
  content: string;
  example?: string;
};

export function HelpTooltip({ content, example, title }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex align-middle"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        aria-label={title ? `Ayuda: ${title}` : "Ver ayuda del campo"}
        onClick={() => setIsOpen((current) => !current)}
        className="grid h-5 w-5 place-items-center rounded-full border border-[#BFDBFE] bg-white text-[11px] font-black leading-none text-[#2563EB] shadow-sm outline-none transition hover:bg-[#EFF6FF] focus-visible:ring-4 focus-visible:ring-[#BFDBFE]/70"
      >
        ?
      </button>

      {isOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-7 z-50 w-[min(280px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left normal-case tracking-normal text-[#0F172A] shadow-xl shadow-[#0F172A]/10"
        >
          {title && <span className="block text-sm font-black text-[#0F172A]">{title}</span>}
          <span className={`block text-sm leading-5 text-[#475569] ${title ? "mt-1" : ""}`}>
            {content}
          </span>
          {example && (
            <span className="mt-3 block rounded-xl bg-[#EFF6FF] px-3 py-2 text-xs font-bold leading-5 text-[#1D4ED8]">
              {example}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
