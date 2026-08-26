import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // Building / unit statuses
  APPROVED: "bg-green-100 text-green-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-slate-200 text-slate-700",
  // Unit availability
  VACANT: "bg-green-100 text-green-800",
  OCCUPIED: "bg-blue-100 text-blue-800",
  MAINTENANCE: "bg-purple-100 text-purple-800",
  // Payments
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING_CONFIRMATION: "bg-amber-100 text-amber-800",
  // Rent
  PAID: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
  // Application
  APPROVED_APP: "bg-green-100 text-green-800",
  CANCELLED: "bg-slate-200 text-slate-700",
  // Users
  ACTIVE: "bg-green-100 text-green-800",
  // Misc
  MOVED_OUT: "bg-slate-200 text-slate-700",
};

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span className={cn("badge whitespace-nowrap", styles[status] ?? "bg-slate-100 text-slate-700", className)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
