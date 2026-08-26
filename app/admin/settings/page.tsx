import { getSettings } from "@/lib/services/settings-service";
import { requireRole } from "@/lib/guards";
import { PageHeader } from "@/components/ui/Layout";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("ADMIN");
  const settings = await getSettings();

  return (
    <div>
      <PageHeader title="Settings" description="Configure the platform, M-Pesa payment details and rent defaults." />
      <div className="max-w-3xl">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
