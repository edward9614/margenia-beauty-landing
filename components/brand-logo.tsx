"use client";

import Image from "next/image";
import { useState } from "react";

type BrandLogoProps = {
  compact?: boolean;
  showImage: boolean;
  tone?: "dark" | "light";
};

export function BrandLogo({ compact = false, showImage, tone = "dark" }: BrandLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!showImage || hasImageError) {
    return (
      <span className={`${compact ? "text-2xl" : "text-3xl sm:text-4xl"} font-black tracking-tight ${tone === "light" ? "text-white" : "text-[#0F172A]"}`}>
        Margenia
      </span>
    );
  }

  return (
    <Image
      src="/images/logo-margenia-nav.png"
      alt="Margenia"
      width={220}
      height={64}
      priority
      className={`${compact ? "max-h-9" : "max-h-11 sm:max-h-14"} w-auto object-contain`}
      onError={() => setHasImageError(true)}
    />
  );
}
