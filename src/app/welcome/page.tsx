"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";

export default function WelcomePage() {
  const [nombre, setNombre] = useState<string>("");

  useEffect(() => {
    const obtenerPerfil = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.nombre) setNombre(data.nombre);
    };

    obtenerPerfil();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3C1C6C] via-[#2A134E] to-[#16072B] flex items-center justify-center p-6 text-white relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#A57CFA]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 sm:p-10 w-full max-w-md text-center relative z-10"
      >
        <div className="flex justify-center mb-6">
          <Image
            src="/images/brand/guisela-logo-secondary-dark.png"
            alt="Guisela Laboratorio Dental"
            width={240}
            height={70}
            className="h-14 w-auto object-contain"
            priority
          />
        </div>

        <motion.h1
          className="text-2xl font-bold text-white mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          ¡Bienvenido{nombre ? `, ${nombre}` : ""}! 👋
        </motion.h1>

        <p className="text-purple-200/90 text-sm mb-6 leading-relaxed">
          Has iniciado sesión en el sistema integral de <br />
          <span className="font-semibold text-white">Guisela Laboratorio Dental</span>.
        </p>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#A57CFA] to-[#8C52FF] text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-950/40 hover:opacity-95 transition-all text-sm"
          >
            <span>Ir al Panel de Control</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <p className="text-[11px] text-purple-300/60 mt-6">
          Precisión digital CAD/CAM & estética dental personalizada
        </p>
      </motion.div>
    </div>
  );
}
