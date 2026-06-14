"use client";

export type AnalyticsParams = Record<
  string,
  string | number | boolean | undefined
>;

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: AnalyticsParams,
    ) => void;
  }
}

export function trackEvent(
  eventName: string,
  params: AnalyticsParams = {},
) {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_GA_ID ||
    !window.gtag
  ) {
    return;
  }

  window.gtag("event", eventName, {
    ...params,
    page_path: window.location.pathname,
  });
}
