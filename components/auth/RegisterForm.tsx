"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { registerAction } from "@/app/actions/auth";

export default function RegisterForm({ defaultRole = "TENANT" }: { defaultRole?: "LANDLORD" | "TENANT" }) {
  const [role, setRole] = useState<"LANDLORD" | "TENANT">(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { pending, run } = useAction();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() =>
          registerAction({ fullName, email, phone, password, confirmPassword, role }),
          { successMessage: "Account created successfully." }
        );
      }}
    >
      <div>
        <p className="label">I am a…</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("TENANT")}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
              role === "TENANT"
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            🏠 Tenant
          </button>
          <button
            type="button"
            onClick={() => setRole("LANDLORD")}
            className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
              role === "LANDLORD"
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            🏢 Landlord
          </button>
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {role === "TENANT" ? "Looking for a house to rent." : "Own buildings and want to list them."}
        </p>
      </div>

      <Field label="Full name" required>
        <Input
          placeholder="e.g. Jane Wanjiku"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
        />
      </Field>
      <Field label="Email" required>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field label="Phone (Safaricom / Airtel)" required hint="e.g. 0712 345 678">
        <Input
          type="tel"
          placeholder="0712 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Password" required>
          <Input
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </Field>
        <Field label="Confirm password" required>
          <Input
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>
      </div>

      <SubmitButton pending={pending} className="btn-primary w-full">
        Create Account
      </SubmitButton>
      <p className="text-center text-xs text-slate-400">
        By registering you agree to our terms. Administrators never create accounts publicly —{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          log in
        </Link>{" "}
        if you&apos;re an admin.
      </p>
    </form>
  );
}
