"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import NotificationsBell from "@/components/ui/NotificationsBell";
import { useAction } from "@/components/ui/useAction";
import type { Notification, Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon?: string;
  match?: (pathname: string) => boolean;
}

export function DashboardShell({
  user,
  role,
  nav,
  notifications,
  children,
  footer,
}: {
  user: { fullName: string; email: string; role: Role };
  role: Role;
  nav: NavItem[];
  notifications: (Notification & { link: string | null })[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const { run } = useAction();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle dashboard menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
                RE
              </span>
              <span className="hidden font-bold text-slate-900 sm:block">RentEase Kenya</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <NotificationsBell notifications={notifications} />
            <a href="/" className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:block" title="Public site">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
              </svg>
            </a>
            <button
              onClick={() => run(() => logoutAction(), { successMessage: "Logged out.", redirectTo: "/login", refresh: false })}
              className="btn-secondary !px-3 !py-1.5 text-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-0 px-0 sm:px-4">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col py-4 lg:flex">
          <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Dashboard navigation">
            {nav.map((item) => {
              const active = item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-600 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="rounded-lg bg-slate-100 px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
            {footer}
          </div>
        </aside>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
            <nav className="absolute left-0 top-14 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto bg-white p-3 shadow-xl">
              {nav.map((item) => {
                const active = item.match ? item.match(pathname) : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="px-3 text-sm font-semibold text-slate-900">{user.fullName}</p>
                <p className="px-3 text-xs text-slate-500">{user.email}</p>
              </div>
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
