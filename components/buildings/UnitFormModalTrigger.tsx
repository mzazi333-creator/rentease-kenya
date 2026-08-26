"use client";

import { useState } from "react";
import UnitFormModal from "@/components/buildings/UnitFormModal";

export default function UnitFormModalTrigger({
  buildingId,
  floorId,
  unit,
  className,
}: {
  buildingId: string;
  floorId: string;
  unit?: {
    id: string;
    unitNumber: string;
    monthlyRent: string;
    depositAmount: string | null;
    bedrooms: number;
    bathrooms: number;
    description: string | null;
    availability: string;
    amenities: string[];
  } | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "btn-secondary !px-2.5 !py-1 !text-xs"}
        onClick={() => setOpen(true)}
      >
        {unit ? "Edit" : "+ House"}
      </button>
      {/* key ensures fresh state per unit */}
      <UnitFormModal
        key={unit?.id ?? `new-${floorId}`}
        open={open}
        onClose={() => setOpen(false)}
        buildingId={buildingId}
        floorId={floorId}
        unit={unit ?? null}
      />
    </>
  );
}
