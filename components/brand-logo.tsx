"use client";

import Image from "next/image";
import { useState } from "react";

type BrandLogoProps = {
  showImage: boolean;
};

export function BrandLogo({ showImage }: BrandLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!showImage || hasImageError) {
    return (
      <span className="text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
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
      className="max-h-14 w-auto object-contain sm:max-h-16"
      onError={() => setHasImageError(true)}
    />
  );
}
