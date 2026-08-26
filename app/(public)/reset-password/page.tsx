import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Set New Password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-extrabold text-slate-900">Set a new password</h1>
        <div className="card card-pad mt-6">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  );
}
