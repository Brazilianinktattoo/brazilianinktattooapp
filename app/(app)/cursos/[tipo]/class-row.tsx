"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setCourseClassActive } from "@/app/actions/cursos";
import type { CourseClass, CourseType } from "@/lib/types/database";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClassRow({
  courseType,
  courseClass,
  occupied,
}: {
  courseType: CourseType;
  courseClass: CourseClass;
  occupied: number;
}) {
  const [pending, startTransition] = useTransition();
  const full = occupied >= courseClass.max_seats;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <Link
        href={`/cursos/${courseType}/turmas/${courseClass.id}`}
        className="flex-1"
      >
        <div className="font-medium text-white">{courseClass.name}</div>
        <div className="text-sm text-neutral-400">
          {occupied}/{courseClass.max_seats} vagas
          {full && <span className="ml-2 text-amber-400">Lotada</span>}
          {" · "}
          {formatMoney(courseClass.price_total)} · sinal {courseClass.deposit_percentage}%
          {courseClass.start_date && (
            <>
              {" · início "}
              {new Date(`${courseClass.start_date}T12:00:00Z`).toLocaleDateString("pt-BR")}
            </>
          )}
        </div>
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(() => setCourseClassActive(courseClass.id, !courseClass.active))
        }
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${
          courseClass.active
            ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
            : "bg-neutral-700/40 text-neutral-400 hover:bg-neutral-700/60"
        }`}
      >
        {courseClass.active ? "Ativa" : "Encerrada"}
      </button>
    </div>
  );
}
