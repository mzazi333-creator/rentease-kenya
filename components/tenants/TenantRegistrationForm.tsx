"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Field, Input, Select, Textarea } from "@/components/ui/FormControls";
import { SubmitButton, useAction } from "@/components/ui/useAction";
import { registerAction } from "@/app/actions/auth";
import { submitApplicationAction } from "@/app/actions/applications";
import { getApprovedBuildingsAction, type PublicUnitOption } from "@/app/actions/public";

export default function TenantRegistrationForm({ isLoggedIn }: { isLoggedIn: boolean }) {
  // Personal details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // House selection
  const [units, setUnits] = useState<PublicUnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { pending, run } = useAction();

  useEffect(() => {
    getApprovedBuildingsAction()
      .then((res) => {
        if (res.ok) setUnits(res.data);
      })
      .finally(() => setLoadingUnits(false));
  }, []);

  const buildings = Array.from(new Map(units.map((u) => [u.buildingId, u])).values());
  const floors = units.filter((u) => u.buildingId === buildingId);
  const floorOptions = Array.from(new Map(floors.map((u) => [u.floorId, u])).values());
  const unitOptions = floors.filter((u) => u.floorId === floorId);

  const selectBuilding = useCallback(
    (bid: string) => {
      setBuildingId(bid);
      setFloorId("");
      setUnitId("");
    },
    []
  );
  const selectFloor = useCallback(
    (fid: string) => {
      setFloorId(fid);
      setUnitId("");
    },
    []
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!buildingId || !floorId || !unitId) {
      setError("Please select a building, floor and house.");
      return;
    }
    const selected = units.find((u) => u.id === unitId);
    if (!selected) {
      setError("Please select a valid house.");
      return;
    }

    if (!isLoggedIn) {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      // Create the tenant account first (auto-logs-in), then apply.
      const reg = await registerAction({ fullName, email, phone, password, confirmPassword, role: "TENANT" });
      if (!reg.ok) {
        setError(reg.message);
        return;
      }
    }

    run(
      () => submitApplicationAction({ buildingId, floorId, unitId, note: note || undefined }),
      { successMessage: "Application submitted! Our team will review it shortly." }
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="card card-pad space-y-4">
        <h2 className="text-lg font-bold text-slate-900">1 · Your details</h2>
        {isLoggedIn ? (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            You&apos;re logged in — your account details will be attached to the application.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input placeholder="e.g. Jane Wanjiku" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
              </Field>
              <Field label="Phone" required hint="e.g. 0712 345 678">
                <Input type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field label="National ID / Passport no." hint="Required for tenancy verification">
                <Input placeholder="e.g. 31245678" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" required>
                <Input type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </Field>
              <Field label="Confirm password" required>
                <Input type="password" placeholder="Repeat password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Emergency contact name">
                <Input placeholder="e.g. Mother's name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              </Field>
              <Field label="Emergency contact phone">
                <Input type="tel" placeholder="0712 345 678" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
              </Field>
            </div>
          </>
        )}
      </section>

      <section className="card card-pad space-y-4">
        <h2 className="text-lg font-bold text-slate-900">2 · Choose your house</h2>
        {loadingUnits ? (
          <p className="text-sm text-slate-500">Loading available houses…</p>
        ) : buildings.length === 0 ? (
          <div className="rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-800">
            <p className="font-semibold">No vacant houses right now.</p>
            <p className="mt-1">
              Approved buildings with available houses will appear here. Check back soon or{" "}
              <Link href="/rentals" className="font-semibold underline">browse rentals</Link>.
            </p>
          </div>
        ) : (
          <>
            <Field label="Building" required>
              <Select value={buildingId} onChange={(e) => selectBuilding(e.target.value)} required>
                <option value="">Select a building</option>
                {buildings.map((b) => (
                  <option key={b.buildingId} value={b.buildingId}>
                    {b.buildingName} — {b.buildingLocation}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Floor" required>
                <Select value={floorId} onChange={(e) => selectFloor(e.target.value)} required disabled={!buildingId}>
                  <option value="">Select a floor</option>
                  {floorOptions.map((f) => (
                    <option key={f.floorId} value={f.floorId}>{f.floorName}</option>
                  ))}
                </Select>
              </Field>
              <Field label="House / unit" required>
                <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} required disabled={!floorId}>
                  <option value="">Select a house</option>
                  {unitOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber} — KSh {Number(u.monthlyRent).toLocaleString()}/mo
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Note to the administrator (optional)">
              <Textarea placeholder="e.g. I would like to move in on the 1st of next month" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </>
        )}
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <SubmitButton pending={pending} className="btn-primary w-full !py-3 !text-base" >
        Submit Application
      </SubmitButton>
      <p className="text-center text-sm text-slate-500">
        Your application will be reviewed by our administrators. Once approved, the house is yours.
      </p>
    </form>
  );
}
