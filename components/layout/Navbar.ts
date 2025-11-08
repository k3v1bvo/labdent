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
diff --git a/components/layout/Sidebar.tsx b/components/layout/Sidebar.tsx
index 0f71d3537d52e29ea5d6cd21f7c1a3d37bc814be..6677b205f76af32b6463017a4bcff56586a48d3b 100644
--- a/components/layout/Sidebar.tsx
+++ b/components/layout/Sidebar.tsx
@@ -1,66 +1,72 @@
 "use client";
 
 import { useEffect, useState } from "react";
 import { usePathname, useRouter } from "next/navigation";
 import Link from "next/link";
 import { supabase } from "@/lib/supabaseClient";
+import type { LucideIcon } from "lucide-react";
 import {
+  ClipboardList,
+  FilePlus2,
   LayoutDashboard,
+  LogOut,
   PackageSearch,
-  FilePlus2,
+  Stethoscope,
   Users,
-  Workflow,
-  LogOut,
+  Wrench,
 } from "lucide-react";
 
 type UserRole = "admin" | "secretaria" | "doctor" | "tecnico";
 
 interface NavItem {
   label: string;
   href: string;
-  icon: React.ComponentType<{ className?: string }>;
+  icon: LucideIcon;
 }
 
 const menuByRole: Record<UserRole, NavItem[]> = {
   admin: [
     { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
     { label: "Pedidos", href: "/pedidos", icon: PackageSearch },
     { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
-    { label: "Usuarios", href: "/admin/usuarios", icon: Users }, // crea luego si quieres
-    { label: "Estaciones", href: "/admin/estaciones", icon: Workflow }, // idem
+    { label: "Usuarios", href: "/usuarios", icon: Users },
+    { label: "Doctor", href: "/doctor", icon: Stethoscope },
+    { label: "Secretaria", href: "/secretaria", icon: ClipboardList },
+    { label: "Técnico", href: "/tecnico", icon: Wrench },
   ],
   secretaria: [
+    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
     { label: "Pedidos", href: "/pedidos", icon: PackageSearch },
     { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
   ],
   doctor: [
+    { label: "Mis Pedidos", href: "/doctor", icon: PackageSearch },
     { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
-    { label: "Mis Pedidos", href: "/pedidos", icon: PackageSearch },
   ],
   tecnico: [
-    { label: "Pedidos en producción", href: "/pedidos", icon: PackageSearch },
+    { label: "Pedidos Asignados", href: "/tecnico", icon: Wrench },
   ],
 };
 
 export function Sidebar() {
   const [role, setRole] = useState<UserRole | null>(null);
   const [name, setName] = useState<string>("");
   const [loading, setLoading] = useState(true);
 
   const pathname = usePathname();
   const router = useRouter();
 
   useEffect(() => {
     const load = async () => {
       const {
         data: { user },
       } = await supabase.auth.getUser();
 
       if (!user) {
         setLoading(false);
         return;
       }
 
       // Intentar leer perfil
       const { data: profile } = await supabase
         .from("profiles")
