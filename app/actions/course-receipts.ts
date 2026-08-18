"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { STUDIO_TZ } from "@/lib/date";
import { renderCourseReceiptPdf } from "@/lib/documents/course-receipt";
import { CONTRACT_VARIANTS } from "@/lib/contracts/course-contract";
import type { CourseEnrollment, CoursePayment, CourseType } from "@/lib/types/database";

const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  tatuagem_iniciante: "Curso de Tatuagem para Iniciantes",
  tatuagem_especializacao: "Curso de Especialização em Tatuagem",
  piercing_iniciante: "Curso de Piercing para Iniciantes",
  piercing_especializacao: "Curso de Especialização em Piercing",
};

function courseDisplayName(courseType: CourseType) {
  return CONTRACT_VARIANTS[courseType]?.courseTitle ?? COURSE_TYPE_LABEL[courseType];
}

function dateExtenso(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STUDIO_TZ,
  });
}

export type GenerateReceiptState = {
  error?: string;
  success?: boolean;
  token?: string;
};

export async function generateCourseReceipt(
  _prevState: GenerateReceiptState,
  formData: FormData
): Promise<GenerateReceiptState> {
  const { user } = await requireAdmin();
  const payment_id = String(formData.get("payment_id") ?? "");
  if (!payment_id) return { error: "Pagamento inválido." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("course_receipts")
    .select("access_token")
    .eq("course_payment_id", payment_id)
    .maybeSingle();

  if (existing) return { success: true, token: existing.access_token };

  const { data: payment } = await supabase
    .from("course_payments")
    .select("*, enrollment:course_enrollments(*, course_class:course_classes(course_type))")
    .eq("id", payment_id)
    .maybeSingle<
      CoursePayment & {
        enrollment: (CourseEnrollment & { course_class: { course_type: CourseType } | null }) | null;
      }
    >();

  if (!payment || !payment.enrollment) return { error: "Pagamento não encontrado." };

  const pdf = await renderCourseReceiptPdf({
    studentName: payment.enrollment.full_name,
    cpf: payment.enrollment.cpf,
    address: payment.enrollment.address,
    cep: "",
    amount: payment.amount,
    courseName: payment.enrollment.course_class
      ? courseDisplayName(payment.enrollment.course_class.course_type)
      : "Curso",
    dateExtenso: dateExtenso(new Date(payment.paid_at)),
  });

  const admin = createAdminClient();
  const file_path = `recibos/${payment.id}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("documentos")
    .upload(file_path, pdf, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Não foi possível gerar o PDF do recibo." };

  const { data: created, error } = await supabase
    .from("course_receipts")
    .insert({ course_payment_id: payment_id, file_path, created_by: user.id })
    .select("access_token")
    .single();

  if (error || !created) return { error: "Não foi possível salvar o recibo." };

  revalidatePath("/cursos");
  return { success: true, token: created.access_token };
}

export async function getReceiptPdfUrl(filePath: string) {
  await requireProfile();
  const admin = createAdminClient();
  const { data } = await admin.storage.from("documentos").createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}
