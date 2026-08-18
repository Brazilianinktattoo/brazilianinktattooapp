import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COURSE_TYPES } from "@/lib/cursos";
import type { CourseClass, CourseType } from "@/lib/types/database";

export async function getCourseClassOrNotFound(tipo: string, turmaId: string) {
  if (!COURSE_TYPES.includes(tipo as CourseType)) notFound();
  const courseType = tipo as CourseType;

  const supabase = await createClient();
  const { data: courseClass } = await supabase
    .from("course_classes")
    .select("*")
    .eq("id", turmaId)
    .eq("course_type", courseType)
    .maybeSingle<CourseClass>();

  if (!courseClass) notFound();

  return { supabase, courseType, courseClass };
}
