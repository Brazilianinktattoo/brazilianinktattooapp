"use client";

import { useTransition } from "react";
import Link from "next/link";
import { cancelAppointment, deleteAppointment } from "@/app/actions/agenda";
import { openComanda } from "@/app/actions/comandas";
import { STUDIO_TZ } from "@/lib/date";
import type { CollaboratorColor } from "@/lib/collaborator-color";
import type { AppointmentWithRelations } from "@/lib/types/database";

// timeZone explícito é obrigatório aqui: sem ele, o servidor (UTC) e o
// navegador do colaborador (fuso local) formatam o mesmo horário de forma
// diferente, e o React acusa erro de hidratação nesse componente.
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function AppointmentRow({
  appointment,
  canEdit,
  isAdmin,
  roleLabel,
  color,
}: {
  appointment: AppointmentWithRelations;
  canEdit: boolean;
  isAdmin: boolean;
  roleLabel: Record<string, string>;
  color: CollaboratorColor;
}) {
  const [pending, startTransition] = useTransition();
  const cancelled = appointment.status === "cancelado";

  return (
    <tr
      className={`border-b border-l-4 border-neutral-800 ${color.border} align-top ${
        cancelled ? "opacity-50" : ""
      }`}
    >
      <td className="py-3 pl-4 pr-4 whitespace-nowrap text-neutral-200">
        {formatTime(appointment.starts_at)} – {formatTime(appointment.ends_at)}
      </td>
      <td className="py-3 pr-4 text-neutral-300">
        {appointment.unit?.name ?? "—"}
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-1.5 text-neutral-100">
          <span className={`h-2 w-2 rounded-full ${color.dot}`} />
          {appointment.collaborator?.full_name || "—"}
        </div>
        <div className="text-xs text-neutral-500">
          {roleLabel[appointment.collaborator?.role ?? ""] ?? ""}
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="text-neutral-100">{appointment.client_name}</div>
        {appointment.client_phone && (
          <div className="text-xs text-neutral-500">
            {appointment.client_phone}
          </div>
        )}
      </td>
      <td className="py-3 pr-4 text-neutral-300">
        {appointment.maca?.label ?? "—"}
      </td>
      <td className="py-3 pr-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            cancelled
              ? "bg-neutral-700/40 text-neutral-400"
              : "bg-green-500/15 text-green-400"
          }`}
        >
          {cancelled ? "Cancelado" : "Confirmado"}
        </span>
      </td>
      <td className="py-3 pr-4">
        <div className="text-neutral-200">
          {formatMoney(appointment.deposit_amount)}
        </div>
        <span
          className={`text-xs font-medium ${
            appointment.deposit_status === "pago"
              ? "text-green-400"
              : "text-amber-400"
          }`}
        >
          {appointment.deposit_status === "pago" ? "Pago" : "Pendente"}
        </span>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3 text-sm">
          {canEdit && !cancelled && (
            <>
              <Link
                href={`/agendamentos/${appointment.id}/editar`}
                className="text-neutral-400 hover:text-white"
              >
                Editar
              </Link>
              <Link
                href={`/agendamentos/${appointment.id}/anamnese`}
                className="text-neutral-400 hover:text-white"
              >
                Anamnese
              </Link>
              <form action={openComanda}>
                <input type="hidden" name="appointment_id" value={appointment.id} />
                <button
                  type="submit"
                  className="text-neutral-400 hover:text-white"
                >
                  Comanda
                </button>
              </form>
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
            </>
          )}
          {isAdmin && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Excluir definitivamente o agendamento de ${appointment.client_name}? Essa ação não pode ser desfeita.`
                  )
                ) {
                  startTransition(() => deleteAppointment(appointment.id));
                }
              }}
              className="text-neutral-500 hover:text-red-400 disabled:opacity-60"
            >
              Excluir
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
