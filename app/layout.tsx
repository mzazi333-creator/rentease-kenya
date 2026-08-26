import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { getSettings } from "@/lib/services/settings-service";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RentEase Kenya — Find Your Next Home. Manage Your Property.",
    template: "%s | RentEase Kenya",
  },
  description:
    "RentEase Kenya connects landlords and tenants: search available rentals, register your building, manage rent payments via M-Pesa — all in one platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#237044",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let platformName = "RentEase Kenya";
  try {
    const settings = await getSettings();
    platformName = settings.platformName;
  } catch {
    // DB not ready yet — fall back to default
  }

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
