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
  Calendar,
  Eye,
} from "lucide-react";

const carouselSlides = [
  {
    title: "Fresado Robótico CAD/CAM de 5 Ejes",
    category: "Odontología Digital",
    desc: "Mecanizado de máxima exactitud micrométrica (< 15 µm) en zirconio multicapa y disilicato de litio para un ajuste marginal impecable.",
    image: "/images/slide1-cadcam.jpg",
    badge: "Tecnología CAD/CAM",
  },
  {
    title: "Artesanía & Estratificación Cerámica",
    category: "Estética & Textura",
    desc: "Maestros ceramistas que reproducen textura, mamelones, translucidez y color natural con pincel y pigmentos finos.",
    image: "/images/slide2-ceramic.jpg",
    badge: "Detalle Artesanal",
  },
  {
    title: "Prótesis sobre Implantes & Rehabilitación",
    category: "Rehabilitación Compleja",
    desc: "Soluciones atornilladas y cementadas con perfiles de emergencia biológicos y ajuste pasivo garantizado.",
    image: "/images/slide3-implants.jpg",
    badge: "Precisión Clínica",
  },
  {
    title: "Centro de Modelado 3D & Flujo Digital",
    category: "Diseño & Planificación",
    desc: "Recepción de archivos digitales STL/PLY desde escáneres intraorales (Medit, 3Shape, iTero) con simulación 3D en pantalla.",
    image: "/images/mockup-cadcam-tablet.png",
    badge: "Flujo 100% Digital",
  },
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play carrusel cada 5.5 segundos
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFE] text-slate-800 font-sans selection:bg-[#A57CFA] selection:text-white">
      {/* ========================================================= */}
      {/* 1. NAVBAR SUPERIOR CON LOGO OFICIAL GUISELA */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Oficial Guisela Laboratorio Dental */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-14 w-48 sm:w-56 flex items-center">
              <Image
                src="/images/guisela-logo.png"
                alt="Guisela Laboratorio Dental"
                width={260}
                height={80}
                className="h-14 w-auto object-contain group-hover:scale-102 transition-transform"
                priority
                unoptimized
              />
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#servicios" className="hover:text-[#3C1C6C] transition-colors">
              Servicios
            </a>
            <a href="#flujo-digital" className="hover:text-[#3C1C6C] transition-colors">
              Flujo Digital
            </a>
            <a href="#galeria" className="hover:text-[#3C1C6C] transition-colors">
              Galería de Trabajos
            </a>
            <a href="#tecnicos" className="hover:text-[#3C1C6C] transition-colors">
              Equipo Técnico
            </a>
            <a href="#contacto" className="hover:text-[#3C1C6C] transition-colors">
              Contacto
            </a>
          </nav>

          {/* CTAs de Acceso al Sistema */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#3C1C6C] bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all shadow-xs"
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
              <span className="hidden sm:inline">Registro Clínica</span>
              <span className="sm:hidden">Registro</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24">
        {/* Gradiente de fondo en paleta Deep Purple & Brand Violet */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-[#D0B9FF]/35 via-[#A57CFA]/15 to-transparent blur-3xl -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Columna Izquierda: Mensaje y Propuesta de Valor */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/90 border border-[#A57CFA]/40 text-[#3C1C6C] text-xs font-bold tracking-wide uppercase shadow-xs mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
                Prótesis Dentales de Alta Gama • Flujo 100% Digital CAD/CAM
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#3C1C6C] tracking-tight leading-[1.12]">
                Donde la precisión científica se convierte en{" "}
                <span className="bg-gradient-to-r from-[#3C1C6C] via-[#A57CFA] to-[#3C1C6C] bg-clip-text text-transparent">
                  arte dental
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Laboratorio dental especializado en <strong>Crown & Bridge (Zirconio multicapa, E.max)</strong>,{" "}
                <strong>Implant Prosthetics</strong> y <strong>Flujo Digital Intraoral</strong> con trazabilidad en vivo por estación para clínicas y odontólogos.
              </p>

              {/* Botones de acción principales */}
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
                  <span>Ver Trabajos Realizados</span>
                </a>
              </div>

              {/* Métricas de confianza */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-5 pt-8 border-t border-purple-100">
                <div>
                  <p className="text-3xl font-black text-[#3C1C6C]">+12 Años</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase mt-0.5">
                    Experiencia Protésica
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
                    Control por Estación
                  </p>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Mockup Oficial y Tarjeta de Marca (De las fotos del cliente) */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl p-6 bg-gradient-to-br from-white via-purple-50/50 to-purple-100/30 border-2 border-purple-100 shadow-2xl shadow-purple-950/10">
                {/* Logo Guisela flotante */}
                <div className="flex items-center justify-between pb-4 border-b border-purple-100 mb-4">
                  <div className="relative h-12 w-44">
                    <Image
                      src="/images/guisela-logo.png"
                      alt="Guisela Logo"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#3C1C6C] text-white">
                    Laboratorio Certificado
                  </span>
                </div>

                {/* Imagen del Mockup CAD/CAM y Tablet del Cliente */}
                <div className="relative rounded-2xl overflow-hidden aspect-16/10 border border-purple-200/80 shadow-md bg-slate-900 group">
                  <Image
                    src="/images/mockup-cadcam-tablet.png"
                    alt="Dental Laboratory Website Mockup CAD/CAM"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3C1C6C]/80 via-transparent to-transparent flex items-end p-4">
                    <div>
                      <p className="text-xs font-bold text-[#D0B9FF] uppercase tracking-wider">
                        Flujo CAD/CAM Clínico
                      </p>
                      <p className="text-sm font-extrabold text-white">
                        Simulación 3D y Ajuste Virtual de Coronas
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tarjetas de Features Rápidos */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#3C1C6C]/10 text-[#3C1C6C] flex items-center justify-center font-bold text-xs">
                      5E
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Fresado 5 Ejes</p>
                      <p className="text-[10px] text-slate-500">Zirconio & E.max</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#A57CFA]/15 text-[#3C1C6C] flex items-center justify-center font-bold text-xs">
                      🎨
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Estratificación</p>
                      <p className="text-[10px] text-slate-500">Pincel artesanal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CARRUSEL DE FOTOS INTERACTIVO (GALERÍA CLÍNICA) */}
      {/* ========================================================= */}
      <section
        id="galeria"
        className="py-16 bg-gradient-to-b from-white via-purple-50/50 to-white border-y border-purple-100"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
                Muestra de Excelencia en Laboratorio
              </span>
              <h2 className="text-3xl font-black text-[#3C1C6C] tracking-tight mt-1">
                Galería de Procesos y Trabajos Dentales
              </h2>
            </div>
            <p className="text-sm text-slate-500 max-w-md mt-2 md:mt-0">
              Imágenes de nuestro flujo de trabajo: fresado robótico, caracterización manual con pincel y ajuste de implantes.
            </p>
          </div>

          {/* Contenedor del Carrusel Principal */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 aspect-16/9 md:aspect-21/9 max-h-[580px]">
            {carouselSlides.map((slide, index) => (
              <div
                key={slide.title}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                {/* Imagen del Slide */}
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover object-center"
                  priority={index === 0}
                  unoptimized
                />

                {/* Overlay de gradiente */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 sm:p-10 lg:p-14">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#A57CFA] text-white w-fit mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    {slide.badge}
                  </span>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                    {slide.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-200 mt-2 max-w-2xl drop-shadow-sm leading-relaxed">
                    {slide.desc}
                  </p>
                </div>
              </div>
            ))}

            {/* Controles de Navegación (Flechas) */}
            <button
              onClick={prevSlide}
              aria-label="Anterior foto"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/85 hover:bg-white text-[#3C1C6C] backdrop-blur-md flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextSlide}
              aria-label="Siguiente foto"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/85 hover:bg-white text-[#3C1C6C] backdrop-blur-md flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Indicadores de Puntos y Contador */}
            <div className="absolute bottom-5 right-6 z-20 flex items-center gap-3">
              <span className="text-xs font-bold text-white/80 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-xs">
                {currentSlide + 1} / {carouselSlides.length}
              </span>
              <div className="flex gap-1.5">
                {carouselSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Ir a foto ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      i === currentSlide ? "w-8 bg-[#A57CFA]" : "w-2.5 bg-white/60 hover:bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Miniaturas de selección directa */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {carouselSlides.map((slide, idx) => (
              <button
                key={slide.title}
                onClick={() => setCurrentSlide(idx)}
                className={`relative rounded-xl overflow-hidden aspect-16/9 border-2 transition-all p-2 flex flex-col justify-end text-left ${
                  idx === currentSlide
                    ? "border-[#3C1C6C] ring-2 ring-[#A57CFA]/50"
                    : "border-purple-100 hover:border-purple-300 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/50" />
                <span className="relative z-10 text-[11px] font-extrabold text-white truncate">
                  {slide.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SERVICIOS PRINCIPALES (Basados en el Mockup de la foto) */}
      {/* ========================================================= */}
      <section id="servicios" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
              Soluciones Especializadas
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#3C1C6C] tracking-tight mt-1">
              Servicios Clínicos del Laboratorio
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              Especialidades basadas en la guía técnica oficial de Guisela Laboratorio Dental.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* 1. Crown & Bridge */}
            <div className="group rounded-3xl p-8 bg-white border border-purple-100 hover:border-[#A57CFA]/50 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
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
            <div className="group rounded-3xl p-8 bg-white border-2 border-[#A57CFA]/40 shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between relative">
              <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[11px] font-black uppercase bg-[#3C1C6C] text-white tracking-wider shadow-xs">
                Alta Demanda
              </span>
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
            <div className="group rounded-3xl p-8 bg-white border border-purple-100 hover:border-[#A57CFA]/50 shadow-md hover:shadow-xl transition-all flex flex-col justify-between">
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
      {/* 5. FLUJO DE TRABAJO EN 5 ESTACIONES */}
      {/* ========================================================= */}
      <section id="flujo-digital" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#3C1C6C_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
              Trazabilidad en Tiempo Real
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
              Flujo de Producción del Laboratorio
            </h2>
            <p className="text-slate-400 mt-3 text-sm">
              Cada pedido pasa por 5 estaciones de control riguroso para asegurar máxima precisión antes del despacho.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: "01",
                name: "Moldeado / Impresión",
                desc: "Vaciado de yeso especial o impresión 3D en resina de alta resolución.",
              },
              {
                step: "02",
                name: "Escaneo 3D",
                desc: "Digitalización óptica del modelo físico y delimitación de márgenes.",
              },
              {
                step: "03",
                name: "Modelado Digital",
                desc: "Diseño CAD 3D de anatomía oclusal, puntos de contacto y perfil biológico.",
              },
              {
                step: "04",
                name: "Fresado CAM",
                desc: "Mecanizado robótico de 5 ejes en bloques de zirconio o disilicato.",
              },
              {
                step: "05",
                name: "Pulido & Control",
                desc: "Estratificación, glaseado cerámico en horno y control dimensional.",
              },
            ].map((station) => (
              <div
                key={station.step}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#A57CFA] transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl font-black text-[#A57CFA]">{station.step}</span>
                  <h4 className="text-base font-extrabold text-white mt-2 leading-snug">
                    {station.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {station.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-[#D0B9FF]">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Control de Calidad
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. EQUIPO TÉCNICO & ALIANZA CON ODONTÓLOGOS */}
      {/* ========================================================= */}
      <section id="tecnicos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Lado Izquierdo: Mockup del Sistema Completo de la foto */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border-2 border-purple-100 shadow-xl bg-slate-50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-[#A57CFA] uppercase tracking-wider">
                      Design System & Dashboard
                    </span>
                    <h3 className="text-xl font-black text-[#3C1C6C]">
                      Guisela UI Dental Kit
                    </h3>
                  </div>
                  <div className="relative h-10 w-28">
                    <Image
                      src="/images/guisela-logo.png"
                      alt="Guisela Logo"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-4/3 border border-purple-200">
                  <Image
                    src="/images/guisela-ui-mockup.png"
                    alt="Guía de Interfaz y Mockup Oficial"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Lado Derecho: Beneficios para el Odontólogo */}
            <div className="lg:col-span-6">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
                Alianza Estratégica
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#3C1C6C] tracking-tight mt-1">
                ¿Por qué confiar los casos clínicos a Guisela?
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Entendemos que el prestigio de tu clínica depende del ajuste exacto y la naturalidad estética de cada corona o prótesis entregada al paciente.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[#D0B9FF]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3C1C6C]">Puntualidad Estricta Garantizada</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Cronogramas de entrega coordinados con la cita de prueba de tu paciente. Sin retrasos ni reprogramaciones sorpresa.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center shrink-0">
                    <Microscope className="w-5 h-5 text-[#D0B9FF]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3C1C6C]">Comunicación Directa Técnico-Doctor</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Envío de fotos del caso en proceso, consultas sobre oclusión y fotos intraorales para personalización de color.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
                  <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#D0B9FF]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#3C1C6C]">Certificado de Materiales Biocompatibles</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Utilizamos únicamente discos de zirconio médico certificado con marcado CE y aleaciones libres de berilio/níquel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. CTA FINAL & REGISTRO */}
      {/* ========================================================= */}
      <section className="py-20 bg-gradient-to-br from-[#3C1C6C] via-[#2F1555] to-[#1E0D37] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#D0B9FF] text-xs font-bold uppercase mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
            Empecemos a trabajar juntos
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Eleva el estándar protésico de tu clínica dental hoy
          </h2>

          <p className="mt-5 text-base sm:text-lg text-purple-200 max-w-2xl mx-auto">
            Ingresa a nuestro portal exclusivo para odontólogos o crea tu cuenta para enviar tu primer caso digital o analógico.
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
              <span>Ingresar al Portal del Doctor</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER COMPLETO CON MARCA OFICIAL */}
      {/* ========================================================= */}
      <footer id="contacto" className="bg-white border-t border-purple-100 py-14 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Columna Marca */}
            <div className="md:col-span-1">
              <div className="relative h-14 w-48 mb-4">
                <Image
                  src="/images/guisela-logo.png"
                  alt="Guisela Laboratorio Dental"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                Laboratorio especializado en rehabilitación oral de alta precisión, coronas sobre implantes y flujo 100% digital.
              </p>
            </div>

            {/* Servicios */}
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

            {/* Accesos Rápidos */}
            <div>
              <p className="text-xs font-black text-[#3C1C6C] uppercase tracking-wider mb-4">
                Portal de Acceso
              </p>
              <ul className="space-y-2 text-xs font-semibold">
                <li><Link href="/login" className="hover:text-[#3C1C6C]">Acceso Odontólogos</Link></li>
                <li><Link href="/login" className="hover:text-[#3C1C6C]">Acceso Secretaría</Link></li>
                <li><Link href="/login" className="hover:text-[#3C1C6C]">Acceso Técnico de Taller</Link></li>
                <li><Link href="/register" className="hover:text-[#3C1C6C]">Crear Nueva Cuenta</Link></li>
              </ul>
            </div>

            {/* Contacto e Información */}
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
                  <span>Cobertura y despacho clínico a nivel nacional</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>© {new Date().getFullYear()} Guisela Laboratorio Dental. Todos los derechos reservados.</p>
            <p className="flex items-center gap-3">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Servidores y Base de Datos en Línea</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
