import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import TenantRegistrationForm from "@/components/tenants/TenantRegistrationForm";

export const metadata: Metadata = { title: "Register as Tenant" };
export const dynamic = "force-dynamic";

export default async function RegisterTenantPage() {
  const user = await getSessionUser();

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Register as a Tenant</h1>
          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            Create your tenant profile, pick an approved building and a vacant house, and submit your
            application — it takes less than two minutes.
          </p>
        </div>
        <TenantRegistrationForm isLoggedIn={!!user} />
      </div>
    </div>
  );
}
