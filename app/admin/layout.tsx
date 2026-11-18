import { requireStaff } from "@/src/lib/auth/guards";
import { DashboardSidebar } from "@/src/components/dashboard/DashboardSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("/admin");

  return (
    <div className="container-wide py-6 sm:py-8">
      <div className="lg:flex lg:gap-6">
        <DashboardSidebar
          variant="admin"
          user={{ name: user.name, email: user.email, role: user.role }}
        />
        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
