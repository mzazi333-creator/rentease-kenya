"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { createUnitAction, updateUnitAction } from "@/app/actions/buildings";
import { amenitiesList } from "@/lib/utils";

export interface UnitFormValue {
  unitNumber: string;
  monthlyRent: string;
  depositAmount: string;
  bedrooms: string;
  bathrooms: string;
  description: string;
  availability: string;
  amenities: string[];
}

export default function UnitFormModal({
  open,
  onClose,
  buildingId,
  floorId,
  unit,
}: {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  floorId: string;
  unit?: { id: string; unitNumber: string; monthlyRent: string; depositAmount: string | null; bedrooms: number; bathrooms: number; description: string | null; availability: string; amenities: string[] } | null;
}) {
  const [form, setForm] = useState<UnitFormValue>({
    unitNumber: unit?.unitNumber ?? "",
    monthlyRent: unit?.monthlyRent ?? "",
    depositAmount: unit?.depositAmount ?? "",
    bedrooms: String(unit?.bedrooms ?? 1),
    bathrooms: String(unit?.bathrooms ?? 1),
    description: unit?.description ?? "",
    availability: unit?.availability ?? "VACANT",
    amenities: unit?.amenities ?? [],
  });
  const [images, setImages] = useState<FileList | null>(null);
  const { pending, run } = useAction();

  function toggleAmenity(a: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      unitNumber: form.unitNumber,
      monthlyRent: Number(form.monthlyRent),
      depositAmount: form.depositAmount ? Number(form.depositAmount) : 0,
      bedrooms: Number(form.bedrooms) || 1,
      bathrooms: Number(form.bathrooms) || 1,
      description: form.description || undefined,
      availability: form.availability as "VACANT" | "OCCUPIED" | "PENDING_APPROVAL" | "MAINTENANCE",
      amenities: form.amenities,
    };
    if (unit) {
      const fd = new FormData();
      if (images) Array.from(images).forEach((file, i) => fd.append(`image${i}`, file));
      run(() => updateUnitAction(unit.id, input, images && images.length ? fd : undefined), {
        successMessage: "Unit updated successfully.",
      });
    } else {
      const fd = new FormData();
      if (images) Array.from(images).forEach((file, i) => fd.append(`image${i}`, file));
      run(() => createUnitAction(buildingId, floorId, input, images && images.length ? fd : undefined), {
        successMessage: `Unit ${form.unitNumber} added.`,
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={unit ? `Edit House ${unit.unitNumber}` : "Add House"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit / house number" required>
            <Input
              placeholder="001, 61B, A1, Shop 4…"
              value={form.unitNumber}
              onChange={(e) => setForm({ ...form, unitNumber: e.target.value })}
              required
            />
          </Field>
          <Field label="Status">
            <Select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
              <option value="VACANT">Vacant</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="PENDING_APPROVAL">Pending approval</option>
              <option value="MAINTENANCE">Maintenance</option>
            </Select>
          </Field>
          <Field label="Monthly rent (KSh)" required>
            <Input
              type="number"
              min={1}
              placeholder="10000"
              value={form.monthlyRent}
              onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
              required
            />
          </Field>
          <Field label="Deposit (KSh)">
            <Input
              type="number"
              min={0}
              placeholder="5000"
              value={form.depositAmount}
              onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
            />
          </Field>
          <Field label="Bedrooms">
            <Select value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </Field>
          <Field label="Bathrooms">
            <Select value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            placeholder="e.g. Self-contained with kitchen, tiled floors, water heater…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Amenities">
          <div className="flex flex-wrap gap-1.5">
            {amenitiesList.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  form.amenities.includes(a)
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 text-slate-600"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>
        <Field label="House photos" hint="JPG/PNG/WEBP, max 5 MB each">
          <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setImages(e.target.files)} />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <SubmitButton pending={pending} className="btn-primary">{unit ? "Save changes" : "Add house"}</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
