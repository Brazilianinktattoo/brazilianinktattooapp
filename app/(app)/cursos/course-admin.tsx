"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  createCourse,
  renameCourse,
  setCourseActive,
  type CourseFormState,
} from "@/app/actions/cursos";
import type { Course } from "@/lib/types/database";

function CourseRow({ course }: { course: Course }) {
  const [name, setName] = useState(course.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2">
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSaved(false);
        }}
        className="min-w-[200px] flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-gold"
      />
      <span className="text-xs text-neutral-500">{course.area === "tatuagem" ? "Tatuagem" : "Piercing"}</span>
      <button
        type="button"
        disabled={pending || name.trim() === course.name}
        onClick={() =>
          start(async () => {
            const r = await renameCourse(course.slug, name);
            setError(r.error ?? null);
            setSaved(!r.error);
          })
        }
        className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-gold-soft hover:text-gold disabled:opacity-50"
      >
        Renomear
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => setCourseActive(course.slug, !course.active))}
        className={`rounded-lg border px-3 py-1.5 text-sm ${
          course.active
            ? "border-neutral-700 text-neutral-300 hover:border-red-800 hover:text-red-400"
            : "border-green-800 text-green-400 hover:bg-green-500/10"
        }`}
      >
        {course.active ? "Desativar" : "Reativar"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
      {saved && <span className="text-xs text-green-400">Salvo.</span>}
    </div>
  );
}

export function CourseAdmin({ courses }: { courses: Course[] }) {
  const [state, action, pending] = useActionState(createCourse, {} as CourseFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.success) formRef.current?.reset();
  }

  return (
    <details className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
      <summary className="cursor-pointer text-sm font-medium text-neutral-300">
        Gerenciar lista de cursos (adicionar, renomear, desativar)
      </summary>
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs text-neutral-500">
          Desativar esconde o curso das telas e impede novas turmas, mas não apaga turmas nem alunos que já existem.
        </p>
        {courses.map((c) => (
          <CourseRow key={c.slug} course={c} />
        ))}
        <form ref={formRef} action={action} className="mt-2 flex flex-wrap items-end gap-2 border-t border-neutral-800 pt-3">
          <div className="flex min-w-[220px] flex-1 flex-col gap-1">
            <label htmlFor="new_course" className="text-sm text-neutral-300">Novo curso</label>
            <input
              id="new_course"
              name="name"
              required
              placeholder="Ex: Micropigmentação"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
            />
          </div>
          <select
            name="area"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-gold"
          >
            <option value="tatuagem">Área: Tatuagem</option>
            <option value="piercing">Área: Piercing</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gradient-to-b from-gold-strong to-gold px-4 py-2 text-sm font-medium text-neutral-950 hover:to-copper disabled:opacity-60"
          >
            {pending ? "Criando..." : "Adicionar curso"}
          </button>
          {state.error && <p className="w-full text-sm text-red-400">{state.error}</p>}
        </form>
      </div>
    </details>
  );
}
