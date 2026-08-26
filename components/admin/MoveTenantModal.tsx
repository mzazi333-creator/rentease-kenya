"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Select } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { moveTenantToUnitAction } from "@/app/actions/admin";
import type { Unit } from "@prisma/client";

export default function MoveTenantModal({
  tenancyId,
  buildingId,
  options,
  disabled,
}: {
  tenancyId: string;
  buildingId: string;
  options: Pick<Unit, "id" | "unitNumber" | "monthlyRent">[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const { pending, run } = useAction();

  return (
    <>
      <button type="button" className="btn-primary" disabled={disabled} onClick={() => setOpen(true)}>
        Move to another house
      </button>
      {disabled && !open && (
        <p className="mt-1 text-xs text-slate-500">No vacant houses in this building to move to.</p>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Move Tenant to Another House">
        <p className="text-sm text-slate-600">
          The current tenancy will end (history preserved) and a new one will be created on the target
          house, which must be vacant.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!unitId) return;
            run(() => moveTenantToUnitAction(tenancyId, unitId, "Moved by administrator"), {
              successMessage: "Tenant moved to the new house. History preserved.",
            });
            setOpen(false);
          }}
        >
          <Field label="Target house (vacant only)" required>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} required>
              <option value="">Select a vacant house</option>
              {options.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unitNumber} — KSh {Number(u.monthlyRent).toLocaleString()}/mo
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <SubmitButton pending={pending} className="btn-primary">Move tenant</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
