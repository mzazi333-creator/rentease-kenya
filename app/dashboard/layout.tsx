import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardShell, type NavItem } from "@/components/layout/DashboardShell";
import { dashboardForRole } from "@/lib/utils";

export const dynamic = "force-dynamic";

const tenantNav: NavItem[] = [
  { href: "/dashboard/tenant", label: "Overview", icon: "📊", match: (p) => p === "/dashboard/tenant" },
  { href: "/dashboard/tenant/my-house", label: "My House", icon: "🏠" },
  { href: "/dashboard/tenant/rent", label: "Rent", icon: "💰" },
  { href: "/dashboard/tenant/payments", label: "Payments & History", icon: "📱" },
  { href: "/dashboard/tenant/applications", label: "My Applications", icon: "📋" },
  { href: "/dashboard/tenant/notifications", label: "Notices", icon: "🔔" },
  { href: "/dashboard/tenant/profile", label: "Profile", icon: "👤" },
];

const landlordNav: NavItem[] = [
  { href: "/dashboard/landlord", label: "Overview", icon: "📊", match: (p) => p === "/dashboard/landlord" },
  { href: "/dashboard/landlord/buildings", label: "My Buildings", icon: "🏢" },
  { href: "/dashboard/landlord/tenants", label: "Tenants", icon: "👥" },
  { href: "/dashboard/landlord/payments", label: "Payments", icon: "💰" },
  { href: "/dashboard/landlord/notifications", label: "Notifications", icon: "🔔" },
  { href: "/dashboard/landlord/profile", label: "Profile", icon: "👤" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");

  const [notifications] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const nav = user.role === "LANDLORD" ? landlordNav : tenantNav;

  return (
    <DashboardShell
      user={{ fullName: user.fullName, email: user.email, role: user.role }}
      role={user.role}
      nav={nav}
      notifications={notifications}
      footer={
        <p className="mt-2 text-[11px] text-slate-400">
          Logged in as {user.role === "LANDLORD" ? "landlord" : "tenant"} ·{" "}
          <a href={dashboardForRole(user.role)} className="underline">
            open dashboard
          </a>
        </p>
      }
    >
      {children}
    </DashboardShell>
  );
}
