"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { resetPasswordAction } from "@/app/actions/auth";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { pending, run } = useAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => resetPasswordAction({ token, password, confirmPassword }));
      }}
    >
      <Field label="New password" required>
        <Input
          type="password"
          placeholder="Min 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </Field>
      <Field label="Confirm new password" required>
        <Input
          type="password"
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </Field>
      <SubmitButton pending={pending} className="btn-primary w-full">
        Reset password
      </SubmitButton>
    </form>
  );
}
