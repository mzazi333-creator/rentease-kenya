"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { approveApplicationAction, rejectApplicationAction } from "@/app/actions/admin";

export default function AdminApplicationActions({ applicationId, status }: { applicationId: string; status: string }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, run } = useAction();

  if (status !== "PENDING_APPROVAL") return null;

  return (
    <div className="flex gap-2">
      <button
        className="btn-primary !px-3 !py-1.5 !text-xs"
        onClick={() =>
          run(() => approveApplicationAction(applicationId), {
            successMessage: "Tenant approved and assigned. The unit is now OCCUPIED.",
          })
        }
        disabled={pending}
      >
        Approve
      </button>
      <button className="btn-danger !px-3 !py-1.5 !text-xs" onClick={() => setShowReject(true)} disabled={pending}>
        Reject
      </button>

      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Application">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => rejectApplicationAction(applicationId, reason), {
              successMessage: "Application rejected. The tenant has been notified.",
            });
            setShowReject(false);
            setReason("");
          }}
        >
          <Field label="Rejection reason" required>
            <Textarea
              placeholder="e.g. National ID could not be verified"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
            <SubmitButton pending={pending} className="btn-danger">Reject application</SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
