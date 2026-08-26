import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { markAllNotificationsReadAction } from "@/app/actions/admin";
import ActionButton from "@/components/ui/ActionButton";

export const dynamic = "force-dynamic";

export default async function TenantNotificationsPage() {
  const user = await requireRole("TENANT");
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Notices"
        description="Approvals, payment updates and rent reminders."
        actions={
          notifications.some((n) => !n.read) ? (
            <ActionButton
              label="Mark all read"
              action={() => markAllNotificationsReadAction()}
              className="btn-secondary"
            >
              Mark all read
            </ActionButton>
          ) : undefined
        }
      />
      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notices yet" description="Updates will appear here when something happens." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className={`card card-pad ${n.read ? "" : "border-brand-200 bg-brand-50/40"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
                {n.link && (
                  <Link href={n.link} className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">
                    View →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
