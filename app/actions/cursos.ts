"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SEAT_HOLDING_STATUSES } from "@/lib/cursos";
import { STUDIO_TZ } from "@/lib/date";
import { hasContractTemplate, renderCourseContractPdf } from "@/lib/contracts/course-contract";
import type {
  CourseType,
  CourseClass,
  CourseContract,
  CourseEnrollment,
  CoursePaymentType,
  EnrollmentStatus,
} from "@/lib/types/database";

function dateExtenso(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: STUDIO_TZ,
  });
}

function dateTimeLabel(d: Date) {
  const date = d.toLocaleDateString("pt-BR", { timeZone: STUDIO_TZ });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STUDIO_TZ,
  });
  return `${date} às ${time}`;
}

const COURSE_TYPES: CourseType[] = [
  "tatuagem_iniciante",
  "tatuagem_especializacao",
  "piercing_iniciante",
  "piercing_especializacao",
];

// -- Turmas ------------------------------------------------------------------

export type CourseClassFormState = {
  error?: string;
  success?: boolean;
};

export async function createCourseClass(
  _prevState: CourseClassFormState,
  formData: FormData
): Promise<CourseClassFormState> {
  const { user } = await requireAdmin();

  const course_type = String(formData.get("course_type") ?? "") as CourseType;
  const name = String(formData.get("name") ?? "").trim();
  const start_date_raw = String(formData.get("start_date") ?? "");
  const max_seats_raw = String(formData.get("max_seats") ?? "");
  const price_total_raw = String(formData.get("price_total") ?? "").replace(",", ".");
  const deposit_percentage_raw = String(
    formData.get("deposit_percentage") ?? "15"
  ).replace(",", ".");

  if (!COURSE_TYPES.includes(course_type)) {
    return { error: "Tipo de curso inválido." };
  }
  if (!name) return { error: "Dê um nome para a turma." };

  const max_seats = Number(max_seats_raw);
  if (!Number.isInteger(max_seats) || max_seats <= 0) {
    return { error: "Número de vagas inválido." };
  }
  const price_total = Number(price_total_raw);
  if (Number.isNaN(price_total) || price_total < 0) {
    return { error: "Valor total do curso inválido." };
  }
  const deposit_percentage = Number(deposit_percentage_raw);
  if (Number.isNaN(deposit_percentage) || deposit_percentage <= 0 || deposit_percentage > 100) {
    return { error: "Percentual do sinal inválido (0 a 100)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("course_classes").insert({
    course_type,
    name,
    start_date: start_date_raw || null,
    max_seats,
    price_total,
    deposit_percentage,
    created_by: user.id,
  });

  if (error) return { error: "Não foi possível criar a turma." };

  revalidatePath(`/cursos/${course_type}`);
  return { success: true };
}

export async function setCourseClassActive(id: string, active: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("course_classes").update({ active }).eq("id", id);
  revalidatePath("/cursos", "layout");
}

// -- Ficha de Inscrição: link + submissão pública -----------------------------

export type SignupLinkState = {
  error?: string;
  success?: boolean;
  token?: string;
};

export async function generateSignupLink(
  _prevState: SignupLinkState,
  formData: FormData
): Promise<SignupLinkState> {
  const { user } = await requireAdmin();
  const course_class_id = String(formData.get("course_class_id") ?? "");
  if (!course_class_id) return { error: "Turma inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_signup_links")
    .insert({ course_class_id, created_by: user.id })
    .select("token")
    .single();

  if (error || !data) return { error: "Não foi possível gerar o link." };

  revalidatePath("/cursos", "layout");
  return { success: true, token: data.token };
}

export type CourseSignupState = {
  error?: string;
  success?: boolean;
  waitlisted?: boolean;
};

// Rota pública (sem sessão) — usa service_role porque o lead nunca loga.
export async function submitCourseSignup(
  token: string,
  _prevState: CourseSignupState,
  formData: FormData
): Promise<CourseSignupState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const rg = String(formData.get("rg") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();

  if (!full_name || !email || !phone) {
    return { error: "Preencha nome, e-mail e telefone." };
  }

  const admin = createAdminClient();

  const { data: link } = await admin
    .from("course_signup_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!link) return { error: "Link inválido." };
  if (link.used_at) return { error: "Este link de inscrição já foi utilizado." };

  const { data: courseClass } = await admin
    .from("course_classes")
    .select("*")
    .eq("id", link.course_class_id)
    .maybeSingle();

  if (!courseClass || !courseClass.active) {
    return { error: "Esta turma não está mais aceitando inscrições." };
  }

  const { count: seatCount } = await admin
    .from("course_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_class_id", courseClass.id)
    .in("status", SEAT_HOLDING_STATUSES);

  const isFull = (seatCount ?? 0) >= courseClass.max_seats;

  let waitlist_position: number | null = null;
  if (isFull) {
    const { data: lastInLine } = await admin
      .from("course_enrollments")
      .select("waitlist_position")
      .eq("course_class_id", courseClass.id)
      .eq("status", "lista_espera")
      .order("waitlist_position", { ascending: false })
      .limit(1)
      .maybeSingle();
    waitlist_position = (lastInLine?.waitlist_position ?? 0) + 1;
  }

  const { data: enrollment, error: enrollError } = await admin
    .from("course_enrollments")
    .insert({
      course_class_id: courseClass.id,
      signup_link_id: link.id,
      full_name,
      email,
      phone,
      cpf,
      rg,
      address,
      state,
      status: isFull ? "lista_espera" : "inscrito",
      waitlist_position,
    })
    .select("id")
    .single();

  if (enrollError || !enrollment) {
    return { error: "Não foi possível enviar sua inscrição. Fale com o estúdio." };
  }

  await admin
    .from("course_signup_links")
    .update({ used_at: new Date().toISOString(), enrollment_id: enrollment.id })
    .eq("id", link.id);

  return { success: true, waitlisted: isFull };
}

// -- Controle de Pagamento ----------------------------------------------------

export type PaymentFormState = {
  error?: string;
  success?: boolean;
};

export async function recordPayment(
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const { user } = await requireAdmin();

  const enrollment_id = String(formData.get("enrollment_id") ?? "");
  const type = String(formData.get("type") ?? "") as CoursePaymentType;
  const amount_raw = String(formData.get("amount") ?? "").replace(",", ".");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!enrollment_id) return { error: "Inscrição inválida." };
  if (type !== "sinal" && type !== "final") return { error: "Tipo de pagamento inválido." };

  const amount = Number(amount_raw);
  if (Number.isNaN(amount) || amount <= 0) return { error: "Valor inválido." };

  const supabase = await createClient();

  const { error } = await supabase.from("course_payments").insert({
    enrollment_id,
    type,
    amount,
    notes,
    created_by: user.id,
  });
  if (error) return { error: "Não foi possível registrar o pagamento." };

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("status, course_class_id")
    .eq("id", enrollment_id)
    .single();

  if (enrollment && enrollment.status !== "desistente") {
    if (type === "final") {
      await supabase
        .from("course_enrollments")
        .update({ status: "matriculado" })
        .eq("id", enrollment_id);
    } else if (type === "sinal" && enrollment.status === "convocado") {
      // aluno convocado da lista de espera paga o sinal e passa a ocupar a
      // vaga de fato — reinicia a própria janela de arrependimento a partir
      // de agora, já que só entrou na turma neste momento.
      await supabase
        .from("course_enrollments")
        .update({ status: "inscrito", signed_up_at: new Date().toISOString() })
        .eq("id", enrollment_id);
    }
  }

  revalidatePath("/cursos", "layout");
  return { success: true };
}

// -- Status manual (ex: marcar desistência) -----------------------------------

export async function setEnrollmentStatus(id: string, status: EnrollmentStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("course_enrollments").update({ status }).eq("id", id);
  revalidatePath("/cursos", "layout");
}

// -- Contrato ------------------------------------------------------------------

export async function saveContractText(enrollmentId: string, content: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("course_contracts").upsert(
    {
      enrollment_id: enrollmentId,
      content,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "enrollment_id" }
  );
  revalidatePath("/cursos", "layout");
}

export type ContractUploadState = {
  error?: string;
  success?: boolean;
};

export async function uploadContractFile(
  _prevState: ContractUploadState,
  formData: FormData
): Promise<ContractUploadState> {
  await requireAdmin();
  const enrollment_id = String(formData.get("enrollment_id") ?? "");
  const file = formData.get("file");

  if (!enrollment_id) return { error: "Inscrição inválida." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  const supabase = await createClient();
  const path = `${enrollment_id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("contratos")
    .upload(path, file, { upsert: true });
  if (uploadError) return { error: "Não foi possível enviar o arquivo." };

  await supabase.from("course_contracts").upsert(
    {
      enrollment_id,
      file_path: path,
      signed: true,
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "enrollment_id" }
  );

  revalidatePath("/cursos", "layout");
  return { success: true };
}

export async function getContractFileUrl(filePath: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("contratos")
    .createSignedUrl(filePath, 60 * 10);
  return data?.signedUrl ?? null;
}

// -- Contrato automático (preenchimento + PDF + assinatura digital) ----------
// Só disponível pra tatuagem_iniciante por enquanto — é o único curso cujo
// modelo de contrato real foi enviado. Os outros 3 continuam no fluxo manual
// (saveContractText / uploadContractFile acima) até o modelo de cada um
// chegar.

export type GenerateContractState = {
  error?: string;
  success?: boolean;
  token?: string;
};

export async function generateAutoContract(
  _prevState: GenerateContractState,
  formData: FormData
): Promise<GenerateContractState> {
  await requireAdmin();
  const enrollment_id = String(formData.get("enrollment_id") ?? "");
  if (!enrollment_id) return { error: "Inscrição inválida." };

  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("course_enrollments")
    .select("*, course_class:course_classes(*)")
    .eq("id", enrollment_id)
    .maybeSingle<CourseEnrollment & { course_class: CourseClass | null }>();

  if (!enrollment || !enrollment.course_class) {
    return { error: "Inscrição não encontrada." };
  }
  if (!hasContractTemplate(enrollment.course_class.course_type)) {
    return { error: "Contrato automático ainda não está disponível para este curso." };
  }

  const { data: existing } = await supabase
    .from("course_contracts")
    .select("id, signed, sign_token")
    .eq("enrollment_id", enrollment_id)
    .maybeSingle();

  if (existing?.signed) {
    return { error: "Este contrato já foi assinado — não é possível gerar de novo." };
  }

  const pdf = await renderCourseContractPdf(enrollment.course_class.course_type, {
    studentName: enrollment.full_name,
    rg: enrollment.rg,
    cpf: enrollment.cpf,
    address: enrollment.address,
    state: enrollment.state,
    dateExtenso: dateExtenso(new Date()),
    signed: false,
  });

  const path = `${enrollment_id}/contrato-gerado.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("contratos")
    .upload(path, pdf, { upsert: true, contentType: "application/pdf" });
  if (uploadError) return { error: "Não foi possível gerar o PDF do contrato." };

  const { data: contract, error: upsertError } = await supabase
    .from("course_contracts")
    .upsert(
      { enrollment_id, file_path: path, generated_at: new Date().toISOString(), signed: false },
      { onConflict: "enrollment_id" }
    )
    .select("sign_token")
    .single();

  if (upsertError || !contract) return { error: "Não foi possível salvar o contrato." };

  revalidatePath("/cursos", "layout");
  return { success: true, token: contract.sign_token };
}

export type SignatureState = {
  error?: string;
  success?: boolean;
};

// Rota pública (sem sessão) — o link/token é a credencial, como no resto do
// módulo de cursos.
export async function submitContractSignature(
  token: string,
  _prevState: SignatureState,
  formData: FormData
): Promise<SignatureState> {
  const signer_name = String(formData.get("signer_name") ?? "").trim();
  const agree = formData.get("agree");

  if (!signer_name) return { error: "Informe seu nome completo." };
  if (!agree) return { error: "Confirme que leu e concorda com os termos do contrato." };

  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("course_contracts")
    .select("*, enrollment:course_enrollments(*, course_class:course_classes(*))")
    .eq("sign_token", token)
    .maybeSingle<
      CourseContract & {
        enrollment: (CourseEnrollment & { course_class: CourseClass | null }) | null;
      }
    >();

  if (!contract || !contract.enrollment || !contract.enrollment.course_class) {
    return { error: "Link inválido." };
  }
  if (contract.signed) return { error: "Este contrato já foi assinado." };
  if (!hasContractTemplate(contract.enrollment.course_class.course_type)) {
    return { error: "Assinatura automática indisponível para este curso." };
  }

  const now = new Date();
  const pdf = await renderCourseContractPdf(contract.enrollment.course_class.course_type, {
    studentName: contract.enrollment.full_name,
    rg: contract.enrollment.rg,
    cpf: contract.enrollment.cpf,
    address: contract.enrollment.address,
    state: contract.enrollment.state,
    dateExtenso: dateExtenso(now),
    signed: true,
    signerName: signer_name,
    signedAtLabel: dateTimeLabel(now),
  });

  const path = `${contract.enrollment_id}/contrato-assinado.pdf`;
  const { error: uploadError } = await admin.storage
    .from("contratos")
    .upload(path, pdf, { upsert: true, contentType: "application/pdf" });
  if (uploadError) return { error: "Não foi possível salvar o contrato assinado." };

  const { error: updateError } = await admin
    .from("course_contracts")
    .update({
      file_path: path,
      signed: true,
      signed_at: now.toISOString(),
      signer_name,
    })
    .eq("id", contract.id);

  if (updateError) return { error: "Não foi possível registrar a assinatura." };

  return { success: true };
}

// Usado pela própria página pública de assinatura — sem sessão, então usa
// service_role; o token já é a validação de acesso.
export async function getPublicContractFileUrl(token: string) {
  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("course_contracts")
    .select("file_path")
    .eq("sign_token", token)
    .maybeSingle();
  if (!contract?.file_path) return null;
  const { data } = await admin.storage
    .from("contratos")
    .createSignedUrl(contract.file_path, 60 * 10);
  return data?.signedUrl ?? null;
}
