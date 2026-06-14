"use client";

import type { ComponentPropsWithoutRef } from "react";
import { trackEvent, type AnalyticsParams } from "@/lib/analytics";

type TrackedEvent = {
  name: string;
  params?: AnalyticsParams;
};

type TrackedLinkProps = Omit<ComponentPropsWithoutRef<"a">, "onClick"> & {
  events: TrackedEvent[];
};

export function TrackedLink({ events, children, ...props }: TrackedLinkProps) {
  return (
    <a
      {...props}
      onClick={() => {
        events.forEach(({ name, params }) => trackEvent(name, params));
      }}
    >
      {children}
    </a>
  );
}
