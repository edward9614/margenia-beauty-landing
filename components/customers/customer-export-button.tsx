"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function CustomerExportButton({
  appearance = "light",
  customerId,
  label = "Exportar clientes",
  scope = "list",
}: {
  appearance?: "dark" | "light";
  customerId?: string;
  label?: string;
  scope?: "debts" | "history" | "list";
}) {
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setIsGenerating(true);
    setError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", scope);
    if (customerId) params.set("customerId", customerId);

    try {
      const response = await fetch(`/app/clientes/export?${params.toString()}`);
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "No pudimos generar el Excel. Intenta nuevamente.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || "margenia-clientes.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No pudimos generar el Excel.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={download} disabled={isGenerating} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black ring-1 transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${appearance === "dark" ? "bg-white/[0.06] text-slate-100 ring-white/15 hover:bg-cyan-300/10 hover:text-white hover:ring-cyan-300/30" : "bg-white text-[#2563EB] ring-[#BFDBFE] hover:bg-[#EFF6FF]"}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {isGenerating ? "Generando Excel..." : label}
      </button>
      {error && <p className={`mt-2 max-w-xs text-xs font-bold ${appearance === "dark" ? "text-rose-300" : "text-[#DC2626]"}`}>{error}</p>}
    </div>
  );
}
