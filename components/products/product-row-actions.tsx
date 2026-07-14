"use client";

import Link from "next/link";
import { ProductArchiveAction } from "@/components/products/product-archive-action";

type ProductRowActionsProps = {
  appearance?: "dark" | "light";
  editHref: string;
  hasStock?: boolean;
  productId: string;
  status: "active" | "archived";
  variant?: "inline" | "block";
};

export function ProductRowActions({
  appearance = "light",
  editHref,
  hasStock = false,
  productId,
  status,
  variant = "inline",
}: ProductRowActionsProps) {
  const isBlock = variant === "block";
  const dark = appearance === "dark";

  return (
    <div className={isBlock ? "mt-4 grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}>
      <Link
        href={editHref}
        className={
          isBlock
            ? dark
              ? "block rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-center text-sm font-black text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              : "block rounded-full bg-[#EFF6FF] px-4 py-3 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
            : dark
              ? "rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              : "rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
        }
      >
        Editar
      </Link>
      <ProductArchiveAction
        appearance={appearance}
        productId={productId}
        status={status}
        totalStock={hasStock ? 1 : 0}
        variant={variant}
      />
    </div>
  );
}
