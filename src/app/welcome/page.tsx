"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function WelcomePage() {
  const [nombre, setNombre] = useState<string>("");

  useEffect(() => {
    const obtenerPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .single();

      if (!error && data) setNombre(data.nombre);
    };

    obtenerPerfil();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="bg-white/70 backdrop-blur-lg shadow-2xl rounded-3xl p-10 w-[90%] max-w-md text-center border border-white/30"
      >
        <motion.h1
          className="text-3xl font-bold text-blue-900 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          ¡Bienvenido{nombre ? `, ${nombre}` : ""}! 👋
        </motion.h1>

        <p className="text-gray-700 text-sm mb-6">
          Has iniciado sesión correctamente en el sistema del <br />
          <span className="font-semibold text-blue-700">
            Laboratorio Dental SmartLab
          </span>
        </p>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all duration-200"
          >
            Ir al Panel Principal
          </Link>
        </motion.div>

        <p className="text-xs text-gray-500 mt-6">
          Sistema desarrollado con ❤️ usando Next.js + Supabase
        </p>
      </motion.div>
    </div>
  );
}
