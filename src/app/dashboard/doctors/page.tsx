"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  ClipboardList,
  Clock,
  CheckCircle2,
  Package,
  Building2,
  Phone,
  Stethoscope,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function DoctorHomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [stats, setStats] = useState({
    enRevision: 0,
    enProceso: 0,
    listos: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDoctorData() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Perfil
      const { data: prof } = await supabase
        .from("profiles")
        .select("nombre, telefono, rol")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(prof);

      // Info clínica en doctores
      const { data: doc } = await supabase
        .from("doctores")
        .select("id, clinica, especialidad")
        .eq("profile_id", user.id)
        .maybeSingle();

      setDoctorInfo(doc);

      // Cargar conteo de pedidos del doctor
      const query = supabase.from("pedidos").select("estado, total, anticipo");
      if (doc?.id) {
        query.or(`doctor_id.eq.${doc.id},creado_por.eq.${user.id}`);
      } else {
        query.eq("creado_por", user.id);
      }

      const { data: orders } = await query;

      if (orders) {
        let rev = 0;
        let proc = 0;
        let done = 0;

        orders.forEach((o) => {
          const st = (o.estado || "").toLowerCase();
          if (st === "pendiente_revision") rev++;
          else if (st === "pendiente" || st === "en_proceso") proc++;
          else if (st === "finalizado" || st === "entregado") done++;
        });

        setStats({
          enRevision: rev,
          enProceso: proc,
          listos: done,
          total: orders.length,
        });
      }

      setLoading(false);
    }

    loadDoctorData();
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="rounded-3xl border border-purple-200/60 bg-gradient-to-r from-[#3C1C6C] via-[#4F268F] to-[#6934BC] p-6 sm:p-8 text-white shadow-xl shadow-purple-950/10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#D0B9FF] border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" /> Portal Odontológico · Guisela
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bienvenido, Dr(a). {profile?.nombre || "Colega"}
          </h1>
          <p className="text-sm text-purple-200/80 max-w-xl">
            {doctorInfo?.clinica || "Clínica Odontológica"} ·{" "}
            {doctorInfo?.especialidad || "Rehabilitación Oral"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/doctors/new-order">
            <Button className="bg-white text-[#3C1C6C] hover:bg-purple-50 font-bold px-5 py-2.5 rounded-xl shadow-md gap-2">
              <PlusCircle className="w-4 h-4 text-[#3C1C6C]" /> Nueva Orden
            </Button>
          </Link>
          <Link href="/dashboard/doctors/orders">
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-5 py-2.5 rounded-xl gap-2"
            >
              <ClipboardList className="w-4 h-4" /> Ver Mis Pedidos
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>En Revisión</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            <div className="text-3xl font-extrabold text-amber-600">
              {stats.enRevision}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Esperando cotización del laboratorio
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>En Fabricación</span>
              <Package className="w-4 h-4 text-purple-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            <div className="text-3xl font-extrabold text-[#3C1C6C]">
              {stats.enProceso}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Avanzando en estaciones técnicas
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Listos / Entregados</span>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            <div className="text-3xl font-extrabold text-green-600">
              {stats.listos}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Trabajos finalizados con éxito
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Historial Total</span>
              <ClipboardList className="w-4 h-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-5 pb-5">
            <div className="text-3xl font-extrabold text-slate-800">
              {stats.total}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Casos clínicos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Datos de la Clínica y Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#3C1C6C]" /> Ficha de la Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Doctor Titular:</span>
              <span className="font-semibold text-slate-800">{profile?.nombre || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Clínica:</span>
              <span className="font-semibold text-slate-800">{doctorInfo?.clinica || "—"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Especialidad:</span>
              <span className="font-semibold text-slate-800">{doctorInfo?.especialidad || "—"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Teléfono registrado:</span>
              <span className="font-semibold text-slate-800">{profile?.telefono || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 shadow-sm bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-[#3C1C6C] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#A57CFA]" /> Flujo de Trabajo en Laboratorio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <p className="leading-relaxed">
              Cada requerimiento ingresado pasa por nuestro riguroso protocolo de calidad:
            </p>
            <ol className="list-decimal pl-4 space-y-2 text-slate-700 font-medium">
              <li><strong className="text-slate-900">Validación:</strong> Secretaría revisa datos clínicos y confirma especificaciones.</li>
              <li><strong className="text-slate-900">Escaneo & CAD 3D:</strong> Modelado computarizado con ajuste marginal &lt;15µm.</li>
              <li><strong className="text-slate-900">Fresado & Sinterizado:</strong> Maquinado de 5 ejes en zirconio multicapa.</li>
              <li><strong className="text-slate-900">Cerámica & Glaze:</strong> Caracterización estética con guía VITA.</li>
              <li><strong className="text-slate-900">Control & Entrega:</strong> Empaque esterilizado y remisión detallada.</li>
            </ol>
            <div className="pt-2">
              <Link
                href="/dashboard/doctors/orders"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3C1C6C] hover:text-[#52298F]"
              >
                Rastrear mis piezas en tiempo real <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
