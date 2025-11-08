"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { roleNavigation, type UserRole } from "@/lib/roleNavigation";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const rol = user?.user_metadata?.rol as UserRole | undefined;

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user || null);
    };
    getUser();
  }, []);

  // 🔹 Enlaces de navegación según el rol del usuario
  const links = rol ? roleNavigation[rol] ?? [] : [];

  const linkClassName =
    "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-foreground hover:text-foreground/80"
          >
            🦷 LabDent
          </Link>

          {links.length > 0 && (
            <div className="hidden md:flex items-center gap-4">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className={linkClassName}>
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {user && (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-foreground">
              {user.user_metadata?.nombre || "Usuario"}
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {user.user_metadata?.rol || "rol"}
            </span>
          </div>
        )}
      </div>

      {links.length > 0 && (
        <div className="md:hidden border-t border-border bg-background/95">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3 px-4 sm:px-6 py-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClassName}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
