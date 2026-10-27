import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { courseLabelMap, fetchCourses } from "@/lib/courses";
import type { CourseClass, CourseType } from "@/lib/types/database";

export async function getCourseClassOrNotFound(tipo: string, turmaId: string) {
  const supabase = await createClient();
  const courses = await fetchCourses(supabase);
  if (!courses.some((c) => c.slug === tipo)) notFound();
  const courseType = tipo as CourseType;
  const courseLabel = courseLabelMap(courses)[tipo];
  const { data: courseClass } = await supabase
    .from("course_classes")
    .select("*")
    .eq("id", turmaId)
    .eq("course_type", courseType)
    .maybeSingle<CourseClass>();

  if (!courseClass) notFound();

  return { supabase, courseType, courseClass, courseLabel };
}
