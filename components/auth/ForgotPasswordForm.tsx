"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { forgotPasswordAction } from "@/app/actions/auth";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const { pending, run } = useAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const res = await forgotPasswordAction({ email });
          if (res.ok && res.data?.devResetUrl) setResetUrl(res.data.devResetUrl);
          return res;
        });
      }}
    >
      <Field label="Email" required>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <SubmitButton pending={pending} className="btn-primary w-full">
        Send reset link
      </SubmitButton>
      {resetUrl && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Development mode — reset link:</p>
          <a
            href={resetUrl}
            onClick={(e) => {
              e.preventDefault();
              window.location.href = window.location.origin + resetUrl;
            }}
            className="mt-1 block break-all font-mono text-xs text-amber-900 underline"
          >
            {typeof window !== "undefined" ? window.location.origin : ""}
            {resetUrl}
          </a>
          <p className="mt-1 text-xs">
            In production this link is sent by email. (No SMTP configured in this deployment.)
          </p>
        </div>
      )}
    </form>
  );
}
