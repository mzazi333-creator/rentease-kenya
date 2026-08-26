import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";

export const dynamic = "force-dynamic";

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊", match: (p) => p === "/admin" },
  { href: "/admin/buildings", label: "Buildings", icon: "🏢" },
  { href: "/admin/tenants", label: "Tenant Applications", icon: "📋" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/payments", label: "Payments", icon: "💰" },
  { href: "/admin/overdue", label: "Overdue Rent", icon: "⚠️" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "🧾" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <DashboardShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      role="ADMIN"
      nav={adminNav}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
}
