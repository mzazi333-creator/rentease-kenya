"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { createBuildingAction } from "@/app/actions/buildings";
import { counties, propertyTypes, amenitiesList } from "@/lib/utils";

interface UnitDraft {
  unitNumber: string;
  monthlyRent: string;
  depositAmount: string;
  bedrooms: string;
  bathrooms: string;
  availability: "VACANT" | "OCCUPIED" | "PENDING_APPROVAL" | "MAINTENANCE";
}

interface FloorDraft {
  id: number;
  name: string;
  units: UnitDraft[];
}

let floorIdCounter = 0;

const emptyUnit = (): UnitDraft => ({
  unitNumber: "",
  monthlyRent: "",
  depositAmount: "",
  bedrooms: "1",
  bathrooms: "1",
  availability: "VACANT",
});

export default function BuildingForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [county, setCounty] = useState("");
  const [town, setTown] = useState("");
  const [exactAddress, setExactAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [propertyType, setPropertyType] = useState("Apartment");
  const [numberOfFloors, setNumberOfFloors] = useState("1");
  const [defaultDueDay, setDefaultDueDay] = useState("5");
  const [floors, setFloors] = useState<FloorDraft[]>([
    { id: ++floorIdCounter, name: "Ground Floor", units: [emptyUnit()] },
  ]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { pending, run } = useAction();

  function addFloor() {
    setFloors((prev) => [...prev, { id: ++floorIdCounter, name: `Floor ${prev.length}`, units: [emptyUnit()] }]);
  }
  function renameFloor(id: number, name: string) {
    setFloors((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }
  function removeFloor(id: number) {
    setFloors((prev) => prev.filter((f) => f.id !== id));
  }
  function addUnit(floorId: number) {
    setFloors((prev) => prev.map((f) => (f.id === floorId ? { ...f, units: [...f.units, emptyUnit()] } : f)));
  }
  function removeUnit(floorId: number, unitIndex: number) {
    setFloors((prev) =>
      prev.map((f) => (f.id === floorId ? { ...f, units: f.units.filter((_, i) => i !== unitIndex) } : f))
    );
  }
  function updateUnit(floorId: number, unitIndex: number, patch: Partial<UnitDraft>) {
    setFloors((prev) =>
      prev.map((f) =>
        f.id === floorId ? { ...f, units: f.units.map((u, i) => (i === unitIndex ? { ...u, ...patch } : u)) } : f
      )
    );
  }

  function toggleAmenity(a: string) {
    setSelectedAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const cleanFloors = floors
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        units: f.units
          .filter((u) => u.unitNumber.trim() && Number(u.monthlyRent) > 0)
          .map((u) => ({
            unitNumber: u.unitNumber.trim(),
            monthlyRent: Number(u.monthlyRent),
            depositAmount: u.depositAmount ? Number(u.depositAmount) : null,
            bedrooms: Number(u.bedrooms) || 1,
            bathrooms: Number(u.bathrooms) || 1,
            availability: u.availability,
          })),
      }));

    if (cleanFloors.length === 0) {
      setFormError("Please define at least one floor with a house.");
      return;
    }
    const totalUnits = cleanFloors.reduce((s, f) => s + f.units.length, 0);
    if (totalUnits === 0) {
      setFormError("Add at least one house with a unit number and rent.");
      return;
    }
    setFormError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    fd.set("location", location);
    fd.set("county", county);
    fd.set("town", town);
    fd.set("exactAddress", exactAddress);
    fd.set("contactPhone", contactPhone);
    fd.set("contactEmail", contactEmail);
    fd.set("propertyType", propertyType);
    fd.set("numberOfFloors", numberOfFloors);
    fd.set("defaultDueDay", defaultDueDay);
    fd.set("floorsJson", JSON.stringify(cleanFloors));
    if (imageFiles) {
      Array.from(imageFiles).forEach((file, i) => fd.append(`image${i}`, file));
    }

    run(() => createBuildingAction(fd));
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {/* Step 1: property info */}
      <section className="card card-pad space-y-4">
        <h2 className="text-lg font-bold text-slate-900">1 · Property information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Building / apartment name" required>
            <Input placeholder="e.g. Sunrise Apartments" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Property type" required>
            <Select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              {propertyTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description" required>
          <Textarea
            placeholder="Describe the property: security, parking, water, neighbourhood, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Location / area" required hint="e.g. Gataka, Ongata Rongai">
            <Input placeholder="e.g. Gataka" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </Field>
          <Field label="County" required>
            <Select value={county} onChange={(e) => setCounty(e.target.value)} required>
              <option value="">Select county</option>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Town / area" required>
            <Input placeholder="e.g. Ongata Rongai" value={town} onChange={(e) => setTown(e.target.value)} required />
          </Field>
        </div>
        <Field label="Exact address / landmark" required>
          <Input placeholder="e.g. Gataka Road, near Total Petrol Station, plot 45" value={exactAddress} onChange={(e) => setExactAddress(e.target.value)} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact phone" required>
            <Input type="tel" placeholder="0712 345 678" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
          </Field>
          <Field label="Contact email">
            <Input type="email" placeholder="optional" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </Field>
          <Field label="Rent due day (of month)" required hint="Default is the 5th">
            <Input
              type="number"
              min={1}
              max={28}
              value={defaultDueDay}
              onChange={(e) => setDefaultDueDay(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Number of floors" required>
            <Input
              type="number"
              min={1}
              max={100}
              value={numberOfFloors}
              onChange={(e) => setNumberOfFloors(e.target.value)}
              required
            />
          </Field>
          <Field label="Property photos" hint="JPG/PNG/WEBP, max 5 MB each">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => setImageFiles(e.target.files)}
            />
          </Field>
        </div>
        <Field label="Building amenities">
          <div className="flex flex-wrap gap-2">
            {amenitiesList.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAmenity(a)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedAmenities.includes(a)
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </Field>
      </section>

      {/* Step 2: structure */}
      <section className="card card-pad space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">2 · Building structure (floors & houses)</h2>
          <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={addFloor}>
            + Add Floor
          </button>
        </div>
        <p className="text-sm text-slate-500">
          Use any floor names (Ground Floor, B1, Basement…) and any house numbers (001, 101, 61B, A1, Shop 4…).
        </p>

        {floors.map((floor, fi) => (
          <div key={floor.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Field label={`Floor ${fi + 1} name`} required>
                <Input value={floor.name} onChange={(e) => renameFloor(floor.id, e.target.value)} className="!w-56" required />
              </Field>
              <button type="button" className="btn-ghost !py-1.5 !text-xs text-red-600" onClick={() => removeFloor(floor.id)}>
                Remove floor
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {floor.units.map((unit, ui) => (
                <div key={ui} className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-4 lg:grid-cols-7">
                  <Field label="House #">
                    <Input placeholder="001" value={unit.unitNumber} onChange={(e) => updateUnit(floor.id, ui, { unitNumber: e.target.value })} />
                  </Field>
                  <Field label="Rent (KSh)">
                    <Input type="number" min={0} placeholder="10000" value={unit.monthlyRent} onChange={(e) => updateUnit(floor.id, ui, { monthlyRent: e.target.value })} />
                  </Field>
                  <Field label="Deposit (KSh)">
                    <Input type="number" min={0} placeholder="5000" value={unit.depositAmount} onChange={(e) => updateUnit(floor.id, ui, { depositAmount: e.target.value })} />
                  </Field>
                  <Field label="Bedrooms">
                    <Select value={unit.bedrooms} onChange={(e) => updateUnit(floor.id, ui, { bedrooms: e.target.value })}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Bathrooms">
                    <Select value={unit.bathrooms} onChange={(e) => updateUnit(floor.id, ui, { bathrooms: e.target.value })}>
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Status">
                    <Select value={unit.availability} onChange={(e) => updateUnit(floor.id, ui, { availability: e.target.value as UnitDraft["availability"] })}>
                      <option value="VACANT">Vacant</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <button type="button" className="btn-ghost !py-1.5 !text-xs text-red-600" onClick={() => removeUnit(floor.id, ui)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary mt-3 !py-1.5 !text-xs" onClick={() => addUnit(floor.id)}>
              + Add House
            </button>
          </div>
        ))}
      </section>

      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}
      <SubmitButton pending={pending} className="btn-primary w-full !py-3 !text-base">
        Submit Building for Approval
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Your building will be reviewed by our administrators before it appears on the platform.
      </p>
    </form>
  );
}
