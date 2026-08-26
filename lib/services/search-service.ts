import { prisma } from "@/lib/db";
import { toServiceError, type Actor } from "@/lib/services/auth-service";

export interface RentalSearchFilters {
  q?: string;
  location?: string;
  town?: string;
  county?: string;
  propertyType?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  sort?: "rent_asc" | "rent_desc" | "newest";
  page?: number;
  pageSize?: number;
}

export interface RentalCard {
  id: string;
  name: string;
  description: string;
  location: string;
  county: string;
  town: string;
  propertyType: string;
  numberOfFloors: number;
  image: string | null;
  startingRent: number | null;
  availableUnits: number;
  amenities: string[];
}

export interface RentalSearchResult {
  buildings: RentalCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Public search — only APPROVED buildings with VACANT units are returned.
 * "Availability" is implicit: a building appears only if it has vacant units.
 */
export async function searchRentals(filters: RentalSearchFilters = {}): Promise<RentalSearchResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(24, Math.max(1, filters.pageSize ?? 9));

  const where: Record<string, unknown> = { status: "APPROVED" };

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { location: { contains: filters.q, mode: "insensitive" } },
      { town: { contains: filters.q, mode: "insensitive" } },
      { county: { contains: filters.q, mode: "insensitive" } },
      { exactAddress: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
  if (filters.town) where.town = { contains: filters.town, mode: "insensitive" };
  if (filters.county) where.county = filters.county;
  if (filters.propertyType) where.propertyType = filters.propertyType;

  const unitWhere: Record<string, unknown> = { availability: "VACANT" };
  if (filters.minRent !== undefined) unitWhere.monthlyRent = { gte: filters.minRent, ...(unitWhere.monthlyRent ?? {}) };
  if (filters.maxRent !== undefined) {
    unitWhere.monthlyRent = { ...(unitWhere.monthlyRent ?? {}), lte: filters.maxRent };
  }
  if (filters.bedrooms !== undefined) unitWhere.bedrooms = { gte: filters.bedrooms };
  if (filters.bathrooms !== undefined) unitWhere.bathrooms = { gte: filters.bathrooms };

  where.units = { some: unitWhere };

  const orderBy: Record<string, unknown> =
    filters.sort === "rent_asc"
      ? { units: { _min: { monthlyRent: "asc" } } }
      : filters.sort === "rent_desc"
        ? { units: { _min: { monthlyRent: "desc" } } }
        : { createdAt: "desc" };

  const [buildings, total] = await Promise.all([
    prisma.building.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: { where: { unitId: null }, orderBy: { sortOrder: "asc" }, take: 1 },
        units: {
          where: unitWhere,
          select: { monthlyRent: true },
          orderBy: { monthlyRent: "asc" },
        },
        _count: { select: { floors: true } },
      },
    }),
    prisma.building.count({ where }),
  ]);

  return {
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      location: b.location,
      county: b.county,
      town: b.town,
      propertyType: b.propertyType,
      numberOfFloors: b.numberOfFloors,
      image: b.images[0]?.url ?? null,
      startingRent: b.units[0] ? Number(b.units[0].monthlyRent) : null,
      availableUnits: b.units.length,
      amenities: b.units.flatMap((u) => []),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface PublicBuildingDetail {
  id: string;
  name: string;
  description: string;
  location: string;
  county: string;
  town: string;
  exactAddress: string;
  propertyType: string;
  numberOfFloors: number;
  contactPhone: string | null;
  contactEmail: string | null;
  landlordName: string;
  images: { url: string; alt: string | null }[];
  floors: {
    id: string;
    name: string;
    units: {
      id: string;
      unitNumber: string;
      monthlyRent: string;
      depositAmount: string | null;
      bedrooms: number;
      bathrooms: number;
      description: string | null;
      availability: string;
      amenities: string[];
    }[];
  }[];
  vacantUnits: number;
}

/** Public building details — only for APPROVED buildings. Never exposes tenant info. */
export async function getPublicBuilding(buildingId: string): Promise<PublicBuildingDetail | null> {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      floors: {
        orderBy: { sortOrder: "asc" },
        include: {
          units: {
            orderBy: { unitNumber: "asc" },
            select: {
              id: true,
              unitNumber: true,
              monthlyRent: true,
              depositAmount: true,
              bedrooms: true,
              bathrooms: true,
              description: true,
              availability: true,
              amenities: true,
            },
          },
        },
      },
      landlord: { include: { user: { select: { fullName: true, phone: true, email: true } } } },
    },
  });
  if (!building || building.status !== "APPROVED") return null;

  return {
    id: building.id,
    name: building.name,
    description: building.description,
    location: building.location,
    county: building.county,
    town: building.town,
    exactAddress: building.exactAddress,
    propertyType: building.propertyType,
    numberOfFloors: building.numberOfFloors,
    contactPhone: building.contactPhone,
    contactEmail: building.contactEmail,
    landlordName: building.landlord.user.fullName,
    images: building.images.map((i) => ({ url: i.url, alt: i.alt })),
    floors: building.floors.map((f) => ({
      id: f.id,
      name: f.name,
      units: f.units.map((u) => ({
        id: u.id,
        unitNumber: u.unitNumber,
        monthlyRent: u.monthlyRent.toString(),
        depositAmount: u.depositAmount?.toString() ?? null,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        description: u.description,
        availability: u.availability,
        amenities: u.amenities,
      })),
    })),
    vacantUnits: building.floors.reduce(
      (sum, f) => sum + f.units.filter((u) => u.availability === "VACANT").length,
      0
    ),
  };
}

/** Distinct counties/towns for filter dropdowns. */
export async function getFilterOptions() {
  const [counties, towns, types] = await Promise.all([
    prisma.building.findMany({ where: { status: "APPROVED" }, distinct: ["county"], select: { county: true } }),
    prisma.building.findMany({ where: { status: "APPROVED" }, distinct: ["town"], select: { town: true } }),
    prisma.building.findMany({
      where: { status: "APPROVED" },
      distinct: ["propertyType"],
      select: { propertyType: true },
    }),
  ]);
  return {
    counties: counties.map((c) => c.county).filter(Boolean).sort(),
    towns: towns.map((t) => t.town).filter(Boolean).sort(),
    propertyTypes: types.map((t) => t.propertyType).filter(Boolean).sort(),
  };
}
