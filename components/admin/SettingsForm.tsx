"use client";

import { useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { updateSettingsAction } from "@/app/actions/admin";
import type { SystemSettings } from "@prisma/client";

export default function SettingsForm({ settings }: { settings: SystemSettings }) {
  const [form, setForm] = useState({
    platformName: settings.platformName,
    tagline: settings.tagline ?? "",
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    contactAddress: settings.contactAddress ?? "",
    paymentInstructions: settings.paymentInstructions,
    mpesaPaybill: settings.mpesaPaybill,
    mpesaTill: settings.mpesaTill,
    mpesaAccount: settings.mpesaAccount,
    defaultDueDay: String(settings.defaultDueDay),
    currency: settings.currency,
  });
  const { pending, run } = useAction();

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="card card-pad space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateSettingsAction({ ...form, defaultDueDay: Number(form.defaultDueDay) }));
      }}
    >
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Platform</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform name">
            <Input value={form.platformName} onChange={(e) => set("platformName", e.target.value)} required />
          </Field>
          <Field label="Tagline">
            <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </Field>
        </div>
        <Field label="Contact address">
          <Input value={form.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-lg font-bold text-slate-900">Support</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support phone">
            <Input value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} required />
          </Field>
          <Field label="Support email">
            <Input type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} required />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-lg font-bold text-slate-900">M-Pesa Payment Settings</h2>
        <Field label="Payment instructions">
          <Textarea value={form.paymentInstructions} onChange={(e) => set("paymentInstructions", e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="M-Pesa Paybill number">
            <Input value={form.mpesaPaybill} onChange={(e) => set("mpesaPaybill", e.target.value)} required />
          </Field>
          <Field label="M-Pesa Till number">
            <Input value={form.mpesaTill} onChange={(e) => set("mpesaTill", e.target.value)} required />
          </Field>
          <Field label="Account number">
            <Input value={form.mpesaAccount} onChange={(e) => set("mpesaAccount", e.target.value)} required />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-lg font-bold text-slate-900">Rent & Currency</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Default rent due day (1–28)">
            <Input type="number" min={1} max={28} value={form.defaultDueDay} onChange={(e) => set("defaultDueDay", e.target.value)} required />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} required maxLength={5} />
          </Field>
        </div>
      </section>

      <SubmitButton pending={pending} className="btn-primary">
        Save Settings
      </SubmitButton>
    </form>
  );
}
