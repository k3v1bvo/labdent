import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LabDent | Laboratorio Dental",
  description: "Sistema integral de gestión de laboratorio dental",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {/* 🧭 Barra de navegación superior */}
        <Navbar />

        {/* 🧩 Contenido principal */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-6">
          {children}
        </main>

        {/* 🔹 Footer opcional (puedes eliminarlo si no lo necesitas) */}
        <footer className="text-center text-sm text-gray-500 py-4 border-t border-border">
          © {new Date().getFullYear()} LabDent. Todos los derechos reservados.
        </footer>
      </body>
    </html>
  );
}
