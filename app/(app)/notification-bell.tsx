"use client";

import { useState, useTransition } from "react";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/actions/notifications";
import { STUDIO_TZ } from "@/lib/date";
import type { Notification } from "@/lib/types/database";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
}

export function NotificationBell({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [, startTransition] = useTransition();

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:border-gold-soft hover:text-gold"
        aria-label="Notificações"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-gold bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl border-b border-gold-soft/40 bg-gradient-to-b from-gold-strong to-gold px-4 py-2.5">
              <span className="text-sm font-semibold text-neutral-950">
                Notificações
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                    startTransition(() => markAllNotificationsRead());
                  }}
                  className="text-xs font-medium text-neutral-950/70 hover:text-neutral-950"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 && (
                <p className="p-4 text-center text-sm text-neutral-500">
                  Nenhuma notificação ainda.
                </p>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (n.read) return;
                    setItems((prev) =>
                      prev.map((i) => (i.id === n.id ? { ...i, read: true } : i))
                    );
                    startTransition(() => markNotificationRead(n.id));
                  }}
                  className={`block w-full border-b border-neutral-200 px-4 py-2.5 text-left last:border-b-0 hover:bg-amber-50 ${
                    n.read ? "bg-white opacity-60" : "bg-amber-50/60"
                  }`}
                >
                  <p className="text-sm text-neutral-900">{n.message}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {formatWhen(n.created_at)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
