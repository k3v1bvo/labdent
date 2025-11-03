import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ui/theme-toggle"; // 🌙 Botón Dark/Light

// Configuración de fuentes
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata global del proyecto
export const metadata: Metadata = {
  title: "LabDent | Sistema de Gestión Dental",
  description:
    "Sistema integral para la administración de pedidos y producción del laboratorio dental.",
};

// Layout principal de toda la aplicación
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          min-h-screen
          bg-background
          text-foreground
          transition-colors
          duration-300
        `}
      >
        {/* Contenido dinámico */}
        {children}

        {/* Botón global de modo oscuro / claro */}
        <ThemeToggle />
      </body>
    </html>
  );
}
