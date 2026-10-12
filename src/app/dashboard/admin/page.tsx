import { redirect } from "next/navigation";

export default function AdminPage() {
  // 🚀 Redirige automáticamente al overview del administrador
  redirect("/dashboard/admin/overview");
}
