"use client";

import Link from "next/link";
import { ProductArchiveAction } from "@/components/products/product-archive-action";

type ProductRowActionsProps = {
  editHref: string;
  hasStock?: boolean;
  productId: string;
  status: "active" | "archived";
  variant?: "inline" | "block";
};

export function ProductRowActions({
  editHref,
  hasStock = false,
  productId,
  status,
  variant = "inline",
}: ProductRowActionsProps) {
  const isBlock = variant === "block";

  return (
    <div className={isBlock ? "mt-4 grid gap-2 sm:grid-cols-2" : "flex flex-wrap gap-2"}>
      <Link
        href={editHref}
        className={
          isBlock
            ? "block rounded-full bg-[#EFF6FF] px-4 py-3 text-center text-sm font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
            : "rounded-full bg-[#EFF6FF] px-4 py-2 text-xs font-black text-[#2563EB] ring-1 ring-[#BFDBFE]"
        }
      >
        Editar
      </Link>
      <ProductArchiveAction
        productId={productId}
        status={status}
        totalStock={hasStock ? 1 : 0}
        variant={variant}
      />
    </div>
  );
}
