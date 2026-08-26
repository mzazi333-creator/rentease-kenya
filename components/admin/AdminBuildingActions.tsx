"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import {
  approveBuildingAction,
  rejectBuildingAction,
  requestBuildingChangesAction,
  suspendBuildingAction,
} from "@/app/actions/admin";

export default function AdminBuildingActions({ buildingId, status }: { buildingId: string; status: string }) {
  const [modal, setModal] = useState<"reject" | "changes" | null>(null);
  const [note, setNote] = useState("");
  const { pending, run } = useAction();

  const handleRejectOrChanges = () => {
    run(
      () =>
        modal === "reject"
          ? rejectBuildingAction(buildingId, note)
          : requestBuildingChangesAction(buildingId, note),
      { successMessage: modal === "reject" ? "Building rejected." : "Change request sent." }
    );
    setModal(null);
    setNote("");
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING_APPROVAL" && (
        <>
          <button
            className="btn-primary"
            onClick={() => run(() => approveBuildingAction(buildingId), { successMessage: "Building approved and is now live." })}
            disabled={pending}
          >
            Approve
          </button>
          <button className="btn-secondary" onClick={() => setModal("reject")} disabled={pending}>
            Reject
          </button>
          <button className="btn-secondary" onClick={() => setModal("changes")} disabled={pending}>
            Request Changes
          </button>
        </>
      )}
      {status === "APPROVED" && (
        <button
          className="btn-secondary"
          onClick={() => run(() => suspendBuildingAction(buildingId), { successMessage: "Building suspended." })}
          disabled={pending}
        >
          Suspend
        </button>
      )}
      {status === "SUSPENDED" && (
        <button
          className="btn-primary"
          onClick={() => run(() => approveBuildingAction(buildingId), { successMessage: "Building reactivated." })}
          disabled={pending}
        >
          Reactivate
        </button>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "reject" ? "Reject Building" : "Request Changes"}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRejectOrChanges();
          }}
        >
          <Field label={modal === "reject" ? "Rejection reason" : "Changes required"} required>
            <Textarea
              placeholder={
                modal === "reject"
                  ? "e.g. Incomplete contact details; landlord phone is unreachable"
                  : "e.g. Please add unit rents and confirm the number of floors"
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              minLength={3}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <SubmitButton pending={pending} className={modal === "reject" ? "btn-danger" : "btn-primary"}>
              {modal === "reject" ? "Reject building" : "Send request"}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
