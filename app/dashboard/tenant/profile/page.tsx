import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import ProfileForm from "@/components/auth/ProfileForm";
import { PageHeader } from "@/components/ui/Layout";

export const dynamic = "force-dynamic";

export default async function TenantProfilePage() {
  const user = await requireRole("TENANT");
  const tenantProfile = await prisma.tenantProfile.findUnique({ where: { userId: user.id } });
  return (
    <div>
      <PageHeader title="Profile" description="Update your account details." />
      <div className="max-w-2xl">
        <ProfileForm user={user} tenantProfile={tenantProfile} />
      </div>
    </div>
  );
}
