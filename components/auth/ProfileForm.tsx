"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { updateProfileAction, changePasswordAction } from "@/app/actions/auth";
import type { User } from "@prisma/client";

export default function ProfileForm({
  user,
  tenantProfile,
}: {
  user: Pick<User, "fullName" | "email" | "phone" | "nationalId">;
  tenantProfile?: { emergencyName: string | null; emergencyContact: string | null; occupation: string | null } | null;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [nationalId, setNationalId] = useState(user.nationalId ?? "");
  const [emergencyName, setEmergencyName] = useState(tenantProfile?.emergencyName ?? "");
  const [emergencyContact, setEmergencyContact] = useState(tenantProfile?.emergencyContact ?? "");
  const [occupation, setOccupation] = useState(tenantProfile?.occupation ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const profile = useAction();
  const pwd = useAction();

  return (
    <div className="space-y-8">
      <section className="card card-pad">
        <h2 className="text-lg font-bold text-slate-900">Profile information</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            profile.run(() =>
              updateProfileAction({
                fullName,
                phone,
                nationalId: nationalId || undefined,
                emergencyName: emergencyName || undefined,
                emergencyContact: emergencyContact || undefined,
                occupation: occupation || undefined,
              })
            );
          }}
        >
          <Field label="Email" hint="Email cannot be changed">
            <Input value={user.email} disabled />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
            </Field>
            <Field label="Phone" required>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </Field>
          </div>
          <Field label="National ID / Passport no.">
            <Input value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
          </Field>
          {tenantProfile && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Emergency contact name">
                <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              </Field>
              <Field label="Emergency contact phone">
                <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
              </Field>
              <Field label="Occupation">
                <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
              </Field>
            </div>
          )}
          <SubmitButton pending={profile.pending} className="btn-primary">
            Save profile
          </SubmitButton>
        </form>
      </section>

      <section className="card card-pad">
        <h2 className="text-lg font-bold text-slate-900">Change password</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            pwd.run(() =>
              changePasswordAction({ currentPassword, newPassword, confirmPassword })
            );
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password" required>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </Field>
            <Field label="New password" required>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label="Confirm new password" required>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </Field>
          </div>
          <SubmitButton pending={pwd.pending} className="btn-primary">
            Update password
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
