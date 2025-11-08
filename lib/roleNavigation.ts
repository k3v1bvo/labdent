diff --git a/lib/roleNavigation.ts b/lib/roleNavigation.ts
new file mode 100644
index 0000000000000000000000000000000000000000..043346c520cc078018d8bef446c7377f5ffd6e05
--- /dev/null
+++ b/lib/roleNavigation.ts
@@ -0,0 +1,42 @@
+import type { LucideIcon } from "lucide-react";
+import {
+  ClipboardList,
+  FilePlus2,
+  LayoutDashboard,
+  PackageSearch,
+  Stethoscope,
+  Users,
+  Wrench,
+} from "lucide-react";
+
+export type UserRole = "admin" | "secretaria" | "doctor" | "tecnico";
+
+export interface RoleNavItem {
+  label: string;
+  href: string;
+  icon: LucideIcon;
+}
+
+export const roleNavigation: Record<UserRole, RoleNavItem[]> = {
+  admin: [
+    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
+    { label: "Pedidos", href: "/pedidos", icon: PackageSearch },
+    { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
+    { label: "Usuarios", href: "/usuarios", icon: Users },
+    { label: "Doctor", href: "/doctor", icon: Stethoscope },
+    { label: "Secretaria", href: "/secretaria", icon: ClipboardList },
+    { label: "Técnico", href: "/tecnico", icon: Wrench },
+  ],
+  secretaria: [
+    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
+    { label: "Pedidos", href: "/pedidos", icon: PackageSearch },
+    { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
+  ],
+  doctor: [
+    { label: "Mis Pedidos", href: "/doctor", icon: PackageSearch },
+    { label: "Nuevo Pedido", href: "/pedidos/nuevo", icon: FilePlus2 },
+  ],
+  tecnico: [
+    { label: "Pedidos Asignados", href: "/tecnico", icon: Wrench },
+  ],
+};
