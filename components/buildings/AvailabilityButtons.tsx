"use client";

import { useAction } from "@/components/ui/useAction";
import { updateUnitAvailabilityAction } from "@/app/actions/buildings";
import { cn } from "@/lib/utils";

export default function AvailabilityButtons({
  unitId,
  availability,
}: {
  unitId: string;
  availability: string;
}) {
  const { pending, run } = useAction();

  const options = [
    { value: "VACANT", label: "Vacant", active: "bg-green-600 text-white border-green-600" },
    { value: "OCCUPIED", label: "Occupied", active: "bg-blue-600 text-white border-blue-600" },
    { value: "MAINTENANCE", label: "Maint.", active: "bg-purple-600 text-white border-purple-600" },
  ] as const;

  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => updateUnitAvailabilityAction(unitId, o.value), {
              successMessage: `House marked ${o.label}.`,
            })
          }
          className={cn(
            "px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
            availability === o.value ? o.active : "bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
