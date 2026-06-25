"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsParams } from "@/lib/analytics";

export function ProductAnalyticsEvent({
  eventName,
  params = {},
}: {
  eventName: string;
  params?: AnalyticsParams;
}) {
  useEffect(() => {
    trackEvent(eventName, params);
  }, [eventName, params]);

  return null;
}
