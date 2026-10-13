"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Layers,
  Clock,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Microscope,
  Phone,
  Mail,
  MapPin,
  LogIn,
  UserPlus,
  Play,
  Award,
  BadgeCheck,
  Activity,
  Maximize2,
  Calendar,
  Eye,
  Check,
} from "lucide-react";

interface GalleryItem {
  id: string;
  tag: string;
  title: string;
  category: string;
  desc: string;
  image: string;
  badge: string;
}

const galleryItems: GalleryItem[] = [
  {
    id: "cadcam",
    tag: "digital",
    title: "Diseño CAD 3D & Fresado Robótico",
    category: "Flujo Digital Intraoral",
    desc: "Estación de diseño digital exocad y fresadora de 5 ejes para mecanizado de zirconio multicapa con ajuste marginal inferior a 15 micras.",
    image: "/images/gallery/digital-cadcam.jpg",
    badge: "Centro Digital 3D",
  },
  {
    id: "zirconia",
    tag: "zirconio",
    title: "Coronas & Puentes en Zirconio Multicapa",
    category: "Crown & Bridge",
    desc: "Ajuste pasivo y anatómico sobre modelo maestro seccionado. Translucidez gradual desde el cuello hasta el borde incisal natural.",
    image: "/images/gallery/zirconia-crowns.jpg",
    badge: "Crown & Bridge",
  },
  {
    id: "ceramica",
    tag: "ceramica",
    title: "Estratificación & Arte Cerámico Artesanal",
    category: "Estética Biomimética",
    desc: "Maestro ceramista aplicando micro-capas de porcelana y pigmentos finos con pincel Kolinsky para mamelones y textura superficial viva.",
    image: "/images/gallery/ceramic-artisan.jpg",
    badge: "Estratificación Manual",
  },
  {
    id: "implantes",
    tag: "implantes",
    title: "Rehabilitación Compleja sobre Implantes",
    category: "Implant Prosthetics",
    desc: "Estructura fresada en titanio grado médico con muñones individuales y caracterización gingival para sobredentaduras y All-on-4.",
    image: "/images/gallery/implant-prosthetics.jpg",
    badge: "Implantología Avanzada",
  },
];

export default function LandingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState("todos");
  const [isPaused, setIsPaused] = useState(false);

  // Filtrado de items
  const filteredItems = activeFilter === "todos"
    ? galleryItems
    : galleryItems.filter((item) => item.tag === activeFilter);

  // Autoplay respetando pausa
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, filteredItems.length]);

  const activeItem = filteredItems[currentIndex] || filteredItems[0];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-slate-800 font-sans selection:bg-[#A57CFA] selection:text-white">
      {/* ========================================================= */}
      {/* 1. NAVBAR SUPERIOR — Logo Primario a Color */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-purple-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Primario Oficial */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-13 w-52 sm:w-60 flex items-center">
              <Image
                src="/images/brand/guisela-logo-primary.png"
                alt="Guisela Laboratorio Dental"
                width={280}
                height={85}
                className="h-13 w-auto object-contain group-hover:scale-102 transition-transform"
                priority
                unoptimized
              />
            </div>
          </Link>

          {/* Menú de Navegación */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#servicios" className="hover:text-[#3C1C6C] transition-colors">
              Servicios
            </a>
            <a href="#galeria" className="hover:text-[#3C1C6C] transition-colors">
              Galería Real
            </a>
            <a href="#flujo" className="hover:text-[#3C1C6C] transition-colors">
              5 Estaciones
            </a>
            <a href="#alianza" className="hover:text-[#3C1C6C] transition-colors">
              Para Clínicas
            </a>
            <a href="#contacto" className="hover:text-[#3C1C6C] transition-colors">
              Contacto
            </a>
          </nav>

          {/* Botones de Acceso */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#3C1C6C] bg-purple-50/80 hover:bg-purple-100 border border-purple-200/80 transition-all shadow-xs"
            >
              <LogIn className="w-4 h-4 text-[#3C1C6C]" />
              <span className="hidden sm:inline">Portal Doctores</span>
              <span className="sm:hidden">Ingresar</span>
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#3C1C6C] hover:bg-[#2C1450] shadow-md shadow-purple-950/20 hover:shadow-lg transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Clínica</span>
              <span className="sm:hidden">Registro</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION — Fotografía Real CAD/CAM + Emblema Invertido */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        {/* Glow de fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#D0B9FF]/30 via-[#A57CFA]/10 to-transparent blur-3xl -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Mensaje Principal */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/90 border border-[#A57CFA]/40 text-[#3C1C6C] text-xs font-bold tracking-wide uppercase shadow-xs mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
                Prótesis Dentales de Alta Complejidad • Flujo 100% Digital CAD/CAM
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#3C1C6C] tracking-tight leading-[1.12]">
                Donde la precisión científica se convierte en{" "}
                <span className="bg-gradient-to-r from-[#3C1C6C] via-[#A57CFA] to-[#3C1C6C] bg-clip-text text-transparent">
                  arte dental
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Especialistas en <strong>Crown & Bridge (Zirconio multicapa, E.max)</strong>,{" "}
                <strong>Implant Prosthetics</strong> y <strong>Flujo Digital Intraoral</strong> con trazabilidad en vivo por estación para clínicas y odontólogos.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-white bg-[#3C1C6C] hover:bg-[#2F1555] shadow-lg shadow-purple-950/25 hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
                >
                  <span>Portal de Pedidos & Tracking</span>
                  <ArrowRight className="w-5 h-5 text-[#A57CFA]" />
                </Link>

                <a
                  href="#galeria"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[#3C1C6C] bg-white hover:bg-purple-50 border border-purple-200 shadow-xs hover:border-purple-300 transition-all text-base"
                >
                  <Eye className="w-4 h-4 text-[#A57CFA]" />
                  <span>Ver Trabajos de Laboratorio</span>
                </a>
              </div>

              {/* Indicadores Clave */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-5 pt-8 border-t border-purple-100">
                <div>
                  <p className="text-3xl font-black text-[#3C1C6C]">+12 Años</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                    Trayectoria Protésica
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#3C1C6C]">100% Digital</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                    Escáneres STL / PLY
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#3C1C6C]">&lt; 15 µm</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                    Ajuste Marginal
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#3C1C6C]">Realtime</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                    Tracking por Estación
                  </p>
                </div>
              </div>
            </div>

            {/* Showcase Visual: Fotografía de Estudio CAD/CAM + Emblema Invertido */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden border-2 border-purple-200/80 shadow-2xl shadow-purple-950/15 bg-white p-3">
                <div className="relative rounded-2xl overflow-hidden aspect-16/11 bg-slate-900 group">
                  <Image
                    src="/images/gallery/digital-cadcam.jpg"
                    alt="Centro de Diseño CAD/CAM 3D y Fresado Robótico Guisela"
                    fill
                    className="object-cover object-center group-hover:scale-103 transition-transform duration-700"
                    priority
                    unoptimized
                  />
                  {/* Overlay gradiente muy sutil en la base */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1F0D36]/85 via-transparent to-transparent flex items-end p-5">
                    <div className="text-white">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#A57CFA] text-white tracking-wider">
                        Taller Central
                      </span>
                      <p className="text-base font-extrabold text-white mt-1.5 leading-snug">
                        Centro de Fresado Robótico & Diseño Exocad
                      </p>
                      <p className="text-xs text-purple-200 mt-0.5">
                        Mecanizado en bloques de Zirconio Monolítico y E.max
                      </p>
                    </div>
                  </div>

                  {/* Sello / Emblema Invertido en la esquina superior */}
                  <div className="absolute top-3 right-3 bg-[#3C1C6C]/85 backdrop-blur-md rounded-xl p-2 border border-[#A57CFA]/30 shadow-lg flex items-center gap-2">
                    <div className="relative w-7 h-7">
                      <Image
                        src="/images/brand/guisela-emblem-inverted.png"
                        alt="Emblema Guisela"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white tracking-wider uppercase pr-1">
                      Calidad Certificada
                    </span>
                  </div>
                </div>

                {/* 2 Badges Rápidos */}
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#3C1C6C] text-[#D0B9FF] flex items-center justify-center font-bold text-xs shrink-0">
                      5E
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#3C1C6C] truncate">Fresado 5 Ejes</p>
                      <p className="text-[10px] text-slate-500">Zirconio de alta pureza</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#A57CFA] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      🎨
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#3C1C6C] truncate">Estratificación</p>
                      <p className="text-[10px] text-slate-500">Pincel artesanal Kolinsky</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. GALERÍA CLÍNICA REAL — Fotos Macro en Alta Resolución */}
      {/* ========================================================= */}
      <section
        id="galeria"
        className="py-18 bg-white border-y border-purple-100 relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Encabezado y Filtros */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
                Fotografía Real del Taller
              </span>
              <h2 className="text-3xl font-black text-[#3C1C6C] tracking-tight mt-1">
                Galería de Trabajos y Casos Terminados
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Fotos reales de nuestras prótesis, coronas estratificadas y barras sobre implantes fabricadas en el laboratorio.
              </p>
            </div>

            {/* Pestañas de Filtro Interactivas */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "todos", label: "Ver Todas" },
                { key: "digital", label: "CAD/CAM 3D" },
                { key: "zirconio", label: "Zirconio" },
                { key: "ceramica", label: "Cerámica" },
                { key: "implantes", label: "Implantes" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(tab.key);
                    setCurrentIndex(0);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFilter === tab.key
                      ? "bg-[#3C1C6C] text-white shadow-sm"
                      : "bg-purple-50 text-slate-600 hover:bg-purple-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visor Principal del Carrusel — Altura fija garantizada */}
          <div
            className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px] min-h-[460px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-950 group"
            style={{ minHeight: "460px" }}
          >
            {filteredItems.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  {/* Imagen en Alta Definición limpia */}
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover object-center"
                    priority={idx === 0}
                    unoptimized
                  />

                  {/* Badge Flotante Superior */}
                  <div className="absolute top-5 left-5 z-20">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-[#3C1C6C]/90 text-white backdrop-blur-md border border-white/20 shadow-lg">
                      <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
                      {item.badge}
                    </span>
                  </div>

                  {/* Tarjeta de Información en la Esquina Inferior */}
                  <div className="absolute bottom-6 left-6 right-6 md:right-auto md:max-w-lg z-20 p-5 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/20 text-white shadow-2xl">
                    <span className="text-[11px] font-extrabold text-[#A57CFA] uppercase tracking-wider">
                      {item.category}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-1 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Flechas de Navegación Grandes y Accesibles */}
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Foto anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-13 h-13 rounded-full bg-white/95 hover:bg-white text-[#3C1C6C] shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Siguiente foto"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-13 h-13 rounded-full bg-white/95 hover:bg-white text-[#3C1C6C] shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="w-7 h-7 stroke-[2.5]" />
            </button>

            {/* Contador de Fotos */}
            <div className="absolute bottom-5 right-6 z-30 flex items-center gap-2">
              <span className="text-xs font-black text-white bg-black/75 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/20 shadow-md">
                {currentIndex + 1} / {filteredItems.length}
              </span>
            </div>
          </div>

          {/* Miniaturas de Acceso Rápido con Altura Explícita */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {filteredItems.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden border-2 transition-all p-3 flex flex-col justify-end text-left cursor-pointer group ${
                    isActive
                      ? "border-[#3C1C6C] ring-4 ring-[#A57CFA]/50 shadow-lg scale-101"
                      : "border-purple-200/80 hover:border-purple-400 opacity-80 hover:opacity-100"
                  }`}
                  style={{ minHeight: "96px" }}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  <span className="relative z-10 text-xs font-black text-white leading-tight drop-shadow-md">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SERVICIOS CLÍNICOS — Con Logo Monocromo como Marca de Agua */}
      {/* ========================================================= */}
      <section id="servicios" className="py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
              Catálogo de Especialidades
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#3C1C6C] tracking-tight mt-1">
              Servicios Clínicos del Laboratorio
            </h2>
            <p className="text-slate-600 mt-2 text-base">
              Estándares de confección basados en la ficha técnica oficial de Guisela Laboratorio Dental.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Crown & Bridge */}
            <div className="group rounded-3xl p-8 bg-white border border-purple-100/90 hover:border-[#A57CFA]/60 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden">
              {/* Marca de agua monocromo en la esquina */}
              <div className="absolute -bottom-6 -right-6 w-28 h-28 opacity-6 pointer-events-none">
                <Image
                  src="/images/brand/guisela-symbol-monochrome.png"
                  alt="Watermark"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-100/70 text-[#3C1C6C] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Award className="w-7 h-7 text-[#3C1C6C]" />
                </div>
                <h3 className="text-2xl font-black text-[#3C1C6C] tracking-tight">
                  Crown & Bridge
                </h3>
                <p className="text-xs font-bold text-[#A57CFA] uppercase tracking-wider mt-1 mb-3">
                  Coronas & Puentes Zirconio / Disilicato
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Confección de coronas anatómicas y estratificadas en Zirconio multicapa de alta translucidez y Disilicato de Litio (IPS e.max). Adaptación marginal precisa para preservar el muñón dental.
                </p>
                <ul className="mt-5 space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Zirconio monolítico ultratranslúcido
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Inlays, Onlays y Carillas estéticas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Colorímetro Vita 3D Master / Classical
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-5 border-t border-purple-50">
                <Link
                  href="/login"
                  className="text-xs font-extrabold text-[#3C1C6C] hover:text-[#A57CFA] inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Solicitar orden de Crown & Bridge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 2. Implant Prosthetics */}
            <div className="group rounded-3xl p-8 bg-white border-2 border-[#A57CFA]/50 shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between relative overflow-hidden">
              <span className="absolute top-4 right-6 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-[#3C1C6C] text-white tracking-wider shadow-xs">
                Alta Demanda
              </span>

              {/* Marca de agua monocromo en la esquina */}
              <div className="absolute -bottom-6 -right-6 w-28 h-28 opacity-6 pointer-events-none">
                <Image
                  src="/images/brand/guisela-symbol-monochrome.png"
                  alt="Watermark"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#3C1C6C] text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md shadow-purple-950/20">
                  <ShieldCheck className="w-7 h-7 text-[#D0B9FF]" />
                </div>
                <h3 className="text-2xl font-black text-[#3C1C6C] tracking-tight">
                  Implant Prosthetics
                </h3>
                <p className="text-xs font-bold text-[#A57CFA] uppercase tracking-wider mt-1 mb-3">
                  Prótesis sobre Implantes & Pilares
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Rehabilitaciones complejas cementadas y atornilladas directas a implante o multi-unit. Pilares personalizados fresados en titanio o zirconio con perfiles de emergencia biológicos.
                </p>
                <ul className="mt-5 space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Compatibilidad con todas las marcas de implantes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Estructuras híbridas All-on-4 / All-on-6
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Ajuste pasivo verificado en microscopio
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-5 border-t border-purple-50">
                <Link
                  href="/login"
                  className="text-xs font-extrabold text-[#3C1C6C] hover:text-[#A57CFA] inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Solicitar orden de Implantes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 3. Digital Workflow */}
            <div className="group rounded-3xl p-8 bg-white border border-purple-100/90 hover:border-[#A57CFA]/60 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden">
              {/* Marca de agua monocromo en la esquina */}
              <div className="absolute -bottom-6 -right-6 w-28 h-28 opacity-6 pointer-events-none">
                <Image
                  src="/images/brand/guisela-symbol-monochrome.png"
                  alt="Watermark"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-100/70 text-[#3C1C6C] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Cpu className="w-7 h-7 text-[#3C1C6C]" />
                </div>
                <h3 className="text-2xl font-black text-[#3C1C6C] tracking-tight">
                  Digital Workflow
                </h3>
                <p className="text-xs font-bold text-[#A57CFA] uppercase tracking-wider mt-1 mb-3">
                  Flujo Digital Integral CAD/CAM
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Recepción directa de escaneos intraorales vía nube o portal web. Modelado 3D asistido por computadora, modelos impresos en resina 3D de alta definición y trazabilidad clínica inmediata.
                </p>
                <ul className="mt-5 space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Archivos STL, PLY y OBJ de cualquier escáner
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tiempos de entrega reducidos (hasta 48h)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Validación previa del diseño con el doctor
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-5 border-t border-purple-50">
                <Link
                  href="/login"
                  className="text-xs font-extrabold text-[#3C1C6C] hover:text-[#A57CFA] inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Enviar archivo digital STL</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. FLUJO TÉCNICO EN 5 ESTACIONES — Diseño Gráfico Conectado */}
      {/* ========================================================= */}
      <section id="flujo" className="pt-24 pb-36 sm:pt-28 sm:pb-44 bg-gradient-to-b from-[#180B28] via-[#120722] to-[#0A0314] text-white relative overflow-hidden">
        {/* Trama de fondo sutil */}
        <div className="absolute inset-0 bg-[radial-gradient(#A57CFA_1px,transparent_1px)] [background-size:28px_28px] opacity-15" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#D0B9FF] text-xs font-bold uppercase mb-4">
              <Activity className="w-3.5 h-3.5 text-[#A57CFA]" />
              Control de Calidad Riguroso
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Flujo de Producción en 5 Estaciones de Taller
            </h2>
            <p className="text-slate-300 mt-2 text-sm max-w-xl mx-auto">
              Cada prótesis o corona viaja por un circuito técnico auditado paso a paso para garantizar que ningún trabajo salga sin control milimétrico.
            </p>
          </div>

          {/* Grid de Estaciones con Conexión Visual */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                num: "01",
                name: "Moldeado",
                subtitle: "Vaciado & Modelos",
                desc: "Vaciado de yeso especial tipo IV o impresión 3D en resina para obtener el modelo maestro de trabajo.",
                icon: "🏺",
              },
              {
                num: "02",
                name: "Escaneo 3D",
                subtitle: "Digitalización Óptica",
                desc: "Digitalización con escáner de laboratorio para registrar la preparación y delimitar la línea de terminación.",
                icon: "📐",
              },
              {
                num: "03",
                name: "Modelado Digital",
                subtitle: "Diseño CAD 3D",
                desc: "Diseño anatómico en exocad: oclusión, puntos de contacto y perfil de emergencia biológico.",
                icon: "🖥️",
              },
              {
                num: "04",
                name: "Fresado CAM",
                subtitle: "Mecanizado Robótico",
                desc: "Fresado de 5 ejes en bloques de Zirconio o Disilicato, seguido de sinterizado en horno de alta temperatura.",
                icon: "⚙️",
              },
              {
                num: "05",
                name: "Pulido & Control",
                subtitle: "Estratificación Final",
                desc: "Estratificación de cerámica, glaseado, caracterización de textura y control de ajuste marginal con microscopio.",
                icon: "✨",
              },
            ].map((station) => (
              <div
                key={station.num}
                className="p-6 rounded-2xl bg-white/6 border border-white/12 hover:border-[#A57CFA] hover:bg-white/10 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl font-black text-[#A57CFA] group-hover:scale-105 transition-transform">
                      {station.num}
                    </span>
                    <span className="text-2xl">{station.icon}</span>
                  </div>

                  <h4 className="text-base font-extrabold text-white leading-snug">
                    {station.name}
                  </h4>
                  <p className="text-[11px] font-bold text-[#D0B9FF] uppercase tracking-wider mt-0.5 mb-2">
                    {station.subtitle}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {station.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  Paso Verificado
                </div>
              </div>
            ))}
          </div>

          {/* Panel inferior con más cuerpo y métricas de precisión */}
          <div className="mt-14 pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#A57CFA]/40 transition-colors">
              <span className="text-2xl sm:text-3xl font-black text-[#A57CFA] block mb-1">&lt; 15 µm</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Ajuste Marginal Microscópico</span>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Sellado periférico verificado en estereoscopio para preservar el muñón y prevenir filtraciones biológicas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#A57CFA]/40 transition-colors">
              <span className="text-2xl sm:text-3xl font-black text-[#A57CFA] block mb-1">5 Ejes Robóticos</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Mecanizado CAM Continuo</span>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Fresado de alta precisión en seco y húmedo con bloques de Zirconio multicapa y Disilicato de Litio.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:border-[#A57CFA]/40 transition-colors">
              <span className="text-2xl sm:text-3xl font-black text-[#A57CFA] block mb-1">100% Auditado</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Trazabilidad en Vivo por Estación</span>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Cada orden registra su técnico responsable, tiempos de ejecución y comentarios de control de calidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. ALIANZA CON CLÍNICAS & ODONTÓLOGOS */}
      {/* ========================================================= */}
      <section id="alianza" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Lado Izquierdo: Características de Confianza */}
            <div className="lg:col-span-7">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
                Alianza Estratégica
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#3C1C6C] tracking-tight mt-1">
                ¿Por qué confiar los casos clínicos a Guisela?
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                El éxito de tu consulta depende de no repetir impresiones ni perder citas de pacientes. Fabricamos con tolerancias microscópicas para que coloques la corona al primer intento.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-[#D0B9FF] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3C1C6C]">Puntualidad Estricta Garantizada</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Cronogramas de entrega coordinados con la cita de prueba de tu paciente. Sin retrasos ni reprogramaciones sorpresa.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-[#D0B9FF] flex items-center justify-center shrink-0">
                    <Microscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3C1C6C]">Comunicación Directa Técnico-Doctor</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Envío de fotos del caso en proceso, consultas sobre oclusión y fotos intraorales para personalización de color.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4.5 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-[#D0B9FF] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3C1C6C]">Materiales Médicos 100% Certificados</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Discos de zirconio biocompatible con marcado CE y aleaciones libres de níquel/berilio para máxima salud periodontal.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Derecho: Tarjeta de Contacto Directo */}
            <div className="lg:col-span-5">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-50/80 via-white to-purple-100/50 border-2 border-purple-100 shadow-xl">
                <div className="relative h-14 w-52 mb-4">
                  <Image
                    src="/images/brand/guisela-logo-primary.png"
                    alt="Guisela Laboratorio Dental"
                    fill
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
                <h3 className="text-2xl font-black text-[#3C1C6C]">
                  Comienza a trabajar con nosotros
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Crea tu cuenta de odontólogo en menos de 2 minutos para registrar tus primeros casos y hacer seguimiento desde tu celular o computadora.
                </p>

                <div className="mt-6 space-y-3">
                  <Link
                    href="/register"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-[#3C1C6C] hover:bg-[#2C1450] shadow-md transition-all text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Cuenta de Clínica</span>
                  </Link>

                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[#3C1C6C] bg-white hover:bg-purple-50 border border-purple-200 transition-all text-sm"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar al Portal del Doctor</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. CTA BANNER OSCURO — Con Logo Secundario Blanco Oficial */}
      {/* ========================================================= */}
      <section className="py-20 bg-gradient-to-br from-[#3C1C6C] via-[#2E1452] to-[#1C0B33] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Logo Secundario Blanco de Fondo Púrpura */}
          <div className="relative h-18 w-56 mx-auto mb-6">
            <Image
              src="/images/brand/guisela-logo-secondary-dark.png"
              alt="Guisela Laboratorio Dental"
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Eleva el estándar protésico de tu clínica dental hoy
          </h2>

          <p className="mt-4 text-base sm:text-lg text-purple-200 max-w-2xl mx-auto leading-relaxed">
            Envía tu primer caso digital en formato STL o programa la recogida de tus impresiones físicas en clínica.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-[#3C1C6C] bg-white hover:bg-purple-50 shadow-xl transition-all text-base"
            >
              <UserPlus className="w-5 h-5 text-[#3C1C6C]" />
              <span>Registrar Mi Clínica Dental</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-white bg-[#A57CFA] hover:bg-[#9468ED] shadow-xl transition-all text-base"
            >
              <LogIn className="w-5 h-5 text-white" />
              <span>Acceder al Portal del Doctor</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER — Logo Primario + Datos de Contacto */}
      {/* ========================================================= */}
      <footer id="contacto" className="bg-white border-t border-purple-100 py-14 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Columna Logo */}
            <div>
              <div className="relative h-20 sm:h-24 w-60 sm:w-72 mb-4">
                <Image
                  src="/images/brand/guisela-logo-primary.png"
                  alt="Guisela Laboratorio Dental"
                  fill
                  className="object-contain object-left"
                  unoptimized
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Laboratorio dental de vanguardia. Prótesis fija, implantes y flujo 100% digital con tecnología robótica de 5 ejes y artesanía de caracterización cerámica.
              </p>
            </div>

            {/* Especialidades */}
            <div>
              <p className="text-xs font-black text-[#3C1C6C] uppercase tracking-wider mb-4">
                Especialidades
              </p>
              <ul className="space-y-2 text-xs font-semibold">
                <li><a href="#servicios" className="hover:text-[#3C1C6C]">Crown & Bridge (Zirconio)</a></li>
                <li><a href="#servicios" className="hover:text-[#3C1C6C]">Implant Prosthetics</a></li>
                <li><a href="#servicios" className="hover:text-[#3C1C6C]">Disilicato de Litio (E.max)</a></li>
                <li><a href="#servicios" className="hover:text-[#3C1C6C]">Prótesis Removibles y Esqueléticos</a></li>
                <li><a href="#servicios" className="hover:text-[#3C1C6C]">Modelos Impresos 3D</a></li>
              </ul>
            </div>

            {/* Accesos al Portal */}
            <div>
              <p className="text-xs font-black text-[#3C1C6C] uppercase tracking-wider mb-4">
                Accesos al Portal
              </p>
              <ul className="space-y-2 text-xs font-semibold">
                <li><Link href="/login" className="hover:text-[#3C1C6C]">Portal Odontólogos</Link></li>
                <li><Link href="/login" className="hover:text-[#3C1C6C]">Portal Secretaría</Link></li>
                <li><Link href="/login" className="hover:text-[#3C1C6C]">Portal Técnico de Taller</Link></li>
                <li><Link href="/register" className="hover:text-[#3C1C6C]">Registro de Nueva Clínica</Link></li>
              </ul>
            </div>

            {/* Contacto Directo */}
            <div>
              <p className="text-xs font-black text-[#3C1C6C] uppercase tracking-wider mb-4">
                Atención Clínica
              </p>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#A57CFA]" />
                  <span>Atención telefónica directa a doctores</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#A57CFA]" />
                  <span>Recepción digital: STL / PLY / ZIP</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#A57CFA]" />
                  <span>Lunes a Sábado: 8:00 AM - 19:00 PM</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#A57CFA]" />
                  <span>Despacho y logística clínica garantizada</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© {new Date().getFullYear()} Guisela Laboratorio Dental. Todos los derechos reservados.</p>
            <p className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Sistema y Servidores en Línea</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
