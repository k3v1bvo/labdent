import { supabase } from "@/lib/supabaseClient";
import { DEFAULT_EXCHANGE_RATE, getCachedExchangeRate } from "./currency";

export interface ItemCatalogo {
  id: string;
  legacyId?: number;
  nombre: string;
  marca?: string;
  categoria: "Materiales" | "Otros" | "Instrumental" | "Desechables" | "Químicos" | "Prótesis Fija" | "Prótesis Removible" | string;
  precioUsd: number;
  precioBs: number;
}

// Catálogo Oficial de Guisela Laboratorio Dental (81 items importados directamente del sistema legacy)
export const CATALOGO_OFICIAL: ItemCatalogo[] = [
  // --- Categoría: Materiales ---
  { id: "cat-65", legacyId: 65, nombre: "ACRILIZADO PLACA DE MIORELAJACION", marca: "ACRILICO", categoria: "Materiales", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-51", legacyId: 51, nombre: "ACRILIZADO SOBRE CROMO(9 A 13 PZAS)", marca: "ACRILICO", categoria: "Materiales", precioUsd: 35.0, precioBs: 280.0 },
  { id: "cat-49", legacyId: 49, nombre: "ACRILIZADO SOBRE CROMO(1 A 4 PZAS)", marca: "ACRILICO", categoria: "Materiales", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-50", legacyId: 50, nombre: "ACRILIZADO SOBRE CROMO(5 A 8 PZAS)", marca: "ACRILICO", categoria: "Materiales", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-44", legacyId: 44, nombre: "ACRILIZADO TOTAL", marca: "ACRILICO", categoria: "Materiales", precioUsd: 40.0, precioBs: 320.0 },
  { id: "cat-4", legacyId: 4, nombre: "BISCOCHADO", marca: "DUCERAM KISS", categoria: "Materiales", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-64", legacyId: 64, nombre: "CONFECCION PLACA DE MIORELAJACION", marca: "ACRILICO", categoria: "Materiales", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-42", legacyId: 42, nombre: "CUBETA INDIVIDUAL", marca: "ACRILICO", categoria: "Materiales", precioUsd: 5.0, precioBs: 40.0 },
  { id: "cat-53", legacyId: 53, nombre: "ESTRUCTURA ACETAL", marca: "ACETAL", categoria: "Materiales", precioUsd: 150.0, precioBs: 1200.0 },
  { id: "cat-77", legacyId: 77, nombre: "PASTILLA DE DIENTES DURT.", marca: "DURATONE", categoria: "Materiales", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-75", legacyId: 75, nombre: "PASTILLA DE DIENTES TEC.", marca: "TECNOVADENT", categoria: "Materiales", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-76", legacyId: 76, nombre: "PASTILLA DE DIENTES YAMH.", marca: "YAMAHACHI", categoria: "Materiales", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-52", legacyId: 52, nombre: "PLACA ACETALICA", marca: "ACETAL", categoria: "Materiales", precioUsd: 170.0, precioBs: 1360.0 },
  { id: "cat-54", legacyId: 54, nombre: "PLACA ACETALICA PARCIAL", marca: "ACETAL", categoria: "Materiales", precioUsd: 85.0, precioBs: 680.0 },
  { id: "cat-43", legacyId: 43, nombre: "PLACA BASE + RODETE", marca: "ACRILICO", categoria: "Materiales", precioUsd: 5.0, precioBs: 40.0 },
  { id: "cat-66", legacyId: 66, nombre: "PLACA DE CONTENCION RIGIDA", marca: "ACETATO", categoria: "Materiales", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-67", legacyId: 67, nombre: "PLACA ESTAMPADA ELASTICA", marca: "ACETATO", categoria: "Materiales", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-81", legacyId: 81, nombre: "PLACA PROVISORIA", marca: "ACRILICO AUTO", categoria: "Materiales", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-57", legacyId: 57, nombre: "PLACA VALPLAST BILATERAL (1 A 5 PZAS)", marca: "VALPLAST", categoria: "Materiales", precioUsd: 70.0, precioBs: 560.0 },
  { id: "cat-58", legacyId: 58, nombre: "PLACA VALPLAST BILATERAL(6 A 8 PZAS)", marca: "VALPLAST", categoria: "Materiales", precioUsd: 80.0, precioBs: 640.0 },
  { id: "cat-59", legacyId: 59, nombre: "PLACA VALPLAST TOTAL", marca: "VALPLAST", categoria: "Materiales", precioUsd: 100.0, precioBs: 800.0 },
  { id: "cat-55", legacyId: 55, nombre: "PLACA VALPLAST UNILATERAL", marca: "VALPLAST", categoria: "Materiales", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-56", legacyId: 56, nombre: "PLACA VALPLAST UNILATERAL(2 A 3 PZAS)", marca: "VALPLAST", categoria: "Materiales", precioUsd: 40.0, precioBs: 320.0 },
  { id: "cat-79", legacyId: 79, nombre: "PRUEBA DE TRANSFERENCIA", marca: "ACRILICO", categoria: "Materiales", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-80", legacyId: 80, nombre: "PRUEBA RESINA PROVISORIA", marca: "RESINA DIGITAL", categoria: "Materiales", precioUsd: 3.0, precioBs: 24.0 },
  { id: "cat-63", legacyId: 63, nombre: "REBASADO DE PLACA", marca: "ACRILICO", categoria: "Materiales", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-60", legacyId: 60, nombre: "REFUERZO METALICO PERSONALIZADO", marca: "REMANIUM", categoria: "Materiales", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-61", legacyId: 61, nombre: "REPARACION DE PLACA (SIMPLE)", marca: "ACRILICO", categoria: "Materiales", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-62", legacyId: 62, nombre: "REPARACION DE PLACA (COMPLEJA)", marca: "ACRILICO", categoria: "Materiales", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-72", legacyId: 72, nombre: "UCLA", marca: "OTROS", categoria: "Materiales", precioUsd: 15.0, precioBs: 120.0 },

  // --- Categoría: Otros / Prótesis Fijas / Implantes ---
  { id: "cat-31", legacyId: 31, nombre: "APOYOS METALICOS", marca: "REMANIUM", categoria: "Otros", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-30", legacyId: 30, nombre: "APOYOS ZIRCONIO", marca: "ZIRCONIO", categoria: "Otros", precioUsd: 45.0, precioBs: 360.0 },
  { id: "cat-73", legacyId: 73, nombre: "ATTACH", marca: "REMANIUM", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-36", legacyId: 36, nombre: "BOLATTACH", marca: "REMANIUM", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-37", legacyId: 37, nombre: "CAJA PARATTACH", marca: "OTROS", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-28", legacyId: 28, nombre: "CARILLA CERAMAGE", marca: "CERAMAGE", categoria: "Otros", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-29", legacyId: 29, nombre: "CARILLA IVOCROM", marca: "IVOCROM", categoria: "Otros", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-27", legacyId: 27, nombre: "CARILLA NEXCO", marca: "NEXCO", categoria: "Otros", precioUsd: 40.0, precioBs: 320.0 },
  { id: "cat-26", legacyId: 26, nombre: "CARILLAS EMAX", marca: "EMAX", categoria: "Otros", precioUsd: 75.0, precioBs: 600.0 },
  { id: "cat-3", legacyId: 3, nombre: "CASQUETE METAL CERAMICA", marca: "RITON", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-13", legacyId: 13, nombre: "CASQUETE PARA CERAMAGE", marca: "CERAMAGE", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-9", legacyId: 9, nombre: "CASQUETE PARA IVOCROM", marca: "REMANIUM", categoria: "Otros", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-68", legacyId: 68, nombre: "COLADO UCLA", marca: "REMANIUM", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-69", legacyId: 69, nombre: "COLADO UCLA + ESTRUCTURA SOBRE IMPLANTE", marca: "REMANIUM", categoria: "Otros", precioUsd: 50.0, precioBs: 400.0 },
  { id: "cat-71", legacyId: 71, nombre: "CORONA ATORNILLADA SOBRE IMPLANTE", marca: "OTROS", categoria: "Otros", precioUsd: 75.0, precioBs: 600.0 },
  { id: "cat-6", legacyId: 6, nombre: "CORONA DISILICATO DE LITIO(EMAX)", marca: "EMAX", categoria: "Otros", precioUsd: 80.0, precioBs: 640.0 },
  { id: "cat-18", legacyId: 18, nombre: "CORONA JACKET CERAMAGE", marca: "CERAMAGE", categoria: "Otros", precioUsd: 35.0, precioBs: 280.0 },
  { id: "cat-19", legacyId: 19, nombre: "CORONA JACKET IVOCROM", marca: "IVOCROM", categoria: "Otros", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-17", legacyId: 17, nombre: "CORONA JACKET NANOHIBRIDO", marca: "NANOHIBRIDO", categoria: "Otros", precioUsd: 45.0, precioBs: 360.0 },
  { id: "cat-16", legacyId: 16, nombre: "CORONA JACKET NEXCO", marca: "NEXCO", categoria: "Otros", precioUsd: 40.0, precioBs: 320.0 },
  { id: "cat-5", legacyId: 5, nombre: "CORONA METAL CERAMICA", marca: "DUCERAM KISS", categoria: "Otros", precioUsd: 50.0, precioBs: 400.0 },
  { id: "cat-8", legacyId: 8, nombre: "CORONA METALICA", marca: "REMANIUM", categoria: "Otros", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-15", legacyId: 15, nombre: "CORONA METALOPLASTICA CERAMAGE", marca: "CERAMAGE", categoria: "Otros", precioUsd: 45.0, precioBs: 360.0 },
  { id: "cat-11", legacyId: 11, nombre: "CORONA METALOPLASTICA IVOCROM", marca: "IVOCROM", categoria: "Otros", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-41", legacyId: 41, nombre: "CORONA PROVISORIA", marca: "PROVISORIO", categoria: "Otros", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-12", legacyId: 12, nombre: "CORONA VENEER IVOCROM", marca: "IVOCROM", categoria: "Otros", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-7", legacyId: 7, nombre: "CORONA ZIRCONIO", marca: "ZIRCONIO", categoria: "Otros", precioUsd: 90.0, precioBs: 720.0 },
  { id: "cat-45", legacyId: 45, nombre: "CROMO ESQUELETO ANALOGICO", marca: "REMANIUM", categoria: "Otros", precioUsd: 60.0, precioBs: 480.0 },
  { id: "cat-46", legacyId: 46, nombre: "CROMO ESQUELETO DIGITAL", marca: "RITON", categoria: "Otros", precioUsd: 80.0, precioBs: 640.0 },
  { id: "cat-47", legacyId: 47, nombre: "CROMO ESQUELETO PARCIAL (1 A 3 PZAS)", marca: "REMANIUM", categoria: "Otros", precioUsd: 40.0, precioBs: 320.0 },
  { id: "cat-48", legacyId: 48, nombre: "CROMO ESQUELETO PARCIAL (4 A 8 PZAS)", marca: "REMANIUM", categoria: "Otros", precioUsd: 40.0, precioBs: 320.0 },
  { id: "cat-39", legacyId: 39, nombre: "ENCERADO ANALOGICO", marca: "OTROS", categoria: "Otros", precioUsd: 5.0, precioBs: 40.0 },
  { id: "cat-40", legacyId: 40, nombre: "ENCERADO DIGITAL", marca: "OTROS", categoria: "Otros", precioUsd: 3.0, precioBs: 24.0 },
  { id: "cat-32", legacyId: 32, nombre: "ENCIA ARTIFICIAL", marca: "ENCIA", categoria: "Otros", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-74", legacyId: 74, nombre: "ESTRUCTURA DE METAL S/2 UCLAS", marca: "REMANIUM", categoria: "Otros", precioUsd: 85.0, precioBs: 680.0 },
  { id: "cat-70", legacyId: 70, nombre: "FRESADO", marca: "REMANIUM", categoria: "Otros", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-23", legacyId: 23, nombre: "INCRUSTACION CERAMAGE", marca: "CERAMAGE", categoria: "Otros", precioUsd: 30.0, precioBs: 240.0 },
  { id: "cat-20", legacyId: 20, nombre: "INCRUSTACION EMAX", marca: "EMAX", categoria: "Otros", precioUsd: 80.0, precioBs: 640.0 },
  { id: "cat-24", legacyId: 24, nombre: "INCRUSTACION IVOCROM", marca: "IVOCROM", categoria: "Otros", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-25", legacyId: 25, nombre: "INCRUSTACION METALICA", marca: "REMANIUM", categoria: "Otros", precioUsd: 18.0, precioBs: 144.0 },
  { id: "cat-22", legacyId: 22, nombre: "INCRUSTACION NEXCO", marca: "NEXCO", categoria: "Otros", precioUsd: 35.0, precioBs: 280.0 },
  { id: "cat-21", legacyId: 21, nombre: "INCRUSTACION ZIRCONIO", marca: "ZIRCONIO", categoria: "Otros", precioUsd: 90.0, precioBs: 720.0 },
  { id: "cat-78", legacyId: 78, nombre: "MODELO DIGITAL IMPRESO", marca: "DIGITAL", categoria: "Otros", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-1", legacyId: 1, nombre: "PERNO DIRECTO", marca: "REMANIUM", categoria: "Otros", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-2", legacyId: 2, nombre: "PERNO INDIRECTO", marca: "REMANIUM", categoria: "Otros", precioUsd: 10.0, precioBs: 80.0 },
  { id: "cat-33", legacyId: 33, nombre: "PERNO PASANTE", marca: "REMANIUM", categoria: "Otros", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-35", legacyId: 35, nombre: "PERNO RICHMON", marca: "REMANIUM", categoria: "Otros", precioUsd: 12.0, precioBs: 96.0 },
  { id: "cat-34", legacyId: 34, nombre: "PERNO SECCIONADO", marca: "REMANIUM", categoria: "Otros", precioUsd: 15.0, precioBs: 120.0 },
  { id: "cat-38", legacyId: 38, nombre: "REPUESTO TEFLON + ORING", marca: "OTROS", categoria: "Otros", precioUsd: 25.0, precioBs: 200.0 },
  { id: "cat-14", legacyId: 14, nombre: "REVESTIDO EN CERAMAGE", marca: "CERAMAGE", categoria: "Otros", precioUsd: 20.0, precioBs: 160.0 },
  { id: "cat-10", legacyId: 10, nombre: "REVESTIDO IVOCROM", marca: "IVOCROM", categoria: "Otros", precioUsd: 15.0, precioBs: 120.0 },
];

// Catálogo Oficial Convenio UNITEPC (Aranceles fijados en Bolivianos por Guisela Lab)
export const CATALOGO_UNITEPC: ItemCatalogo[] = [
  // --- Prótesis Fija ---
  { id: "uni-f-1", nombre: "Corona Metal Ceramica", categoria: "Prótesis Fija", marca: "DUCERAM", precioBs: 350.0, precioUsd: 43.75 },
  { id: "uni-f-2", nombre: "Corona Metaloplastica Ivocrom", categoria: "Prótesis Fija", marca: "IVOCROM", precioBs: 180.0, precioUsd: 22.50 },
  { id: "uni-f-3", nombre: "Corona Metaloplastica Ceramage o Parafil", categoria: "Prótesis Fija", marca: "CERAMAGE", precioBs: 285.0, precioUsd: 35.63 },
  { id: "uni-f-4", nombre: "Corona Emax Disilicato de Litio libre de metal", categoria: "Prótesis Fija", marca: "EMAX", precioBs: 560.0, precioUsd: 70.0 },
  { id: "uni-f-5", nombre: "Corona Jacket Ivocrom", categoria: "Prótesis Fija", marca: "IVOCROM", precioBs: 160.0, precioUsd: 20.0 },
  { id: "uni-f-6", nombre: "Corona Jacket Ceramage o Parafil", categoria: "Prótesis Fija", marca: "CERAMAGE", precioBs: 255.0, precioUsd: 31.88 },
  { id: "uni-f-7", nombre: "Incrustacion Emax Disilicato de Litio", categoria: "Prótesis Fija", marca: "EMAX", precioBs: 560.0, precioUsd: 70.0 },
  { id: "uni-f-8", nombre: "Incrustacion Ivocrom", categoria: "Prótesis Fija", marca: "IVOCROM", precioBs: 160.0, precioUsd: 20.0 },
  { id: "uni-f-9", nombre: "Incrustacion ceramage o Parafil", categoria: "Prótesis Fija", marca: "CERAMAGE", precioBs: 250.0, precioUsd: 31.25 },

  // --- Prótesis Removible (Placas) ---
  { id: "uni-r-1", nombre: "Placa total acrilica (enfilado y acrilizado sin pastillas)", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 350.0, precioUsd: 43.75 },
  { id: "uni-r-2", nombre: "Placa total acrilica (enfilado y acrilizado con pastillas)", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 450.0, precioUsd: 56.25 },
  { id: "uni-r-3", nombre: "Estructura de cromo", categoria: "Prótesis Removible", marca: "REMANIUM", precioBs: 350.0, precioUsd: 43.75 },
  { id: "uni-r-4", nombre: "Enfilado + Acrilizado s/cromo 1 a 4 pzas(con 1 pastilla)", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 180.0, precioUsd: 22.50 },
  { id: "uni-r-5", nombre: "Enfilado + Acrilizado s/cromo 5 a 8 pzas(con 1 pastilla)", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 245.0, precioUsd: 30.63 },
  { id: "uni-r-6", nombre: "Enfilado + Acrilizado s/cromo 5 a 8 pzas(con 2 pastillas)", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 315.0, precioUsd: 39.38 },
  { id: "uni-r-7", nombre: "Placa flexible valplat unilateral", categoria: "Prótesis Removible", marca: "VALPLAST", precioBs: 240.0, precioUsd: 30.0 },
  { id: "uni-r-8", nombre: "Placa flexible valplat de 2 a 3 pzas", categoria: "Prótesis Removible", marca: "VALPLAST", precioBs: 320.0, precioUsd: 40.0 },
  { id: "uni-r-9", nombre: "Placa Flexible valplat de 4 a 6 pzas", categoria: "Prótesis Removible", marca: "VALPLAST", precioBs: 480.0, precioUsd: 60.0 },
  { id: "uni-r-10", nombre: "Placa flexible valplat de 7 a 10 pzas", categoria: "Prótesis Removible", marca: "VALPLAST", precioBs: 640.0, precioUsd: 80.0 },
];

// Catálogo Oficial Convenio UNIVALLE (Aranceles fijados en Bolivianos por Guisela Lab)
export const CATALOGO_UNIVALLE: ItemCatalogo[] = [
  { id: "uva-1", nombre: "INCRUSTACION LIGA DE PLATA", categoria: "Prótesis Fija", marca: "PLATA", precioBs: 71.0, precioUsd: 8.88 },
  { id: "uva-2", nombre: "INC. CROMO O REMANIUM", categoria: "Prótesis Fija", marca: "REMANIUM", precioBs: 71.0, precioUsd: 8.88 },
  { id: "uva-3", nombre: "CORONA METALICA", categoria: "Prótesis Fija", marca: "REMANIUM", precioBs: 71.0, precioUsd: 8.88 },
  { id: "uva-4", nombre: "PERNO MUÑON", categoria: "Prótesis Fija", marca: "REMANIUM", precioBs: 56.0, precioUsd: 7.00 },
  { id: "uva-5", nombre: "CORONA JACKET ACRILICO", categoria: "Prótesis Fija", marca: "ACRILICO", precioBs: 51.0, precioUsd: 6.38 },
  { id: "uva-6", nombre: "CORONA VEENER ACRILICO", categoria: "Prótesis Fija", marca: "ACRILICO", precioBs: 71.0, precioUsd: 8.88 },
  { id: "uva-7", nombre: "PROTESIS TOTAL", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 172.0, precioUsd: 21.50 },
  { id: "uva-8", nombre: "CROMO ESQUELETICO", categoria: "Prótesis Removible", marca: "REMANIUM", precioBs: 254.0, precioUsd: 31.75 },
  { id: "uva-9", nombre: "ENFILADO Y ACRILIZADO", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 153.0, precioUsd: 19.13 },
  { id: "uva-10", nombre: "REVASADO DE PROTESIS", categoria: "Prótesis Removible", marca: "ACRILICO", precioBs: 121.0, precioUsd: 15.13 },
  { id: "uva-11", nombre: "INCRUSTACION EN IVOCRON", categoria: "Prótesis Fija", marca: "IVOCRON", precioBs: 176.0, precioUsd: 22.00 },
  { id: "uva-12", nombre: "INCRUSTACION EN PARAFIL", categoria: "Prótesis Fija", marca: "PARAFIL", precioBs: 261.0, precioUsd: 32.63 },
  { id: "uva-13", nombre: "INCRUSTACION EN EMAX PORCE LIBRE METAL", categoria: "Prótesis Fija", marca: "EMAX", precioBs: 601.0, precioUsd: 75.13 },
  { id: "uva-14", nombre: "CORONA JACKET EN IVOCRON", categoria: "Prótesis Fija", marca: "IVOCRON", precioBs: 176.0, precioUsd: 22.00 },
  { id: "uva-15", nombre: "CORONA JACKET EN PARAFIL", categoria: "Prótesis Fija", marca: "PARAFIL", precioBs: 266.0, precioUsd: 33.25 },
  { id: "uva-16", nombre: "CORONA JACKET EMAX PORCE LIBRE MET", categoria: "Prótesis Fija", marca: "EMAX", precioBs: 601.0, precioUsd: 75.13 },
  { id: "uva-17", nombre: "CORONA VEENER EN IVOCRON", categoria: "Prótesis Fija", marca: "IVOCRON", precioBs: 196.0, precioUsd: 24.50 },
  { id: "uva-18", nombre: "CORONA VEENER EN PARAFIL", categoria: "Prótesis Fija", marca: "PARAFIL", precioBs: 296.0, precioUsd: 37.00 },
  { id: "uva-19", nombre: "CORONA VEENER EN PORCELANA", categoria: "Prótesis Fija", marca: "PORCELANA", precioBs: 361.0, precioUsd: 45.13 },
  { id: "uva-20", nombre: "CORONA METALOPLASTICA EN IVOCRON", categoria: "Prótesis Fija", marca: "IVOCRON", precioBs: 196.0, precioUsd: 24.50 },
  { id: "uva-21", nombre: "CORONA METALOPLASTICA EN PARAFIL", categoria: "Prótesis Fija", marca: "PARAFIL", precioBs: 296.0, precioUsd: 37.00 },
  { id: "uva-22", nombre: "CORONA METAL CERAMICA O PORCELANA", categoria: "Prótesis Fija", marca: "PORCELANA", precioBs: 371.0, precioUsd: 46.38 },
];

/**
 * Obtiene el catálogo correspondiente al tipo de tarifa institucional o clínica
 */
export function getCatalogoByTarifa(
  tarifa: "regular" | "clinica_usd" | "unitepc" | "univalle" | string
): ItemCatalogo[] {
  if (tarifa === "unitepc" || tarifa === "institucional_unitepc") {
    return CATALOGO_UNITEPC;
  }
  if (tarifa === "univalle" || tarifa === "institucional_univalle") {
    return CATALOGO_UNIVALLE;
  }
  return CATALOGO_OFICIAL;
}

/**
 * Carga el catálogo de trabajos desde Supabase con fallback inmediato a CATALOGO_OFICIAL
 */
export async function fetchCatalogo(): Promise<ItemCatalogo[]> {
  try {
    const { data, error } = await supabase
      .from("catalogo_trabajos")
      .select("id, nombre, categoria, marca, precio_usd, precio_bs")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: String(d.id),
        nombre: d.nombre,
        categoria: d.categoria || "Otros",
        marca: d.marca || "",
        precioUsd: Number(d.precio_usd) || 0,
        precioBs: Number(d.precio_bs) || Number(d.precio_usd) * 8.0,
      }));
    }
  } catch (e) {
    console.warn("Fallo lectura catalogo_trabajos de Supabase, usando catálogo oficial estático:", e);
  }

  return CATALOGO_OFICIAL;
}

/**
 * Calcula el desglose de precio según el trabajo seleccionado, cantidad de piezas,
 * y la tarifa del doctor (con soporte a convenios universitarios UNITEPC y UNIVALLE en Bs,
 * o clínicas privadas en $ USD).
 */
export function calculateTrabajoPrice({
  item,
  customNombre,
  customPrecioUsd,
  customPrecioBs,
  cantidadPiezas = 1,
  tipoTarifa = "regular",
  descuentoPorcentaje = 0,
  tipoCambio = getCachedExchangeRate(),
}: {
  item?: ItemCatalogo | null;
  customNombre?: string;
  customPrecioUsd?: number;
  customPrecioBs?: number;
  cantidadPiezas?: number;
  tipoTarifa?: "regular" | "descuento_normal" | "unitepc" | "univalle" | "institucional_universidad" | string;
  descuentoPorcentaje?: number;
  tipoCambio?: number;
}): {
  unitarioUsd: number;
  unitarioBs: number;
  subtotalUsd: number;
  subtotalBs: number;
  descuentoPct: number;
  descuentoMontoBs: number;
  totalUsd: number;
  totalBs: number;
  cantidad: number;
  nombreTrabajo: string;
} {
  const piezas = Math.max(1, cantidadPiezas || 1);
  const rate = tipoCambio > 0 ? tipoCambio : DEFAULT_EXCHANGE_RATE;

  let unitarioUsd = 0;
  let unitarioBs = 0;
  let nombreTrabajo = "";

  const isUnitepc = tipoTarifa === "unitepc" || tipoTarifa === "institucional_unitepc";
  const isUnivalle = tipoTarifa === "univalle" || tipoTarifa === "institucional_univalle";

  if (item) {
    nombreTrabajo = item.nombre;
    // Si la tarifa es convenio universitario, el precio maestro es en Bs
    if (isUnitepc || isUnivalle || item.id.startsWith("uni-") || item.id.startsWith("uva-")) {
      unitarioBs = item.precioBs;
      unitarioUsd = Number((unitarioBs / rate).toFixed(2));
    } else {
      // Clínicas privadas: el precio maestro es en USD
      unitarioUsd = item.precioUsd;
      unitarioBs = Number((unitarioUsd * rate).toFixed(2));
    }
  } else if (customPrecioBs && customPrecioBs > 0) {
    unitarioBs = customPrecioBs;
    unitarioUsd = Number((customPrecioBs / rate).toFixed(2));
    nombreTrabajo = customNombre?.trim() || "Trabajo personalizado";
  } else if (customPrecioUsd && customPrecioUsd > 0) {
    unitarioUsd = customPrecioUsd;
    unitarioBs = Number((customPrecioUsd * rate).toFixed(2));
    nombreTrabajo = customNombre?.trim() || "Trabajo personalizado";
  }

  const subtotalUsd = Number((unitarioUsd * piezas).toFixed(2));
  const subtotalBs = Number((unitarioBs * piezas).toFixed(2));

  let appliedDiscountPct = 0;
  if (descuentoPorcentaje > 0) {
    appliedDiscountPct = descuentoPorcentaje;
  } else if (tipoTarifa === "descuento_normal") {
    appliedDiscountPct = 10;
  }

  const factor = (100 - appliedDiscountPct) / 100;
  const totalUsd = Number((subtotalUsd * factor).toFixed(2));
  const totalBs = Number((subtotalBs * factor).toFixed(2));
  const descuentoMontoBs = Number((subtotalBs - totalBs).toFixed(2));

  return {
    unitarioUsd,
    unitarioBs,
    subtotalUsd,
    subtotalBs,
    descuentoPct: appliedDiscountPct,
    descuentoMontoBs,
    totalUsd,
    totalBs,
    cantidad: piezas,
    nombreTrabajo,
  };
}
