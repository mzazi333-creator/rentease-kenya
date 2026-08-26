import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.role === "ADMIN" ? "/admin" : user.role === "LANDLORD" ? "/dashboard/landlord" : "/dashboard/tenant");
}
