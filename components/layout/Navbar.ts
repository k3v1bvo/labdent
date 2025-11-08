diff --git a/components/layout/Navbar.ts b/components/layout/Navbar.ts
index 611b3d009ce62e1cfa9da85ff8b2bf9d300415d8..dc4f46d6e6d551db9c1a9ef193b2ab893b053bb4 100644
--- a/components/layout/Navbar.ts
+++ b/components/layout/Navbar.ts
@@ -1,61 +1,86 @@
 "use client";
 
 import Link from "next/link";
 import { useRouter } from "next/navigation";
 import { useEffect, useState } from "react";
 import { supabase } from "@/lib/supabaseClient";
 import { Button } from "@/components/ui/button";
 import { LogOut } from "lucide-react";
 
 export function Navbar() {
   const router = useRouter();
   const [user, setUser] = useState<any>(null);
+  const rol = user?.user_metadata?.rol as
+    | "admin"
+    | "secretaria"
+    | "doctor"
+    | "tecnico"
+    | undefined;
+
+  const linksPorRol: Record<
+    NonNullable<typeof rol>,
+    { href: string; label: string }[]
+  > = {
+    admin: [
+      { href: "/dashboard", label: "Dashboard" },
+      { href: "/pedidos", label: "Pedidos" },
+      { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
+      { href: "/usuarios", label: "Usuarios" },
+      { href: "/doctor", label: "Doctor" },
+      { href: "/secretaria", label: "Secretaria" },
+      { href: "/tecnico", label: "Técnico" },
+    ],
+    secretaria: [
+      { href: "/dashboard", label: "Dashboard" },
+      { href: "/pedidos", label: "Pedidos" },
+      { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
+    ],
+    doctor: [
+      { href: "/doctor", label: "Mis Pedidos" },
+      { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
+    ],
+    tecnico: [
+      { href: "/tecnico", label: "Pedidos Asignados" },
+    ],
+  };
 
   useEffect(() => {
     const getUser = async () => {
       const { data } = await supabase.auth.getUser();
       setUser(data.user || null);
     };
     getUser();
   }, []);
 
   const handleLogout = async () => {
     await supabase.auth.signOut();
     router.push("/auth/login");
   };
 
-  // 🔹 Enlaces de navegación (visibles para todos por ahora)
-  const links = [
-    { href: "/dashboard", label: "Dashboard" },
-    { href: "/pedidos", label: "Pedidos" },
-    { href: "/pedidos/nuevo", label: "Nuevo Pedido" },
-    { href: "/usuarios", label: "Usuarios" },
-    { href: "/doctor", label: "Doctor" },
-    { href: "/secretaria", label: "Secretaria" },
-    { href: "/tecnico", label: "Técnico" },
-  ];
+  // 🔹 Enlaces de navegación según el rol del usuario
+  const links = rol ? linksPorRol[rol] ?? [] : [];
 
   return (
     <nav className="w-full bg-zinc-900 text-white flex items-center justify-between px-6 py-3 shadow-md border-b border-zinc-800">
       {/* Izquierda */}
       <div className="flex items-center gap-6">
         <Link href="/" className="font-bold text-lg hover:text-blue-400 transition">
           🦷 LabDent
         </Link>
 
         {/* 🔥 Aquí aparecen los botones */}
         <div className="flex items-center gap-4">
           {links.map((link) => (
             <Link
               key={link.href}
               href={link.href}
               className="text-sm font-medium hover:text-blue-400 transition-colors"
             >
               {link.label}
             </Link>
           ))}
         </div>
       </div>
 
       {/* Derecha */}
       <div className="flex items-center gap-4">
