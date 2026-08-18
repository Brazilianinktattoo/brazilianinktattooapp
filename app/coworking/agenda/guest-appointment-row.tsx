"use client";

import { useTransition } from "react";
import { cancelAppointment } from "@/app/actions/agenda";
import type { AppointmentWithRelations } from "@/lib/types/database";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GuestAppointmentRow({
  appointment,
  isOwn,
}: {
  appointment: AppointmentWithRelations;
  isOwn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const cancelled = appointment.status === "cancelado";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg bg-neutral-800 px-3 py-2 text-sm ${
        cancelled ? "opacity-50" : ""
      }`}
    >
      <div>
        <div className="text-neutral-100">
          {formatWhen(appointment.starts_at)} – {formatWhen(appointment.ends_at)}
        </div>
        <div className="text-xs text-neutral-500">
          {isOwn ? appointment.client_name : "Ocupado"}
          {cancelled && " · Cancelado"}
        </div>
      </div>
      {isOwn && !cancelled && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => cancelAppointment(appointment.id))
          }
          className="text-red-400 hover:text-red-300 disabled:opacity-60"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
