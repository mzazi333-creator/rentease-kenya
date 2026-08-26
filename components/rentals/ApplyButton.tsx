"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { submitApplicationAction } from "@/app/actions/applications";

export default function ApplyButton({
  unitId,
  floorId,
  buildingId,
  unitNumber,
  rent,
  isLoggedIn,
  role,
}: {
  unitId: string;
  floorId: string;
  buildingId: string;
  unitNumber: string;
  rent: string;
  isLoggedIn: boolean;
  role?: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { pending, run } = useAction();

  if (!isLoggedIn) {
    return (
      <Link href={`/login?next=/rentals/${buildingId}`} className="btn-primary w-full">
        Login to Apply for This House
      </Link>
    );
  }

  if (role === "LANDLORD" || role === "ADMIN") {
    return (
      <p className="rounded-lg bg-slate-100 px-4 py-2.5 text-center text-sm text-slate-600">
        Logged in as {role === "LANDLORD" ? "a landlord" : "an administrator"} — apply with a tenant account.
      </p>
    );
  }

  return (
    <>
      <button className="btn-primary w-full" onClick={() => setOpen(true)}>
        Apply for This House
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Apply for House ${unitNumber}`}>
        <div className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm">
          <p className="font-semibold text-brand-800">House {unitNumber}</p>
          <p className="text-brand-700">Monthly rent: KSh {Number(rent).toLocaleString()}</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                submitApplicationAction({ buildingId, floorId, unitId, note: note || undefined }),
              { successMessage: "Application submitted successfully and is awaiting admin approval." }
            );
          }}
        >
          <Field label="Note to the administrator (optional)" hint="e.g. when you would like to move in">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional message"
              maxLength={1000}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <SubmitButton pending={pending} className="btn-primary">
              Submit Application
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
