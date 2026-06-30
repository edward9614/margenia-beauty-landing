"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type HelpTooltipProps = {
  title?: string;
  content: string;
  example?: string;
  side?: "bottom" | "left" | "right" | "top";
};

type TooltipSide = NonNullable<HelpTooltipProps["side"]>;

const VIEWPORT_GAP = 16;
const TRIGGER_GAP = 10;

const initialPosition = {
  left: 0,
  top: 0,
};

export function HelpTooltip({ content, example, side = "bottom", title }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const tooltipId = useId();
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.offsetWidth || 280;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 140;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let nextSide: TooltipSide = side;

    if (nextSide === "top" && rect.top < tooltipHeight + TRIGGER_GAP + VIEWPORT_GAP) {
      nextSide = "bottom";
    }

    if (nextSide === "bottom" && viewportHeight - rect.bottom < tooltipHeight + TRIGGER_GAP + VIEWPORT_GAP) {
      nextSide = "top";
    }

    if (nextSide === "left" && rect.left < tooltipWidth + TRIGGER_GAP + VIEWPORT_GAP) {
      nextSide = "right";
    }

    if (nextSide === "right" && viewportWidth - rect.right < tooltipWidth + TRIGGER_GAP + VIEWPORT_GAP) {
      nextSide = "left";
    }

    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (nextSide === "top") {
      top = rect.top - tooltipHeight - TRIGGER_GAP;
    }

    if (nextSide === "bottom") {
      top = rect.bottom + TRIGGER_GAP;
    }

    if (nextSide === "left") {
      left = rect.left - tooltipWidth - TRIGGER_GAP;
    }

    if (nextSide === "right") {
      left = rect.right + TRIGGER_GAP;
    }

    setPosition({
      left: Math.min(Math.max(left, VIEWPORT_GAP), viewportWidth - tooltipWidth - VIEWPORT_GAP),
      top: Math.min(Math.max(top, VIEWPORT_GAP), viewportHeight - tooltipHeight - VIEWPORT_GAP),
    });
  }, [side]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target) || tooltipRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span
      ref={triggerRef}
      className="inline-flex align-middle"
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

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
              className="fixed z-[9999] w-[min(280px,calc(100vw-2rem))] rounded-2xl border border-[#E2E8F0] bg-white p-4 text-left normal-case tracking-normal text-[#0F172A] shadow-2xl shadow-[#0F172A]/20"
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
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
