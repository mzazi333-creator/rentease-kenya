"use client";

import ActionButton from "@/components/ui/ActionButton";
import { resubmitBuildingAction } from "@/app/actions/buildings";

export default function BuildingActions({
  buildingId,
  status,
}: {
  buildingId: string;
  status: string;
}) {
  if (status === "REJECTED") {
    return (
      <ActionButton
        label="Resubmit for approval"
        action={() => resubmitBuildingAction(buildingId)}
        confirm="Resubmit this building for admin approval?"
        confirmLabel="Resubmit"
        className="btn-primary"
      >
        Resubmit for approval
      </ActionButton>
    );
  }
  if (status === "PENDING_APPROVAL") {
    return (
      <span className="badge bg-amber-100 text-amber-800">⏳ Awaiting review</span>
    );
  }
  return null;
}
