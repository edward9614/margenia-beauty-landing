import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Margenia Beauty",
  description:
    "Calculadora gratuita de precios y combos rentables para emprendedoras de belleza.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
