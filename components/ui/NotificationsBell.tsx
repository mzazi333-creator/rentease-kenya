"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction } from "@/components/ui/useAction";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/admin";
import type { Notification } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsBell({
  notifications,
}: {
  notifications: (Notification & { link: string | null })[];
}) {
  const [open, setOpen] = useState(false);
  const { run } = useAction();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unread} unread)`}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <p className="text-sm font-bold text-slate-900">Notifications</p>
              {unread > 0 && (
                <button
                  className="text-xs font-semibold text-brand-600 hover:underline"
                  onClick={() => run(() => markAllNotificationsReadAction())}
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-3 ${n.read ? "" : "bg-brand-50/50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</span>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (!n.read) run(() => markNotificationReadAction(n.id));
                          setOpen(false);
                        }}
                        className="text-[11px] font-semibold text-brand-600 hover:underline"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
