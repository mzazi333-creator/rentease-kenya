import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { dashboardForRole } from "@/lib/utils";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(dashboardForRole(user.role));

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white">
            RE
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Log in to your RentEase account</p>
        </div>
        <div className="card card-pad">
          <LoginForm />
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">
          New to RentEase?{" "}
          <Link href="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
