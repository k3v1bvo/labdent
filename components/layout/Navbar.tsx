"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function Navbar() {
  const [rol, setRol] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("rol")
          .eq("id", user.user.id)
          .single();
        setRol(profile?.rol || null);
      }
    };
    fetchProfile();
  }, []);

  const links = [
    { href: "/dashboard", label: "Dashboard", roles: ["admin"] },
    { href: "/pedidos", label: "Pedidos", roles: ["admin", "secretaria", "doctor", "tecnico"] },
    { href: "/usuarios", label: "Usuarios", roles: ["admin"] },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="border-b border-border bg-background/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="font-semibold text-lg">
            🦷 LabDent
          </Link>

          {links
            .filter((link) => link.roles.includes(rol || ""))
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  pathname === link.href
                    ? "text-primary underline underline-offset-4"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-sm"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </nav>
  );
}
