"use server";

import { getSessionUser } from "@/lib/auth";
import {
  createBuilding,
  updateBuilding,
  resubmitBuilding,
  deleteBuilding,
  type CreateBuildingInput,
} from "@/lib/services/building-service";
import {
  addFloor,
  renameFloor,
  deleteFloor,
} from "@/lib/services/floor-service";
import {
  createUnit,
  updateUnit,
  updateUnitAvailability,
  deleteUnit,
  type UpsertUnitInput,
} from "@/lib/services/unit-service";
import { fileToStoredFile, getStorage } from "@/lib/storage";
import type { UnitAvailability } from "@prisma/client";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T; redirectTo?: string }
  | { ok: false; message: string };

function err(e: unknown): ActionResult {
  const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
  return { ok: false, message };
}

/**
 * Create a building from FormData (supports multi-file images).
 * Fields: name, description, location, county, town, exactAddress, contactPhone,
 * contactEmail, propertyType, numberOfFloors, defaultDueDay, floorsJson, images[]
 */
export async function createBuildingAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };

    const floorsRaw = formData.get("floorsJson");
    let floors: CreateBuildingInput["floors"] = [];
    if (typeof floorsRaw === "string" && floorsRaw.trim()) {
      try {
        floors = JSON.parse(floorsRaw) as CreateBuildingInput["floors"];
      } catch {
        return { ok: false, message: "Invalid floor/unit structure data." };
      }
    }

    const images = await saveUploadedImages(formData, "buildings");

    const building = await createBuilding(
      { id: user.id, role: user.role },
      {
        building: {
          name: str(formData, "name"),
          description: str(formData, "description"),
          location: str(formData, "location"),
          county: str(formData, "county"),
          town: str(formData, "town"),
          exactAddress: str(formData, "exactAddress"),
          contactPhone: str(formData, "contactPhone"),
          contactEmail: str(formData, "contactEmail") || undefined,
          propertyType: str(formData, "propertyType"),
          numberOfFloors: Number(formData.get("numberOfFloors") ?? 1),
          defaultDueDay: Number(formData.get("defaultDueDay") ?? 5),
        },
        floors,
        images,
      }
    );

    return {
      ok: true,
      message: "Building submitted successfully and is awaiting admin approval.",
      redirectTo: `/dashboard/landlord/buildings/${building.id}`,
    };
  } catch (e) {
    return err(e);
  }
}

export async function updateBuildingAction(buildingId: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    await updateBuilding(
      { id: user.id, role: user.role },
      buildingId,
      {
        name: str(formData, "name"),
        description: str(formData, "description"),
        location: str(formData, "location"),
        county: str(formData, "county"),
        town: str(formData, "town"),
        exactAddress: str(formData, "exactAddress"),
        contactPhone: str(formData, "contactPhone"),
        contactEmail: str(formData, "contactEmail") || undefined,
        propertyType: str(formData, "propertyType"),
        numberOfFloors: Number(formData.get("numberOfFloors") ?? 1),
        defaultDueDay: Number(formData.get("defaultDueDay") ?? 5),
      }
    );
    return { ok: true, message: "Building updated successfully." };
  } catch (e) {
    return err(e);
  }
}

export async function resubmitBuildingAction(buildingId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    await resubmitBuilding({ id: user.id, role: user.role }, buildingId);
    return { ok: true, message: "Building resubmitted for approval." };
  } catch (e) {
    return err(e);
  }
}

export async function deleteBuildingAction(buildingId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const result = await deleteBuilding({ id: user.id, role: user.role }, buildingId);
    return { ok: true, message: result.message };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Floors ────────────────────────── */

export async function addFloorAction(buildingId: string, name: string, sortOrder?: number): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const floor = await addFloor({ id: user.id, role: user.role }, buildingId, name, sortOrder);
    return { ok: true, message: `Floor "${floor.name}" added.` };
  } catch (e) {
    return err(e);
  }
}

export async function renameFloorAction(floorId: string, name: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    await renameFloor({ id: user.id, role: user.role }, floorId, name);
    return { ok: true, message: "Floor renamed." };
  } catch (e) {
    return err(e);
  }
}

export async function deleteFloorAction(floorId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const result = await deleteFloor({ id: user.id, role: user.role }, floorId);
    return { ok: true, message: result.message };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Units ────────────────────────── */

export async function createUnitAction(buildingId: string, floorId: string, input: UpsertUnitInput, formData?: FormData): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const images = formData ? await saveUploadedImages(formData, "units") : undefined;
    const unit = await createUnit({ id: user.id, role: user.role }, buildingId, floorId, input, images);
    return { ok: true, message: `Unit ${unit.unitNumber} added.` };
  } catch (e) {
    return err(e);
  }
}

export async function updateUnitAction(unitId: string, input: UpsertUnitInput, formData?: FormData): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const images = formData ? await saveUploadedImages(formData, "units") : undefined;
    await updateUnit({ id: user.id, role: user.role }, unitId, input, images);
    return { ok: true, message: "Unit updated successfully." };
  } catch (e) {
    return err(e);
  }
}

export async function updateUnitAvailabilityAction(unitId: string, availability: UnitAvailability): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    await updateUnitAvailability({ id: user.id, role: user.role }, unitId, availability);
    return { ok: true, message: "Unit availability updated." };
  } catch (e) {
    return err(e);
  }
}

export async function deleteUnitAction(unitId: string): Promise<ActionResult> {
  try {
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "You must be logged in." };
    const result = await deleteUnit({ id: user.id, role: user.role }, unitId);
    return { ok: true, message: result.message };
  } catch (e) {
    return err(e);
  }
}

/* ────────────────────────── Helpers ────────────────────────── */

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

async function saveUploadedImages(formData: FormData, folder: string) {
  const entries = Array.from(formData.entries()).filter(
    ([k, v]) => k.startsWith("image") && v instanceof File && (v as File).size > 0
  );
  const storage = getStorage();
  const saved: { url: string; alt?: string; kind?: string }[] = [];
  for (const [, v] of entries) {
    const file = v as File;
    const stored = await storage.save(await fileToStoredFile(file), folder);
    saved.push({ url: stored, alt: file.name, kind: "building" });
  }
  return saved;
}
