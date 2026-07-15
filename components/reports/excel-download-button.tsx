"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type ExcelDownloadButtonProps = {
  activeTab: string;
};

export function ExcelDownloadButton({ activeTab }: ExcelDownloadButtonProps) {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleDownload() {
    setError("");
    setIsGenerating(true);

    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", params.get("tab") || activeTab);

      const response = await fetch(`/app/reportes/export?${params.toString()}`);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message || "No pudimos generar el Excel. Intenta nuevamente.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || "margenia-reporte.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "No pudimos generar el Excel. Intenta nuevamente.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-sm font-black text-slate-100 backdrop-blur transition duration-200 hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <svg
          className="h-4 w-4"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        {isGenerating ? "Generando Excel..." : "Descargar Excel"}
      </button>
      {error && (
        <p className="max-w-xs text-sm font-bold text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
