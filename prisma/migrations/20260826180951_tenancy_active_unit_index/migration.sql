-- DropIndex
DROP INDEX "Tenancy_unitId_status_key";

-- Enforce one ACTIVE tenancy per unit (partial unique index)
CREATE UNIQUE INDEX "Tenancy_one_active_per_unit" ON "Tenancy"("unitId") WHERE "status" = 'ACTIVE';
