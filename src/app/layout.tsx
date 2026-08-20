import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nacional · Cuerpo Técnico",
  description: "Plataforma de gestión para el cuerpo técnico de Nacional",
  // Segunda capa además de robots.ts: algunos rastreadores ignoran robots.txt pero respetan esta
  // etiqueta directo en cada página. Plataforma privada, nunca debe indexarse.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
