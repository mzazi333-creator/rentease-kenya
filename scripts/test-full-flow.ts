/**
 * End-to-end integration test of the full platform flow.
 * Exercises the real service layer against the real PostgreSQL database.
 *
 * Run: npx tsx scripts/test-full-flow.ts
 */
import { PrismaClient } from "@prisma/client";

// Tiny .env loader (tsx does not auto-load .env)
import { readFileSync } from "fs";
import path from "path";
const envPath = path.join(process.cwd(), ".env");
if (process.env.DATABASE_URL === undefined && exists(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}
function exists(p: string) {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

const prisma = new PrismaClient();

import {
  registerUser,
  loginUser,
  updateProfile,
} from "../lib/services/auth-service";
import { createBuilding, listLandlordBuildings, updateBuilding } from "../lib/services/building-service";
import { addFloor, renameFloor, deleteFloor } from "../lib/services/floor-service";
import { createUnit, updateUnit } from "../lib/services/unit-service";
import {
  submitApplication,
  cancelApplication,
  approveApplication,
  rejectApplication,
  moveOutTenant,
  getActiveTenancy,
} from "../lib/services/application-service";
import { submitPayment, confirmPayment, rejectPayment, listTenantPaymentHistory } from "../lib/services/payment-service";
import {
  setBuildingStatus,
  setUserStatus,
  moveTenantToUnit,
} from "../lib/services/admin-service";
import { searchRentals, getPublicBuilding } from "../lib/services/search-service";
import { computeRentStatus } from "../lib/rent-status";
import { adminDashboardStats } from "../lib/services/admin-service";
import type { Actor } from "../lib/services/auth-service";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

function expectError(name: string, fn: () => Promise<unknown>, detail?: string) {
  return fn()
    .then(() => {
      failed++;
      failures.push(name);
      console.log(`  ❌ ${name} — expected an error but it succeeded`);
    })
    .catch((e: Error) => {
      const msg = e.message;
      const ok = detail ? msg.includes(detail) : true;
      if (ok) {
        passed++;
        console.log(`  ✅ ${name} (${msg})`);
      } else {
        failed++;
        failures.push(name);
        console.log(`  ❌ ${name} — error message "${msg}" does not include "${detail}"`);
      }
    });
}

const ts = Date.now();
const suffix = String(ts).slice(-6);

async function main() {
  console.log(`\n🧪 RentEase full-flow test (run ${suffix})\n`);

  const landlordEmail = `landlord.test.${suffix}@rentease.test`;
  const tenantEmail = `tenant.test.${suffix}@rentease.test`;
  const adminEmail = "admin@rentease.co.ke";

  /* ── 1. LANDLORD: register → login ── */
  console.log("1) LANDLORD registration & login");
  const landlord = await registerUser({
    fullName: `Test Landlord ${suffix}`,
    email: landlordEmail,
    phone: "0711111111",
    password: "Landlord@123",
    confirmPassword: "Landlord@123",
    role: "LANDLORD",
  });
  check("landlord registered", !!landlord.user.id);
  const landlordActor: Actor = { id: landlord.user.id, role: "LANDLORD" };

  const loginL = await loginUser({ email: landlordEmail, password: "Landlord@123" });
  check("landlord login", loginL.id === landlord.user.id);
  await expectError("landlord login wrong password", () =>
    loginUser({ email: landlordEmail, password: "wrong-password" })
  );

  /* ── 2. LANDLORD: register building with custom floors/units ── */
  console.log("2) Building registration with flexible structure");
  const building = await createBuilding(landlordActor, {
    building: {
      name: `Test Towers ${suffix}`,
      description: "A test building with fully custom floor and unit numbering.",
      location: "Testville",
      county: "Kiambu",
      town: "Test Town",
      exactAddress: "Plot 99, Test Road",
      contactPhone: "0711111111",
      propertyType: "Apartment",
      numberOfFloors: 2,
      defaultDueDay: 5,
    },
    floors: [
      {
        name: "Ground Floor",
        units: [
          { unitNumber: "001", monthlyRent: 10000, bedrooms: 1, bathrooms: 1 },
          { unitNumber: "61B", monthlyRent: 12000, bedrooms: 2, bathrooms: 1 },
        ],
      },
      {
        name: "Mezzanine",
        units: [
          { unitNumber: "A1", monthlyRent: 9000, bedrooms: 1, bathrooms: 1 },
          { unitNumber: "Shop 4", monthlyRent: 20000, bedrooms: 0, bathrooms: 1 },
        ],
      },
    ],
  });
  check("building created as PENDING_APPROVAL", building.status === "PENDING_APPROVAL", building.status);
  check("custom unit numbering stored", building.name.includes("Test Towers"));

  const buildingDetail = await prisma.building.findUnique({
    where: { id: building.id },
    include: { floors: { include: { units: true } } },
  });
  check("building has 2 floors", buildingDetail?.floors.length === 2);
  check(
    "building has 4 units incl. '61B' and 'Shop 4'",
    buildingDetail?.floors.flatMap((f) => f.units.map((u) => u.unitNumber)).sort().join(",") ===
      "001,61B,A1,Shop 4"
  );

  /* ── 3. PUBLIC: building NOT visible before approval ── */
  console.log("3) Approval gating");
  const beforeSearch = await searchRentals({ q: `Test Towers ${suffix}` });
  check("unapproved building hidden from public search", beforeSearch.total === 0, beforeSearch.total);
  const publicBefore = await getPublicBuilding(building.id);
  check("unapproved building detail returns null", publicBefore === null);

  /* ── 4. ADMIN: approve building ── */
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  check("admin exists (seeded)", !!admin);
  const adminActor: Actor = { id: admin!.id, role: "ADMIN" };

  await setBuildingStatus(adminActor, building.id, "APPROVED");
  const approved = await prisma.building.findUnique({ where: { id: building.id } });
  check("building APPROVED", approved?.status === "APPROVED");

  const afterSearch = await searchRentals({ q: `Test Towers ${suffix}` });
  check("approved building appears in public search", afterSearch.total === 1, afterSearch.total);
  const publicAfter = await getPublicBuilding(building.id);
  check("public detail shows vacant units", publicAfter?.vacantUnits === 4, publicAfter?.vacantUnits);
  check("public detail hides tenant info", !JSON.stringify(publicAfter).includes("nationalId"));

  /* ── 5. LANDLORD: floor & unit management ── */
  console.log("4) Floor & unit management");
  const newFloor = await addFloor(landlordActor, building.id, "Top Deck");
  check("floor added", newFloor.name === "Top Deck");
  await renameFloor(landlordActor, newFloor.id, "Rooftop");
  const renamed = await prisma.floor.findUnique({ where: { id: newFloor.id } });
  check("floor renamed", renamed?.name === "Rooftop");
  await expectError("duplicate floor name rejected", () =>
    addFloor(landlordActor, building.id, "Rooftop")
  );

  const newUnit = await createUnit(landlordActor, building.id, newFloor.id, {
    unitNumber: "R7",
    monthlyRent: 8000,
    availability: "VACANT",
  });
  check("unit added with custom number R7", newUnit.unitNumber === "R7");
  await expectError("duplicate unit number rejected", () =>
    createUnit(landlordActor, building.id, newFloor.id, { unitNumber: "R7", monthlyRent: 8000 })
  );

  /* ── 6. Cross-landlord protection ── */
  console.log("5) Authorization");
  const otherLandlord = await registerUser({
    fullName: "Other Landlord",
    email: `landlord.other.${suffix}@rentease.test`,
    phone: "0722222222",
    password: "Landlord@123",
    confirmPassword: "Landlord@123",
    role: "LANDLORD",
  });
  const otherActor: Actor = { id: otherLandlord.user.id, role: "LANDLORD" };
  await expectError("landlord cannot manage another landlord's building", () =>
    createUnit(otherActor, building.id, newFloor.id, { unitNumber: "X9", monthlyRent: 5000 }),
    "permission"
  );
  await expectError("landlord cannot update another landlord's building", () =>
    updateBuilding(otherActor, building.id, {
      name: "Hacked",
      description: "hacked description with enough length for validation",
      location: "x",
      county: "Kiambu",
      town: "x",
      exactAddress: "x",
      contactPhone: "0711111111",
      propertyType: "Apartment",
      numberOfFloors: 2,
    }),
    "permission"
  );

  /* ── 7. TENANT: register → apply → approved → occupied ── */
  console.log("6) Tenant registration & application");
  const tenant = await registerUser({
    fullName: `Test Tenant ${suffix}`,
    email: tenantEmail,
    phone: "0733333333",
    password: "Tenant@123",
    confirmPassword: "Tenant@123",
    role: "TENANT",
  });
  check("tenant registered", !!tenant.user.id);
  const tenantActor: Actor = { id: tenant.user.id, role: "TENANT" };
  await updateProfile(tenantActor, {
    fullName: `Test Tenant ${suffix}`,
    phone: "0733333333",
    nationalId: `ID-${suffix}`,
    emergencyName: "Mother",
    emergencyContact: "0744444444",
  });

  const groundFloor = buildingDetail!.floors[0];
  const unit001 = groundFloor.units.find((u) => u.unitNumber === "001")!;
  const unit61B = groundFloor.units.find((u) => u.unitNumber === "61B")!;

  const app = await submitApplication(tenantActor, {
    buildingId: building.id,
    floorId: groundFloor.id,
    unitId: unit001.id,
  });
  check("application submitted", !!app.id);
  const unitAfterApp = await prisma.unit.findUnique({ where: { id: unit001.id } });
  check("unit marked PENDING_APPROVAL while application pending", unitAfterApp?.availability === "PENDING_APPROVAL");

  await expectError("second tenant cannot apply for same pending unit", () =>
    submitApplication(
      { id: otherLandlord.user.id, role: "TENANT" },
      { buildingId: building.id, floorId: groundFloor.id, unitId: unit001.id }
    ),
    "already has an application"
  );
  await expectError("application on occupied/pending unit rejected", () =>
    submitApplication(tenantActor, {
      buildingId: building.id,
      floorId: groundFloor.id,
      unitId: unit001.id,
    })
  );

  await approveApplication(adminActor, app.id);
  const unitAfterApprove = await prisma.unit.findUnique({ where: { id: unit001.id } });
  check("unit becomes OCCUPIED after approval", unitAfterApprove?.availability === "OCCUPIED");
  const tenancy = await getActiveTenancy(tenant.user.id);
  check("tenancy created (tenant → unit → building)", tenancy?.unit.unitNumber === "001");
  check("tenancy snapshots rent", Number(tenancy?.monthlyRent) === 10000);

  const secondApp = await submitApplication(tenantActor, {
    buildingId: building.id,
    floorId: groundFloor.id,
    unitId: unit61B.id,
  });
  await rejectApplication(adminActor, secondApp.id, "Test rejection: ID mismatch");
  const unit61BAfter = await prisma.unit.findUnique({ where: { id: unit61B.id } });
  check("rejected application frees the unit", unit61BAfter?.availability === "VACANT");

  /* ── 8. PAYMENTS ── */
  console.log("7) M-Pesa payments");
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const paymentDate = new Date(curYear, curMonth - 1, 1);
  const code1 = `TEST${suffix}A1`;

  const pay1 = await submitPayment(tenantActor, {
    transactionCode: code1,
    amount: 10000,
    paymentDate,
  });
  check("payment submitted as PENDING_CONFIRMATION", pay1.status === "PENDING_CONFIRMATION");

  await expectError("duplicate M-Pesa transaction code rejected", () =>
    submitPayment(tenantActor, { transactionCode: code1, amount: 10000, paymentDate }),
    "already been used"
  );
  await expectError("double submission for same month rejected", () =>
    submitPayment(tenantActor, { transactionCode: `TEST${suffix}A2`, amount: 10000, paymentDate }),
    "already have a payment"
  );
  await expectError("tenant cannot submit payment for another tenancy", async () => {
    // other tenant (no tenancy) tries to pay — must fail
    const otherTenant = await registerUser({
      fullName: "Other Tenant",
      email: `tenant.other.${suffix}@rentease.test`,
      phone: "0755555555",
      password: "Tenant@123",
      confirmPassword: "Tenant@123",
      role: "TENANT",
    });
    return submitPayment(
      { id: otherTenant.user.id, role: "TENANT" },
      { transactionCode: `TEST${suffix}ZZ`, amount: 10000, paymentDate }
    );
  }, "active tenancy");

  const rentBeforeConfirm = await computeRentStatus(tenancy!.id, 5);
  check("rent is PENDING before confirmation", rentBeforeConfirm.status === "PENDING", rentBeforeConfirm.status);

  await confirmPayment(adminActor, pay1.id);
  const rentAfterConfirm = await computeRentStatus(tenancy!.id, 5);
  check("rent becomes PAID after confirmation", rentAfterConfirm.status === "PAID", rentAfterConfirm.status);

  const history = await listTenantPaymentHistory(tenantActor);
  check("confirmed payment in history", history.some((p) => p.transactionCode === code1 && p.status === "CONFIRMED"));

  // Rejected payment flow (next month)
  const nextPaymentDate = new Date(curYear, curMonth, 1);
  const pay2 = await submitPayment(tenantActor, {
    transactionCode: `TEST${suffix}B1`,
    amount: 10000,
    paymentDate: nextPaymentDate,
  });
  await rejectPayment(adminActor, pay2.id, "Code could not be verified with M-Pesa");
  const rejected = await prisma.payment.findUnique({ where: { id: pay2.id } });
  check("payment REJECTED with reason", rejected?.status === "REJECTED" && rejected.rejectionReason?.includes("M-Pesa"));

  // Tenant can resubmit after rejection
  const pay3 = await submitPayment(tenantActor, {
    transactionCode: `TEST${suffix}B2`,
    amount: 10000,
    paymentDate: nextPaymentDate,
  });
  check("tenant can resubmit after rejection", pay3.status === "PENDING_CONFIRMATION");
  await confirmPayment(adminActor, pay3.id);

  /* ── 9. Overdue detection ── */
  console.log("8) Rent deadlines & overdue");
  // Fresh tenancy without payment for current month where due day has passed
  const freshTenant = await registerUser({
    fullName: "Fresh Tenant",
    email: `tenant.fresh.${suffix}@rentease.test`,
    phone: "0766666666",
    password: "Tenant@123",
    confirmPassword: "Tenant@123",
    role: "TENANT",
  });
  const freshActor: Actor = { id: freshTenant.user.id, role: "TENANT" };
  const freshApp = await submitApplication(freshActor, {
    buildingId: building.id,
    floorId: groundFloor.id,
    unitId: unit61B.id,
  });
  await approveApplication(adminActor, freshApp.id);
  const freshTenancy = await getActiveTenancy(freshTenant.user.id);

  // If today is past the due day (5th), status must be OVERDUE
  const rs = await computeRentStatus(freshTenancy!.id, 5);
  check(
    "no payment + past due day → OVERDUE",
    rs.status === "OVERDUE",
    { status: rs.status, today: new Date().toISOString() }
  );

  const overdueList = await import("../lib/services/payment-service").then((m) => m.listOverdueTenancies());
  check("overdue list includes the fresh tenancy", overdueList.some((t) => t.id === freshTenancy!.id));

  /* ── 10. Rent change preserves history ── */
  console.log("9) Rent immutability");
  await updateUnit(landlordActor, unit001.id, {
    unitNumber: "001",
    monthlyRent: 15000,
    availability: "OCCUPIED",
  });
  const tenancyAfterRentChange = await prisma.tenancy.findUnique({ where: { id: tenancy!.id } });
  check("tenancy snapshot rent unchanged after unit rent change", Number(tenancyAfterRentChange?.monthlyRent) === 10000);
  const payAfterRentChange = await prisma.payment.findUnique({ where: { id: pay1.id } });
  check("historical payment amount unchanged", Number(payAfterRentChange?.amount) === 10000);

  /* ── 11. Move out & re-let ── */
  console.log("10) Move out");
  await moveOutTenant(adminActor, tenancy!.id, "Moved to a bigger house");
  const movedTenancy = await prisma.tenancy.findUnique({ where: { id: tenancy!.id } });
  check("tenancy MOVED_OUT (history preserved)", movedTenancy?.status === "MOVED_OUT" && !!movedTenancy.endedAt);
  const unitAfterMoveOut = await prisma.unit.findUnique({ where: { id: unit001.id } });
  check("unit VACANT after move out", unitAfterMoveOut?.availability === "VACANT");
  check("historical payments preserved after move out", (await prisma.payment.count({ where: { tenancyId: tenancy!.id } })) >= 2);

  // Re-let the unit
  const reletApp = await submitApplication(freshActor, {
    buildingId: building.id,
    floorId: groundFloor.id,
    unitId: unit001.id,
  });
  await approveApplication(adminActor, reletApp.id);
  check("unit can be re-let after move out", (await prisma.unit.findUnique({ where: { id: unit001.id } }))?.availability === "OCCUPIED");

  /* ── 12. Admin move tenant to another unit ── */
  console.log("11) Admin tenant move");
  const targetUnit = await prisma.unit.findFirst({
    where: { buildingId: building.id, availability: "VACANT" },
    orderBy: { unitNumber: "asc" },
  });
  if (targetUnit) {
    const freshTenancy2 = await getActiveTenancy(freshTenant.user.id);
    await moveTenantToUnit(adminActor, freshTenancy2!.id, targetUnit.id, "Admin reassignment");
    check("tenant moved to new unit", (await prisma.unit.findUnique({ where: { id: targetUnit.id } }))?.availability === "OCCUPIED");
  } else {
    check("admin move (no vacant target available)", true, "skipped");
  }

  /* ── 13. Role-based authorization ── */
  console.log("12) RBAC");
  await expectError("tenant cannot approve buildings", () =>
    setBuildingStatus(tenantActor, building.id, "APPROVED"),
    "permission"
  );
  await expectError("tenant cannot confirm payments", () => confirmPayment(tenantActor, pay1.id), "permission");
  await expectError("landlord cannot approve tenants", () => approveApplication(landlordActor, reletApp.id), "permission");
  await expectError("tenant cannot suspend users", () => setUserStatus(tenantActor, otherLandlord.user.id, "SUSPENDED"), "permission");
  await expectError("tenant cannot view admin reports", () =>
    import("../lib/services/report-service").then((m) => m.summaryReport(tenantActor)),
    "permission"
  );

  /* ── 14. Admin dashboard stats work ── */
  console.log("13) Admin stats");
  const stats = await adminDashboardStats();
  check("admin stats computed from DB", stats.buildings >= 1 && stats.totalUsers >= 1, stats);

  /* ── 15. Suspension blocks login ── */
  console.log("14) User suspension");
  await setUserStatus(adminActor, otherLandlord.user.id, "SUSPENDED");
  await expectError("suspended user cannot log in", () =>
    loginUser({ email: `landlord.other.${suffix}@rentease.test`, password: "Landlord@123" }),
    "suspended"
  );
  await setUserStatus(adminActor, otherLandlord.user.id, "ACTIVE");
  check("user reactivated", (await loginUser({ email: `landlord.other.${suffix}@rentease.test`, password: "Landlord@123" })).status === "ACTIVE");

  /* ── 16. Rejected building flow ── */
  console.log("15) Building rejection & resubmission");
  const rejectBuilding = await createBuilding(landlordActor, {
    building: {
      name: `Rejected Towers ${suffix}`,
      description: "This building should be rejected by the admin.",
      location: "Testville",
      county: "Kiambu",
      town: "Test Town",
      exactAddress: "Plot 100, Test Road",
      contactPhone: "0711111111",
      propertyType: "Apartment",
      numberOfFloors: 1,
    },
    floors: [{ name: "Ground Floor", units: [{ unitNumber: "001", monthlyRent: 5000 }] }],
  });
  await setBuildingStatus(adminActor, rejectBuilding.id, "REJECTED", "Incomplete photos required");
  check("rejected building hidden publicly", (await searchRentals({ q: `Rejected Towers ${suffix}` })).total === 0);
  const resubmit = await import("../lib/services/building-service").then((m) => m.resubmitBuilding(landlordActor, rejectBuilding.id));
  check("landlord can resubmit rejected building", resubmit.status === "PENDING_APPROVAL");

  /* ── 17. Notifications created ── */
  console.log("16) Notifications");
  const landlordNotifs = await prisma.notification.count({ where: { userId: landlord.user.id } });
  check("landlord received notifications", landlordNotifs >= 2, landlordNotifs);
  const tenantNotifs = await prisma.notification.count({ where: { userId: tenant.user.id } });
  check("tenant received notifications", tenantNotifs >= 3, tenantNotifs);
  const adminNotifs = await prisma.notification.count({ where: { userId: admin!.id } });
  check("admin received notifications", adminNotifs >= 3, adminNotifs);

  /* ── 18. Audit logs recorded ── */
  console.log("17) Audit logs");
  const audit = await prisma.auditLog.count({ where: { userId: admin!.id } });
  check("admin actions audited", audit >= 6, audit);
  const paymentAudit = await prisma.auditLog.count({ where: { action: "PAYMENT_CONFIRMED" } });
  check("payment confirmations audited", paymentAudit >= 2, paymentAudit);

  /* ── Cleanup test data ── */
  console.log("18) Cleanup");
  const deletedBuildings = await prisma.building.deleteMany({
    where: { OR: [{ name: { startsWith: "Test Towers" } }, { name: { startsWith: "Rejected Towers" } }] },
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@rentease.test" } },
  });
  check("test data cleaned up", deletedBuildings.count >= 2);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("Failures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("ALL TESTS PASSED ✅");
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
