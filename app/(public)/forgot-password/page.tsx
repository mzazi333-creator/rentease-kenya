import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-extrabold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Enter your account email and we&apos;ll generate a reset link for you.
        </p>
        <div className="card card-pad mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
