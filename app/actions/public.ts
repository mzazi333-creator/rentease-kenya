"use server";

import { prisma } from "@/lib/db";

export interface PublicUnitOption {
  id: string;
  unitNumber: string;
  monthlyRent: string;
  floorId: string;
  floorName: string;
  buildingId: string;
  buildingName: string;
  buildingLocation: string;
}

/** Approved buildings with their vacant units — used by the tenant application picker. */
export async function getApprovedBuildingsAction(): Promise<{
  ok: boolean;
  message: string;
  data: PublicUnitOption[];
}> {
  const buildings = await prisma.building.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    include: {
      floors: { orderBy: { sortOrder: "asc" }, include: { units: true } },
    },
  });

  const units: PublicUnitOption[] = [];
  for (const b of buildings) {
    for (const f of b.floors) {
      for (const u of f.units) {
        if (u.availability === "VACANT") {
          units.push({
            id: u.id,
            unitNumber: u.unitNumber,
            monthlyRent: u.monthlyRent.toString(),
            floorId: f.id,
            floorName: f.name,
            buildingId: b.id,
            buildingName: b.name,
            buildingLocation: `${b.town}, ${b.county}`,
          });
        }
      }
    }
  }
  return { ok: true, message: "", data: units };
}
