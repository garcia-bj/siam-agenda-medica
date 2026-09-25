"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingSchema, type BookingFormData } from "@/features/booking/schema";
import { useCreateAppointment } from "@/features/booking/hooks/useCreateAppointment";
import { ApiClientError } from "@/lib/api/client";
import type { Specialty } from "@/types/api";

const specialties: { value: Specialty; label: string }[] = [
  { value: "MEDICINA_GENERAL", label: "Medicina general" }, { value: "PEDIATRIA", label: "Pediatría" }, { value: "CARDIOLOGIA", label: "Cardiología" }, { value: "DERMATOLOGIA", label: "Dermatología" },
];
const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

export function BookingForm() {
  const [success, setSuccess] = useState(false); const [conflict, setConflict] = useState(false);
  const mutation = useCreateAppointment();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<BookingFormData>({ resolver: zodResolver(bookingSchema) as never, defaultValues: { specialty: "MEDICINA_GENERAL" as Specialty, slot: "" } });
  const specialty = watch("specialty"); const slot = watch("slot");
  const today = new Date(); const date = today.toISOString().slice(0, 10);
  const onSubmit = async (values: BookingFormData) => { setConflict(false); try { await mutation.mutateAsync({ patientName: values.patientName, patientEmail: values.patientEmail, specialty: values.specialty, startTime: `${date}T${values.slot}:00-04:00` }); setSuccess(true); reset(); setTimeout(() => setSuccess(false), 5000); } catch (error) { if (error instanceof ApiClientError && error.status === 409) setConflict(true); } };
  return <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><label htmlFor="patientName" className="text-sm font-semibold">Nombre completo</label><input id="patientName" {...register("patientName")} className={`mt-1 h-12 w-full rounded-lg border px-3 ${errors.patientName ? "border-red-500" : "border-slate-300"}`} />{errors.patientName && <p className="mt-1 text-sm text-red-600">{errors.patientName.message}</p>}</div><div><label htmlFor="patientEmail" className="text-sm font-semibold">Email</label><input id="patientEmail" type="email" {...register("patientEmail")} className={`mt-1 h-12 w-full rounded-lg border px-3 ${errors.patientEmail ? "border-red-500" : "border-slate-300"}`} />{errors.patientEmail && <p className="mt-1 text-sm text-red-600">{errors.patientEmail.message}</p>}</div><div><label htmlFor="specialty" className="text-sm font-semibold">Especialidad</label><select id="specialty" {...register("specialty")} className="mt-1 h-12 w-full rounded-lg border border-slate-300 bg-white px-3">{specialties.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>{errors.specialty && <p className="mt-1 text-sm text-red-600">{errors.specialty.message}</p>}</div><fieldset><legend className="text-sm font-semibold">Horario</legend><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.map(s => <button key={s} type="button" aria-pressed={slot === s} onClick={() => setValue("slot", s, { shouldValidate: true })} className={`min-h-11 rounded-lg border text-sm font-medium ${slot === s ? "border-[#0F766E] bg-[#0F766E] text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`}>{s}</button>)}</div>{errors.slot && <p className="mt-1 text-sm text-red-600">{errors.slot.message}</p>}</fieldset>{slot && <div className="rounded-lg bg-slate-50 p-3 text-sm">Fecha y hora: <strong>{new Date(`${date}T${slot}:00`).toLocaleDateString("es-BO", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · {slot} – {String(Number(slot.slice(0, 2)) + (slot.endsWith("30") ? 1 : 0)).padStart(2, "0")}:{slot.endsWith("30") ? "00" : "30"}</strong></div>}{conflict && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Ese horario acaba de ser tomado</div>}{success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Cita confirmada · <a className="font-semibold underline" href="/citas">Ver en Citas</a></div>}<button disabled={isSubmitting} className="min-h-12 w-full rounded-lg bg-[#0F766E] px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Confirmando…" : "Confirmar cita"}</button></form>;
}
