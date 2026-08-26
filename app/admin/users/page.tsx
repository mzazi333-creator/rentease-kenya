import Link from "next/link";
import { listUsersAdmin } from "@/lib/services/admin-service";
import { requireRole } from "@/lib/guards";
import { PageHeader, EmptyState } from "@/components/ui/Layout";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import { setUserStatusAction } from "@/app/actions/admin";
import { roleLabels, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const roleTabs = [
  { value: "", label: "All users" },
  { value: "LANDLORD", label: "Landlords" },
  { value: "TENANT", label: "Tenants" },
  { value: "ADMIN", label: "Admins" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const role = sp.role ?? "";
  const q = sp.q ?? "";

  const users = await listUsersAdmin({
    role: role || undefined,
    q: q || undefined,
  });

  return (
    <div>
      <PageHeader title="Users" description="All accounts on the platform." />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {roleTabs.map((t) => (
          <Link
            key={t.value}
            href={t.value ? `/admin/users?role=${t.value}` : "/admin/users"}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              role === t.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="mb-5 flex gap-2" action="/admin/users" method="GET">
        <input name="role" type="hidden" value={role} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email or phone…"
          className="input max-w-md"
          aria-label="Search users"
        />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {users.length === 0 ? (
        <EmptyState icon="👥" title="No users found" />
      ) : (
        <div className="table-wrap">
          <table className="table-base">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <p className="font-semibold">{u.fullName}</p>
                    <p className="text-xs text-slate-500">{u.email} · {u.phone}</p>
                  </td>
                  <td>
                    <span className="badge bg-slate-100 text-slate-700">{roleLabels[u.role]}</span>
                  </td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="text-slate-500">{formatDate(u.createdAt)}</td>
                  <td>
                    {u.role !== "ADMIN" && (
                      <ActionButton
                        label={u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                        action={() => setUserStatusAction(u.id, u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")}
                        confirm={
                          u.status === "SUSPENDED"
                            ? `Reactivate ${u.fullName}'s account?`
                            : `Suspend ${u.fullName}'s account? They will be locked out immediately.`
                        }
                        confirmLabel={u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                        danger={u.status !== "SUSPENDED"}
                        className={
                          u.status === "SUSPENDED"
                            ? "btn-primary !px-3 !py-1 !text-xs"
                            : "btn-ghost !px-3 !py-1 !text-xs text-red-600"
                        }
                      >
                        {u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
