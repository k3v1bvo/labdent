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
