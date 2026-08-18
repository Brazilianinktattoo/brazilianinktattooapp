import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { CourseEnrollment, CoursePayment, CourseReceipt } from "@/lib/types/database";
import { getCourseClassOrNotFound } from "../get-course-class";
import { PaymentCard } from "./payment-card";

export default async function PagamentoPage(
  props: PageProps<"/cursos/[tipo]/turmas/[turmaId]/pagamento">
) {
  const { tipo, turmaId } = await props.params;
  await requireAdmin();
  const { supabase, courseType, courseClass } = await getCourseClassOrNotFound(
    tipo,
    turmaId
  );

  const { data: enrollments } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_class_id", courseClass.id)
    .order("signed_up_at", { ascending: true })
    .returns<CourseEnrollment[]>();

  const list = enrollments ?? [];
  const ids = list.map((e) => e.id);

  const { data: payments } = ids.length
    ? await supabase
        .from("course_payments")
        .select("*")
        .in("enrollment_id", ids)
        .returns<CoursePayment[]>()
    : { data: [] as CoursePayment[] };

  const paymentsByEnrollment = new Map<string, CoursePayment[]>();
  for (const p of payments ?? []) {
    const arr = paymentsByEnrollment.get(p.enrollment_id) ?? [];
    arr.push(p);
    paymentsByEnrollment.set(p.enrollment_id, arr);
  }

  const paymentIds = (payments ?? []).map((p) => p.id);
  const { data: receipts } = paymentIds.length
    ? await supabase
        .from("course_receipts")
        .select("*")
        .in("course_payment_id", paymentIds)
        .returns<CourseReceipt[]>()
    : { data: [] as CourseReceipt[] };

  const receiptByPayment: Record<string, CourseReceipt> = {};
  for (const r of receipts ?? []) receiptByPayment[r.course_payment_id] = r;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/cursos/${courseType}/turmas/${courseClass.id}`}
          className="text-sm text-neutral-500 hover:text-white"
        >
          ← {courseClass.name}
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-white">Controle de Pagamento</h1>
        <p className="text-neutral-400">
          Sinal (reserva de vaga) e pagamento final, com abatimento automático
          do sinal já pago.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {list.map((e) => (
          <PaymentCard
            key={e.id}
            enrollment={e}
            payments={paymentsByEnrollment.get(e.id) ?? []}
            priceTotal={courseClass.price_total}
            depositPercentage={courseClass.deposit_percentage}
            receiptByPayment={receiptByPayment}
          />
        ))}
        {list.length === 0 && (
          <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-500">
            Nenhuma inscrição ainda.
          </p>
        )}
      </div>
    </div>
  );
}
