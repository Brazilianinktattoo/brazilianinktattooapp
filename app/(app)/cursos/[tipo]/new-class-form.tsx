"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCourseClass, type CourseClassFormState } from "@/app/actions/cursos";
import type { CourseType } from "@/lib/types/database";

const initialState: CourseClassFormState = {};

export function NewClassForm({ courseType }: { courseType: CourseType }) {
  const [state, formAction, pending] = useActionState(createCourseClass, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-2"
    >
      <input type="hidden" name="course_type" value={courseType} />

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="name" className="text-sm text-neutral-300">
          Nome da turma
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Ex: Turma Setembro/2026"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="start_date" className="text-sm text-neutral-300">
          Data de início (opcional)
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold [color-scheme:dark]"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="max_seats" className="text-sm text-neutral-300">
          Vagas
        </label>
        <input
          id="max_seats"
          name="max_seats"
          type="number"
          min="1"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="price_total" className="text-sm text-neutral-300">
          Valor total do curso (R$)
        </label>
        <input
          id="price_total"
          name="price_total"
          type="number"
          min="0"
          step="0.01"
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="deposit_percentage" className="text-sm text-neutral-300">
          Sinal (% do valor total)
        </label>
        <input
          id="deposit_percentage"
          name="deposit_percentage"
          type="number"
          min="1"
          max="100"
          step="0.1"
          defaultValue={15}
          required
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-gold"
        />
      </div>

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        {state.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-gradient-to-b from-gold-strong to-gold shadow-[0_4px_14px_-4px_rgba(201,169,97,0.45)] px-4 py-2 font-medium text-neutral-950 transition hover:to-copper disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar turma"}
        </button>
      </div>
    </form>
  );
}
