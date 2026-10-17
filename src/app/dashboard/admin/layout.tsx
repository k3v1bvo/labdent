import DashboardLayout from "@/components/layouts/DashboardLayout";
import { AdminAIChatModal } from "@/components/admin/AdminAIChatModal";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
      <AdminAIChatModal />
    </DashboardLayout>
  );
}
