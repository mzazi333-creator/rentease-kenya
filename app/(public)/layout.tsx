import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { getSettings } from "@/lib/services/settings-service";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let settings;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader platformName={settings?.platformName ?? "RentEase Kenya"} />
      <div className="flex-1">{children}</div>
      <PublicFooter
        platformName={settings?.platformName ?? "RentEase Kenya"}
        supportEmail={settings?.supportEmail ?? "support@rentease.co.ke"}
        supportPhone={settings?.supportPhone ?? "+254 700 000 000"}
      />
    </div>
  );
}
