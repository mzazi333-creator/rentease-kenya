/**
 * RentEase Kenya — database seed.
 *
 * 1. Always creates/updates the ADMIN account from environment variables
 *    (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME / ADMIN_PHONE).
 * 2. When SEED_DEMO_DATA=true (development), seeds landlords, buildings,
 *    floors, units, tenants, tenancies and payment records.
 *
 * Run: npx prisma db seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log("🌱 Seeding database…");

  // ────────────────────────── Admin (always) ──────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@rentease.co.ke").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
  const adminName = process.env.ADMIN_NAME ?? "Platform Admin";
  const adminPhone = process.env.ADMIN_PHONE ?? "+254700000000";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { fullName: adminName, phone: adminPhone },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, SALT_ROUNDS),
      fullName: adminName,
      phone: adminPhone,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin ready: ${admin.email}`);

  // System settings + payment method defaults
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      platformName: "RentEase Kenya",
      tagline: "Find Your Next Home. Manage Your Property.",
      supportPhone: "+254 700 000 000",
      supportEmail: "support@rentease.co.ke",
      paymentInstructions:
        "Pay your rent via M-Pesa: Go to Lipa na M-Pesa, enter the Paybill/Till below, enter the exact rent amount and your account number, then submit the transaction code from the SMS you receive.",
      mpesaPaybill: "247247",
      mpesaTill: "000000",
      mpesaAccount: "RENT",
      defaultDueDay: 5,
      currency: "KES",
    },
  });

  await prisma.paymentMethod.upsert({
    where: { id: "mpesa" },
    update: {},
    create: {
      id: "mpesa",
      name: "M-Pesa",
      instructions: "Lipa na M-Pesa — Paybill 247247, account RENT",
      paybillNumber: "247247",
      accountNumber: "RENT",
      isActive: true,
    },
  });

  // ────────────────────────── Demo data (dev only) ──────────────────────────
  if (process.env.SEED_DEMO_DATA !== "true") {
    console.log("⏭️  SEED_DEMO_DATA != true — skipping demo data.");
    return;
  }

  console.log("🧪 Seeding demo data (development)…");

  // Demo landlords
  const demoLandlords = [
    { email: "landlord1@rentease.co.ke", name: "James Kamau", phone: "0712345678", business: "Kamau Properties" },
    { email: "landlord2@rentease.co.ke", name: "Mary Njeri", phone: "0723456789", business: "Njeri Real Estate" },
    { email: "landlord3@rentease.co.ke", name: "Peter Otieno", phone: "0734567890", business: "Lakeview Homes" },
  ];

  const landlords: { id: string; userId: string }[] = [];
  for (const l of demoLandlords) {
    const user = await prisma.user.upsert({
      where: { email: l.email },
      update: { fullName: l.name, phone: l.phone },
      create: {
        email: l.email,
        passwordHash: await bcrypt.hash("Landlord@123", SALT_ROUNDS),
        fullName: l.name,
        phone: l.phone,
        role: "LANDLORD",
      },
    });
    const profile = await prisma.landlordProfile.upsert({
      where: { userId: user.id },
      update: { businessName: l.business },
      create: { userId: user.id, businessName: l.business },
    });
    landlords.push({ id: profile.id, userId: user.id });
    console.log(`✅ Landlord: ${l.name}`);
  }

  // Demo tenants
  const demoTenants = [
    { email: "tenant1@rentease.co.ke", name: "Faith Wambui", phone: "0745123456", id: "31245678" },
    { email: "tenant2@rentease.co.ke", name: "Brian Kipchoge", phone: "0755123456", id: "29876543" },
    { email: "tenant3@rentease.co.ke", name: "Amina Hassan", phone: "0765123456", id: "33112233" },
    { email: "tenant4@rentease.co.ke", name: "Daniel Mwangi", phone: "0775123456", id: "34567890" },
  ];

  const tenants: { userId: string; profileId: string }[] = [];
  for (const t of demoTenants) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { fullName: t.name, phone: t.phone, nationalId: t.id },
      create: {
        email: t.email,
        passwordHash: await bcrypt.hash("Tenant@123", SALT_ROUNDS),
        fullName: t.name,
        phone: t.phone,
        role: "TENANT",
        nationalId: t.id,
      },
    });
    const profile = await prisma.tenantProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, nationalId: t.id },
    });
    tenants.push({ userId: user.id, profileId: profile.id });
  }

  // Demo buildings (APPROVED, so they appear publicly)
  const buildingsDef = [
    {
      name: "Sunrise Apartments",
      description:
        "Modern, secure apartments in Gataka with borehole water, gated compound and ample parking. Close to Ongata Rongai town centre and easy access to Nairobi CBD.",
      location: "Gataka",
      county: "Kajiado",
      town: "Ongata Rongai",
      exactAddress: "Gataka Road, 200m from Gataka Market, plot 12",
      contactPhone: "0712345678",
      contactEmail: "kamau@rentease.co.ke",
      propertyType: "Apartment",
      landlordIdx: 0,
      floors: [
        { name: "Ground Floor", units: [
          { unitNumber: "001", rent: 10000, dep: 5000, bd: 1, ba: 1 },
          { unitNumber: "002", rent: 12000, dep: 6000, bd: 2, ba: 1 },
          { unitNumber: "003", rent: 10000, dep: 5000, bd: 1, ba: 1 },
        ]},
        { name: "First Floor", units: [
          { unitNumber: "101", rent: 10000, dep: 5000, bd: 1, ba: 1 },
          { unitNumber: "102", rent: 12000, dep: 6000, bd: 2, ba: 1 },
          { unitNumber: "103", rent: 10000, dep: 5000, bd: 1, ba: 1 },
        ]},
        { name: "Second Floor", units: [
          { unitNumber: "201", rent: 15000, dep: 7500, bd: 2, ba: 2 },
          { unitNumber: "202", rent: 15000, dep: 7500, bd: 2, ba: 2 },
        ]},
      ],
    },
    {
      name: "Green View Residences",
      description:
        "Peaceful residential compound in Ruaka with secure parking, backup water and 24/7 security guards. Great for families and young professionals.",
      location: "Ruaka",
      county: "Kiambu",
      town: "Ruaka",
      exactAddress: "Kihara Road, off Ruaka–Kigwa Road",
      contactPhone: "0723456789",
      contactEmail: "njeri@rentease.co.ke",
      propertyType: "Apartment",
      landlordIdx: 1,
      floors: [
        { name: "Ground Floor", units: [
          { unitNumber: "G01", rent: 18000, dep: 9000, bd: 2, ba: 2 },
          { unitNumber: "G02", rent: 18000, dep: 9000, bd: 2, ba: 2 },
          { unitNumber: "G03", rent: 15000, dep: 7500, bd: 2, ba: 1 },
        ]},
        { name: "First Floor", units: [
          { unitNumber: "101", rent: 20000, dep: 10000, bd: 3, ba: 2 },
          { unitNumber: "102", rent: 20000, dep: 10000, bd: 3, ba: 2 },
          { unitNumber: "103", rent: 18000, dep: 9000, bd: 2, ba: 2 },
          { unitNumber: "104", rent: 16000, dep: 8000, bd: 2, ba: 1 },
        ]},
        { name: "Second Floor", units: [
          { unitNumber: "201", rent: 22000, dep: 11000, bd: 3, ba: 2 },
          { unitNumber: "202", rent: 22000, dep: 11000, bd: 3, ba: 2 },
          { unitNumber: "203", rent: 18000, dep: 9000, bd: 2, ba: 2 },
        ]},
        { name: "Third Floor", units: [
          { unitNumber: "61B", rent: 25000, dep: 12500, bd: 3, ba: 2 },
          { unitNumber: "61C", rent: 25000, dep: 12500, bd: 3, ba: 2 },
          { unitNumber: "613", rent: 20000, dep: 10000, bd: 2, ba: 2 },
          { unitNumber: "614", rent: 20000, dep: 10000, bd: 2, ba: 2 },
        ]},
      ],
    },
    {
      name: "Lakeview Bedsitters",
      description:
        "Affordable, clean bedsitters in Kibuye, Kisumu. Water and electricity included in rent, gated compound with night guards.",
      location: "Kibuye",
      county: "Kisumu",
      town: "Kisumu",
      exactAddress: "Kibuye Market Road, opposite Kibuye Police Post",
      contactPhone: "0734567890",
      contactEmail: "otieno@rentease.co.ke",
      propertyType: "Bedsitter",
      landlordIdx: 2,
      floors: [
        { name: "Ground Floor", units: [
          { unitNumber: "A1", rent: 6500, dep: 3000, bd: 0, ba: 1 },
          { unitNumber: "A2", rent: 6500, dep: 3000, bd: 0, ba: 1 },
          { unitNumber: "A3", rent: 6500, dep: 3000, bd: 0, ba: 1 },
          { unitNumber: "A4", rent: 7000, dep: 3500, bd: 0, ba: 1 },
        ]},
        { name: "First Floor", units: [
          { unitNumber: "B1", rent: 7000, dep: 3500, bd: 0, ba: 1 },
          { unitNumber: "B2", rent: 7000, dep: 3500, bd: 0, ba: 1 },
          { unitNumber: "B3", rent: 7500, dep: 3750, bd: 0, ba: 1 },
        ]},
      ],
    },
  ];

  const createdBuildings: { id: string; landlordProfileId: string; units: { id: string; unitNumber: string; rent: number; floorId: string }[] }[] = [];

  for (const def of buildingsDef) {
    const landlord = landlords[def.landlordIdx];
    const existing = await prisma.building.findFirst({ where: { name: def.name } });
    if (existing) {
      // Re-seed idempotently: just reference existing building + units
      const floors = await prisma.floor.findMany({
        where: { buildingId: existing.id },
        include: { units: true },
      });
      createdBuildings.push({
        id: existing.id,
        landlordProfileId: existing.landlordId,
        units: floors.flatMap((f) => f.units.map((u) => ({ id: u.id, unitNumber: u.unitNumber, rent: Number(u.monthlyRent), floorId: f.id }))),
      });
      continue;
    }

    const building = await prisma.building.create({
      data: {
        name: def.name,
        description: def.description,
        location: def.location,
        county: def.county,
        town: def.town,
        exactAddress: def.exactAddress,
        contactPhone: def.contactPhone,
        contactEmail: def.contactEmail,
        propertyType: def.propertyType,
        numberOfFloors: def.floors.length,
        status: "APPROVED",
        landlordId: landlord.id,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    const units: { id: string; unitNumber: string; rent: number; floorId: string }[] = [];
    for (const [fi, f] of def.floors.entries()) {
      const floor = await prisma.floor.create({
        data: { buildingId: building.id, name: f.name, sortOrder: fi },
      });
      for (const u of f.units) {
        const unit = await prisma.unit.create({
          data: {
            buildingId: building.id,
            floorId: floor.id,
            unitNumber: u.unitNumber,
            monthlyRent: u.rent,
            depositAmount: u.dep,
            bedrooms: u.bd,
            bathrooms: u.ba,
            amenities: ["Water", "Electricity", "Security"],
          },
        });
        units.push({ id: unit.id, unitNumber: unit.unitNumber, rent: Number(unit.monthlyRent), floorId: floor.id });
      }
    }
    createdBuildings.push({ id: building.id, landlordProfileId: landlord.id, units });

    await prisma.auditLog.create({
      data: {
        userId: landlord.userId,
        action: "BUILDING_SUBMITTED",
        entity: "Building",
        entityId: building.id,
        metadata: { name: def.name, seeded: true },
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "BUILDING_APPROVED",
        entity: "Building",
        entityId: building.id,
        metadata: { name: def.name, seeded: true },
      },
    });
    console.log(`✅ Building: ${def.name} (approved)`);
  }

  // Assign tenants to units (tenancies), then seed payment records.
  // tenant1 → Sunrise 001, tenant2 → Sunrise 102, tenant3 → Green View G01, tenant4 → Lakeview A1
  const assignments: { tenantIdx: number; buildingIdx: number; unitNumber: string }[] = [
    { tenantIdx: 0, buildingIdx: 0, unitNumber: "001" },
    { tenantIdx: 1, buildingIdx: 0, unitNumber: "102" },
    { tenantIdx: 2, buildingIdx: 1, unitNumber: "G01" },
    { tenantIdx: 3, buildingIdx: 2, unitNumber: "A1" },
  ];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const mpesaCodes = new Set<string>();

  for (const a of assignments) {
    const tenant = tenants[a.tenantIdx];
    const building = createdBuildings[a.buildingIdx];
    const unit = building.units.find((u) => u.unitNumber === a.unitNumber);
    if (!unit) continue;

    const existingTenancy = await prisma.tenancy.findFirst({
      where: { tenantId: tenant.userId, unitId: unit.id, status: "ACTIVE" },
    });

    if (existingTenancy) {
      // Ensure previous-month + current-month payments exist (idempotent)
      await seedPayment(tenant.userId, building, unit, existingTenancy.id, prevMonth, prevYear, "CONFIRMED", mpesaCodes, admin.id);
      await seedPayment(tenant.userId, building, unit, existingTenancy.id, currentMonth, currentYear, "CONFIRMED", mpesaCodes, admin.id);
      continue;
    }

    const tenancy = await prisma.tenancy.create({
      data: {
        tenantId: tenant.userId,
        tenantProfileId: tenant.profileId,
        buildingId: building.id,
        unitId: unit.id,
        floorId: unit.floorId,
        landlordId: building.landlordProfileId,
        monthlyRent: unit.rent,
        status: "ACTIVE",
      },
    });

    await prisma.unit.update({ where: { id: unit.id }, data: { availability: "OCCUPIED" } });

    await prisma.tenantApplication.create({
      data: {
        tenantId: tenant.userId,
        tenantProfileId: tenant.profileId,
        buildingId: building.id,
        unitId: unit.id,
        floorId: unit.floorId,
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    await seedPayment(tenant.userId, building, unit, tenancy.id, prevMonth, prevYear, "CONFIRMED", mpesaCodes, admin.id);
    await seedPayment(tenant.userId, building, unit, tenancy.id, currentMonth, currentYear, "CONFIRMED", mpesaCodes, admin.id);

    console.log(`✅ Tenancy: ${tenant.userId.slice(0, 6)} → ${building.id.slice(0, 6)}/${unit.unitNumber}`);
  }

  console.log("✅ Seed complete!");
}

async function seedPayment(
  tenantUserId: string,
  building: { id: string; landlordProfileId: string },
  unit: { id: string; unitNumber: string; rent: number },
  tenancyId: string,
  month: number,
  year: number,
  status: "CONFIRMED",
  usedCodes: Set<string>,
  adminId: string
) {
  const existing = await prisma.payment.findFirst({
    where: { tenancyId, month, year, status: "CONFIRMED" },
  });
  if (existing) return;

  let code = `SEED${month}${String(year).slice(2)}${unit.unitNumber.replace(/\D/g, "") || "0"}${Math.floor(Math.random() * 900 + 100)}`;
  code = code.replace(/[^A-Z0-9]/gi, "").slice(0, 10).toUpperCase();
  while (usedCodes.has(code)) {
    code = `SEED${Math.floor(Math.random() * 1000000)}`;
  }
  usedCodes.add(code);

  const paymentDate = new Date(year, month - 1, Math.min(5, 28));
  await prisma.payment.create({
    data: {
      tenancyId,
      tenantId: tenantUserId,
      unitId: unit.id,
      buildingId: building.id,
      landlordId: building.landlordProfileId,
      amount: unit.rent,
      transactionCode: code,
      paymentDate,
      month,
      year,
      status,
      method: "M-Pesa",
      reviewedById: adminId,
      reviewedAt: paymentDate,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
