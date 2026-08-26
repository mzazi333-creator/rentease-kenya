"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { confirmPaymentAction, rejectPaymentAction } from "@/app/actions/applications";

export default function AdminPaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useAction();

  if (status !== "PENDING_CONFIRMATION") return null;

  return (
    <div className="flex gap-2">
      <button
        className="btn-primary !px-3 !py-1.5 !text-xs"
        onClick={() =>
          run(() => confirmPaymentAction(paymentId), {
            successMessage: "Payment confirmed. The tenant's rent is now PAID.",
          })
        }
        disabled={pending}
      >
        Confirm Payment
      </button>
      <button className="btn-danger !px-3 !py-1.5 !text-xs" onClick={() => setShowReject(true)} disabled={pending}>
        Reject Payment
      </button>

      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Payment">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => rejectPaymentAction(paymentId, reason), {
              successMessage: "Payment rejected. The tenant has been notified.",
            });
            setShowReject(false);
            setReason("");
          }}
        >
          <Field label="Rejection reason (visible to the tenant)" required>
            <Textarea
              placeholder="e.g. Transaction code could not be verified with M-Pesa"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
            <SubmitButton pending={pending} className="btn-danger">Reject payment</SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
