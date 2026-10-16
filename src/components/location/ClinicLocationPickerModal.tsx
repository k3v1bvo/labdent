"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Navigation,
  Search,
  Check,
  X,
  Loader2,
  Building2,
  Crosshair,
  Compass,
} from "lucide-react";
import { toast } from "sonner";

// Coordenadas por defecto (La Paz, Bolivia - Zona Central)
const DEFAULT_LAT = -16.4955;
const DEFAULT_LNG = -68.1336;

export interface ClinicLocationPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaNombre?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  onConfirm: (result: { direccion: string; lat: number; lng: number }) => void;
}

export function ClinicLocationPickerModal({
  open,
  onOpenChange,
  clinicaNombre = "Clínica Dental",
  initialLat,
  initialLng,
  initialAddress = "",
  onConfirm,
}: ClinicLocationPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(initialLat || DEFAULT_LAT);
  const [lng, setLng] = useState<number>(initialLng || DEFAULT_LNG);
  const [address, setAddress] = useState<string>(initialAddress);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Inicializar o actualizar coordenadas cuando abre el modal
  useEffect(() => {
    if (open) {
      const activeLat = initialLat && !isNaN(initialLat) ? initialLat : DEFAULT_LAT;
      const activeLng = initialLng && !isNaN(initialLng) ? initialLng : DEFAULT_LNG;
      setLat(activeLat);
      setLng(activeLng);
      setAddress(initialAddress || "");
    }
  }, [open, initialLat, initialLng, initialAddress]);

  // Reverse geocoding para obtener la dirección legible a partir de coordenadas
  async function fetchAddressFromCoords(latitude: number, longitude: number) {
    setIsReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "es",
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          // Extraer partes relevantes para una dirección corta y amigable
          const a = data.address || {};
          const road = a.road || a.pedestrian || a.suburb || "";
          const houseNumber = a.house_number ? `#${a.house_number}` : "";
          const neighbourhood = a.neighbourhood || a.suburb || a.city_district || "";
          const city = a.city || a.town || "La Paz";

          const friendlyAddress = [road, houseNumber, neighbourhood, city]
            .filter(Boolean)
            .join(", ") || data.display_name.split(",").slice(0, 3).join(",");

          setAddress(friendlyAddress);
        }
      }
    } catch (err) {
      console.warn("Reverse geocode err:", err);
    } finally {
      setIsReverseGeocoding(false);
    }
  }

  // Inicializar Leaflet dinámicamente cuando el modal está abierto
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Limpiar instancia previa si existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const activeLat = lat;
      const activeLng = lng;

      // Crear mapa Leaflet
      const map = L.map(mapContainerRef.current, {
        center: [activeLat, activeLng],
        zoom: 16,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      // Capa de tiles OpenStreetMap en español
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Icono de Pin Personalizado Guisela (Púrpura Dental con Pulso)
      const customPinIcon = L.divIcon({
        className: "custom-clinic-pin",
        html: `
          <div style="position: relative; width: 44px; height: 44px; transform: translate(-50%, -100%);">
            <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 14px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(2px);"></div>
            <div style="position: absolute; top: 0; left: 0; width: 44px; height: 44px; background: #3C1C6C; border: 3px solid #FFFFFF; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 8px 16px rgba(60,28,108,0.4); display: flex; align-items: center; justify-content: center;">
              <div style="transform: rotate(45deg); color: #FFFFFF; font-size: 18px; font-weight: bold; line-height: 1;">📍</div>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 44],
      });

      // Crear Marcador arrastrable
      const marker = L.marker([activeLat, activeLng], {
        icon: customPinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);
      markerRef.current = marker;

      // Popup informativo
      marker.bindPopup(`<b>${clinicaNombre}</b><br/>Arrastra este pin o toca el mapa para fijar la entrada`).openPopup();

      // Evento: Al arrastrar el pin
      marker.on("dragend", (e: any) => {
        const newPos = e.target.getLatLng();
        setLat(newPos.lat);
        setLng(newPos.lng);
        fetchAddressFromCoords(newPos.lat, newPos.lng);
      });

      // Evento: Al hacer clic en cualquier lugar del mapa
      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        setLat(clickLat);
        setLng(clickLng);
        fetchAddressFromCoords(clickLat, clickLng);
      });

      // Ajustar tamaño tras renderizado del modal
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open]);

  // Mover el pin y centrar el mapa en coordenadas específicas
  function moveToCoords(newLat: number, newLng: number, zoom = 17) {
    setLat(newLat);
    setLng(newLng);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.flyTo([newLat, newLng], zoom, { duration: 1.2 });
    }

    fetchAddressFromCoords(newLat, newLng);
  }

  // Obtener GPS del teléfono o computador
  function handleUseCurrentGps() {
    if (!navigator.geolocation) {
      toast.error("Tu dispositivo no soporta geolocalización GPS.");
      return;
    }

    setIsDetectingGps(true);
    toast.info("🛰️ Obteniendo señal GPS precisa de tu dispositivo...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const { latitude, longitude } = pos.coords;
        moveToCoords(latitude, longitude, 17);
        toast.success("✅ ¡Ubicación GPS detectada con éxito!");
      },
      (err) => {
        setIsDetectingGps(false);
        console.warn("GPS error:", err);
        toast.error("No se pudo obtener el GPS. Por favor permite el acceso a ubicación en tu navegador o selecciona en el mapa.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  // Búsqueda de calles o lugares en Bolivia vía Nominatim
  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, Bolivia`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=bo&limit=5&addressdetails=1`,
        {
          headers: { "Accept-Language": "es" },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          toast.info("No encontramos esa dirección exacta. Puedes tocar en el mapa para ubicarla.");
        }
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al buscar en el mapa.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelectSearchResult(item: any) {
    const sLat = parseFloat(item.lat);
    const sLng = parseFloat(item.lon);
    setSearchResults([]);
    setSearchQuery("");
    moveToCoords(sLat, sLng, 17);
  }

  function handleSave() {
    if (!lat || !lng) {
      toast.error("Debes seleccionar una ubicación en el mapa");
      return;
    }

    const finalAddress = address.trim() || `Consultorio Dental (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
    onConfirm({
      direccion: finalAddress,
      lat,
      lng,
    });

    toast.success("📍 Ubicación del consultorio guardada correctamente");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] p-0 overflow-hidden rounded-3xl border border-purple-200 shadow-2xl bg-white flex flex-col">
        <DialogHeader className="p-4 bg-gradient-to-r from-[#1B0B2E] via-[#3C1C6C] to-[#6329B7] text-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <MapPin className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Ubicación GPS de tu Clínica / Consultorio
              </DialogTitle>
              <p className="text-xs text-purple-200">
                Fija el pin exacto para envíos en moto, taxi o recogida de trabajos
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Búsqueda y GPS */}
        <div className="p-3 bg-purple-50/70 border-b border-purple-100 space-y-2.5 shrink-0">
          <div className="flex gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative flex">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar calle, edificio, avenida o zona en Bolivia..."
                className="h-10 text-xs pr-9 rounded-xl border-purple-200 bg-white shadow-2xs"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={isSearching}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-[#3C1C6C] hover:bg-purple-100 rounded-lg"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </form>

            <Button
              type="button"
              onClick={handleUseCurrentGps}
              disabled={isDetectingGps}
              className="h-10 px-3 bg-[#3C1C6C] hover:bg-[#2C1450] text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Detectando GPS...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mi Ubicación GPS</span>
                </>
              )}
            </Button>
          </div>

          {/* Resultados de búsqueda flotantes si hay */}
          {searchResults.length > 0 && (
            <div className="bg-white border border-purple-200 rounded-2xl shadow-lg p-1.5 space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2 rounded-xl text-xs hover:bg-purple-50 flex items-start gap-2 text-slate-700 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#3C1C6C] mt-0.5 shrink-0" />
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contenedor del Mapa Interactivo */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[380px] w-full bg-slate-100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Tooltip flotante informativo */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-purple-200/90 shadow-md text-[11px] font-bold text-[#3C1C6C] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#A57CFA]" />
            <span>Toca el mapa o arrastra el pin para ajustar la entrada</span>
          </div>

          {/* Indicador de coordenadas en esquina inferior */}
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-600 font-mono shadow-xs">
            GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>

        {/* Pie de confirmación con dirección editable */}
        <div className="p-4 bg-white border-t border-purple-100 space-y-3 shrink-0 text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#A57CFA]" />
                Dirección / Referencia Confirmada:
              </label>
              {isReverseGeocoding && (
                <span className="text-[11px] text-purple-600 flex items-center gap-1 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" /> Obteniendo nombre de calle...
                </span>
              )}
            </div>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Arce #2450, Edificio Multicentro, Torre B, Piso 5..."
              className="h-10 text-xs rounded-xl border-slate-300 focus:border-[#3C1C6C]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100 px-4 cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              className="h-10 rounded-xl bg-[#3C1C6C] hover:bg-[#2C1450] text-white text-xs font-bold px-6 shadow-md shadow-purple-950/20 gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              Confirmar Ubicación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
