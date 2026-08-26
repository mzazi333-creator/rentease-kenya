"use client";

import { useState } from "react";
import { Input } from "@/components/ui/FormControls";
import { useAction } from "@/components/ui/useAction";
import { addFloorAction, renameFloorAction } from "@/app/actions/buildings";

export default function FloorManager({ buildingId }: { buildingId: string }) {
  const [name, setName] = useState("");
  const { pending, run } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    run(() => addFloorAction(buildingId, name.trim()), { successMessage: `Floor "${name.trim()}" added.` });
    setName("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        placeholder="New floor name (e.g. Roof Top)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="!w-44 !py-1.5 !text-xs sm:!w-56"
        aria-label="New floor name"
      />
      <button type="submit" disabled={pending || !name.trim()} className="btn-primary !px-3 !py-1.5 !text-xs">
        + Add Floor
      </button>
    </form>
  );
}

FloorManager.RenameFloor = function RenameFloor({
  floorId,
  currentName,
}: {
  floorId: string;
  currentName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const { pending, run } = useAction();

  if (!editing) {
    return (
      <button
        type="button"
        className="btn-ghost !px-2.5 !py-1 !text-xs"
        onClick={() => setEditing(true)}
      >
        Rename
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        run(() => renameFloorAction(floorId, name.trim()), { successMessage: "Floor renamed." });
        setEditing(false);
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} className="!w-36 !py-1 !text-xs" aria-label="Rename floor" />
      <button type="submit" disabled={pending} className="btn-primary !px-2.5 !py-1 !text-xs">Save</button>
      <button type="button" className="btn-ghost !px-2.5 !py-1 !text-xs" onClick={() => setEditing(false)}>✕</button>
    </form>
  );
};
