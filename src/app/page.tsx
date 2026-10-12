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
} from "lucide-react";

const carouselSlides = [
  {
    title: "Fresado Robótico CAD/CAM de 5 Ejes",
    category: "Odontología Digital",
    desc: "Mecanizado de alta exactitud micrométrica en zirconio multicapa y disilicato de litio para un ajuste marginal perfecto.",
    image: "/images/slide1-cadcam.jpg",
    badge: "Tecnología de Punta",
  },
  {
    title: "Artesanía y Estratificación Cerámica",
    category: "Estética & Caracterización",
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
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play carrusel cada 5 segundos
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
      {/* 1. NAVBAR SUPERIOR */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-purple-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Guisela */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-[#3C1C6C] p-1.5 flex items-center justify-center shadow-md shadow-purple-950/20 group-hover:scale-105 transition-transform">
              {/* Diente estilizado con pincel */}
              <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                <path d="M50 15 C35 15, 20 25, 20 45 C20 62, 28 85, 38 90 C45 93, 48 78, 50 78 C52 78, 55 93, 62 90 C72 85, 80 62, 80 45 C80 25, 65 15, 50 15 Z" fill="white" opacity="0.9" />
                <path d="M35 38 L45 70 L55 38 L65 70 L72 38" stroke="#3C1C6C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M75 15 L52 35" stroke="#A57CFA" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-[#3C1C6C] leading-none">
                Guisela
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#A57CFA] mt-1">
                Laboratorio Dental
              </span>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#servicios" className="hover:text-[#3C1C6C] transition-colors">
              Servicios
            </a>
            <a href="#flujo-digital" className="hover:text-[#3C1C6C] transition-colors">
              Flujo Digital
            </a>
            <a href="#galeria" className="hover:text-[#3C1C6C] transition-colors">
              Galería
            </a>
            <a href="#calidad" className="hover:text-[#3C1C6C] transition-colors">
              Control de Calidad
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
              <span className="hidden sm:inline">Portal Clientes</span>
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
      {/* 2. HERO SECTION */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Fondos y gradientes sutiles de la marca */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#D0B9FF]/30 via-[#A57CFA]/10 to-transparent blur-3xl -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge de innovación */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-[#A57CFA]/40 text-[#3C1C6C] text-xs font-bold tracking-wide uppercase shadow-xs mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#A57CFA]" />
            Prótesis Dentales de Alta Complejidad • Flujo 100% Digital
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#3C1C6C] tracking-tight max-w-4xl mx-auto leading-[1.12]">
            Donde la precisión científica se convierte en{" "}
            <span className="bg-gradient-to-r from-[#3C1C6C] via-[#A57CFA] to-[#3C1C6C] bg-clip-text text-transparent">
              arte dental
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Laboratorio dental especializado en <strong>coronas de zirconio multicapa</strong>,{" "}
            <strong>disilicato de litio</strong> y <strong>rehabilitación sobre implantes</strong> con
            trazabilidad en tiempo real para odontólogos exigentes.
          </p>

          {/* Botones de acción principales */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-white bg-[#3C1C6C] hover:bg-[#2F1555] shadow-lg shadow-purple-950/25 hover:shadow-xl hover:-translate-y-0.5 transition-all text-base"
            >
              <span>Acceder al Portal del Laboratorio</span>
              <ArrowRight className="w-5 h-5 text-[#A57CFA]" />
            </Link>

            <a
              href="#galeria"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-[#3C1C6C] bg-white hover:bg-purple-50 border border-purple-200 shadow-xs hover:border-purple-300 transition-all text-base"
            >
              <Play className="w-4 h-4 text-[#A57CFA] fill-current" />
              <span>Ver Trabajos de Laboratorio</span>
            </a>
          </div>

          {/* Métricas de confianza */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-purple-100 max-w-4xl mx-auto">
            <div>
              <p className="text-3xl font-black text-[#3C1C6C]">+12 Años</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">
                Experiencia Protésica
              </p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#3C1C6C]">100% Digital</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">
                Flujo CAD/CAM
              </p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#3C1C6C]">&lt; 15 Micras</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">
                Ajuste Marginal
              </p>
            </div>
            <div>
              <p className="text-3xl font-black text-[#3C1C6C]">Realtime</p>
              <p className="text-xs font-semibold text-slate-500 uppercase mt-1">
                Tracking por Estación
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CARRUSEL INTERACTIVO DE FOTOS (GALERÍA CLÍNICA) */}
      {/* ========================================================= */}
      <section
        id="galeria"
        className="py-16 bg-gradient-to-b from-white via-purple-50/40 to-white border-y border-purple-100"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
                Muestra de Excelencia
              </span>
              <h2 className="text-3xl font-black text-[#3C1C6C] tracking-tight mt-1">
                Galería de Procesos y Trabajos Dentales
              </h2>
            </div>
            <p className="text-sm text-slate-500 max-w-md mt-2 md:mt-0">
              Fotografía real de nuestro taller: tecnología robótica y técnica artesanal de
              estratificación de coronas.
            </p>
          </div>

          {/* Contenedor del Carrusel */}
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
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/80 hover:bg-white text-[#3C1C6C] backdrop-blur-md flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextSlide}
              aria-label="Siguiente foto"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/80 hover:bg-white text-[#3C1C6C] backdrop-blur-md flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Indicadores de Puntos */}
            <div className="absolute bottom-5 right-6 z-20 flex gap-2">
              {carouselSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  aria-label={`Ir a la diapositiva ${i + 1}`}
                  className={`h-2.5 rounded-full transition-all ${
                    i === currentSlide ? "w-8 bg-[#A57CFA]" : "w-2.5 bg-white/60 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SECCIÓN DE SERVICIOS ESPECIALIZADOS */}
      {/* ========================================================= */}
      <section id="servicios" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#A57CFA]">
              Soluciones Integrales
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#3C1C6C] tracking-tight mt-1">
              Catálogo de Especialidades Clínicas
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              Materiales certificados por las normas dentales más exigentes: Ivoclar Vivadent, Vita
              Zahnfabrik y Upcera Zirconia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#3C1C6C] flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-[#3C1C6C]" />
                </div>
                <h3 className="text-xl font-bold text-[#3C1C6C] mb-2">
                  Coronas & Puentes de Zirconio
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Zirconio translúcido multicapa con gradiente de color y resistencia de hasta 1200
                  MPa. Ideal para zonas posteriores y anteriores de alta demanda estética.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Zirconio Monolítico Full
                    Contour
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Estratificado con Porcelana
                    Feldespática
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Ajuste marginal digital
                    óptimo
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-50">
                <span className="text-xs font-bold text-[#A57CFA] uppercase tracking-wider">
                  Garantía de Sinterizado
                </span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl border-2 border-[#A57CFA]/50 bg-gradient-to-b from-white to-purple-50/30 p-8 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col justify-between relative">
              <span className="absolute -top-3 right-6 bg-[#3C1C6C] text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                Más Solicitado
              </span>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#3C1C6C] text-white flex items-center justify-center mb-6 shadow-md shadow-purple-950/20">
                  <Cpu className="w-7 h-7 text-[#A57CFA]" />
                </div>
                <h3 className="text-xl font-bold text-[#3C1C6C] mb-2">
                  Flujo Digital & Escaneo Intraoral
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Recibimos tus archivos digitales <strong>.STL y .PLY</strong> directo desde tu
                  escáner (Medit, 3Shape Trios, iTero, Carestream). Cero distorsión de alginato o yeso.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Recepción directa por el
                    portal web
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Reducción del tiempo de
                    entrega en 48h
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Modelos impresos 3D de alta
                    fidelidad
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-100">
                <span className="text-xs font-bold text-[#3C1C6C] uppercase tracking-wider">
                  Compatibilidad Universal
                </span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-[#3C1C6C] flex items-center justify-center mb-6">
                  <Microscope className="w-7 h-7 text-[#3C1C6C]" />
                </div>
                <h3 className="text-xl font-bold text-[#3C1C6C] mb-2">
                  Prótesis sobre Implantes
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Estructuras atornilladas, pilares personalizados fresados en titanio y barras
                  híbridas con ajuste pasivo estricto para evitar tensiones óseas.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Pilares personalizados de
                    Titanio / Zirconio
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Híbridas Toronto y All-on-4
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#A57CFA]" /> Sellado biológico y perfil
                    gingival
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-50">
                <span className="text-xs font-bold text-[#A57CFA] uppercase tracking-wider">
                  Ajuste Pasivo Certificado
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. EL FLUJO DE ESTACIONES (TRAZABILIDAD ÚNICA) */}
      {/* ========================================================= */}
      <section id="flujo-digital" className="py-20 bg-[#3C1C6C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#D0B9FF]">
              Proceso Estandarizado
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
              Flujo Técnico por Estaciones de Calidad
            </h2>
            <p className="mt-3 text-purple-200 text-sm sm:text-base">
              Cada pedido dental avanza por 5 etapas controladas digitalmente, garantizando que nada
              se escape al control de calidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: "01",
                name: "Moldeado & Prep",
                desc: "Desinfección de modelos y delimitación precisa de muñones.",
              },
              {
                step: "02",
                name: "Escaneo 3D",
                desc: "Digitalización óptica de modelos físicos o verificación STL.",
              },
              {
                step: "03",
                name: "Diseño CAD",
                desc: "Modelado morfológico y oclusal asistido por computadora.",
              },
              {
                step: "04",
                name: "Fresado Robótico",
                desc: "Tallado de alta precisión en discos de zirconio o disilicato.",
              },
              {
                step: "05",
                name: "Pulido & Control",
                desc: "Caracterización de color, glaseado final y control oclusal.",
              },
            ].map((st, i) => (
              <div
                key={st.step}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all"
              >
                <span className="text-2xl font-black text-[#A57CFA]">{st.step}</span>
                <h4 className="font-bold text-base mt-2 mb-1 text-white">{st.name}</h4>
                <p className="text-xs text-purple-200 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-[#3C1C6C] bg-white hover:bg-purple-50 shadow-xl transition-all"
            >
              <span>Ver el Sistema de Trazabilidad en Vivo</span>
              <ArrowRight className="w-4 h-4 text-[#3C1C6C]" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. CONTACTO & FOOTER */}
      {/* ========================================================= */}
      <footer id="contacto" className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
            {/* Columna 1: Info Marca */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#3C1C6C] p-1.5 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#A57CFA]" />
                </div>
                <div>
                  <span className="text-lg font-black text-white">Guisela</span>
                  <span className="block text-[10px] font-bold uppercase text-[#A57CFA]">
                    Laboratorio Dental
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                Laboratorio dedicado a la estética, función y vanguardia en prótesis dentales.
                Trabajamos en conjunto con clínicas odontológicas para devolver la sonrisa a cada
                paciente.
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#A57CFA]" /> Materiales Certificados
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-[#A57CFA]" /> Garantía Clínica
                </span>
              </div>
            </div>

            {/* Columna 2: Enlaces Rápidos */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Accesos
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Portal de Odontólogos
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Ingreso para Técnicos
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-white transition-colors">
                    Registrar Nueva Clínica
                  </Link>
                </li>
                <li>
                  <a href="#servicios" className="hover:text-white transition-colors">
                    Nuestros Servicios
                  </a>
                </li>
              </ul>
            </div>

            {/* Columna 3: Horarios y Contacto */}
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Atención
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#A57CFA] shrink-0" />
                  <span>Lun - Vie: 08:30 - 19:00</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#A57CFA] shrink-0" />
                  <span>Sábados: 08:30 - 13:00</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#A57CFA] shrink-0" />
                  <span>Atención a clínicas a nivel nacional</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} Guisela Laboratorio Dental. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1 text-slate-400">
              Desarrollado para <span className="text-[#A57CFA] font-bold">Guisela LabDent</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
