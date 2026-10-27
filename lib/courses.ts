import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function fetchCourses(supabase: SupabaseServerClient): Promise<Course[]> {
  const { data } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order")
    .order("name")
    .returns<Course[]>();
  return data ?? [];
}

export function courseLabelMap(courses: Course[]): Record<string, string> {
  return Object.fromEntries(courses.map((c) => [c.slug, c.name]));
}

export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}
