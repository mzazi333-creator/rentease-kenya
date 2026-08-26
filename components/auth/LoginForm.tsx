"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, Input } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { loginAction } from "@/app/actions/auth";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, run } = useAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => loginAction({ email, password }));
      }}
    >
      <Field label="Email" required>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field label="Password" required>
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={pending} className="btn-primary w-full">
        Login
      </SubmitButton>
    </form>
  );
}
