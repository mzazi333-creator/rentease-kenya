import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import BuildingForm from "@/components/buildings/BuildingForm";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Register Your Building" };
export const dynamic = "force-dynamic";

export default async function RegisterBuildingPage() {
  const user = await getSessionUser();

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Register Your Building</h1>
          <p className="mx-auto mt-2 max-w-xl text-slate-500">
            List your property, define its floors and houses, set rents — and start receiving verified
            M-Pesa rent payments.
          </p>
        </div>

        {!user ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card card-pad">
              <h2 className="text-lg font-bold text-slate-900">Step 1 — Create a landlord account</h2>
              <p className="mt-1 text-sm text-slate-500">
                You must be logged in as a landlord to register a building.
              </p>
              <div className="mt-5">
                <RegisterForm defaultRole="LANDLORD" />
              </div>
            </div>
            <div className="card card-pad bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Already a landlord?</h2>
              <p className="mt-1 text-sm text-slate-500">Log in and continue to step 2.</p>
              <Link href="/login?next=/register/building" className="btn-primary mt-5 w-full">
                Log in
              </Link>
              <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                <p className="font-semibold">Step 2</p>
                <p className="mt-1">
                  After logging in you&apos;ll define your building structure: floors and houses with any
                  numbering — 001, 101, 61B, A1, Shop 4…
                </p>
              </div>
            </div>
          </div>
        ) : user.role !== "LANDLORD" ? (
          <div className="card card-pad text-center">
            <p className="text-slate-600">
              You&apos;re logged in as a <strong>{user.role}</strong>. Only landlord accounts can register buildings.
            </p>
            <Link href="/dashboard" className="btn-primary mt-4">
              Go to my dashboard
            </Link>
          </div>
        ) : (
          <BuildingForm />
        )}
      </div>
    </div>
  );
}
