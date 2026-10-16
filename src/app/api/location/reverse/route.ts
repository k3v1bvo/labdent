import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng") || searchParams.get("lon");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Parámetros lat y lng requeridos" },
      { status: 400 }
    );
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "GuiselaLabDent/1.0 (contacto@guiseladental.com)",
        "Accept-Language": "es",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { address: `Ubicación (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})` },
        { status: 200 }
      );
    }

    const data = await res.json();
    if (data && data.display_name) {
      const a = data.address || {};
      const road = a.road || a.pedestrian || a.suburb || a.footway || "";
      const houseNumber = a.house_number ? `#${a.house_number}` : "";
      const neighbourhood = a.neighbourhood || a.suburb || a.city_district || "";
      const city = a.city || a.town || a.municipality || "Bolivia";

      const friendlyAddress =
        [road, houseNumber, neighbourhood, city].filter(Boolean).join(", ") ||
        data.display_name.split(",").slice(0, 3).join(",");

      return NextResponse.json({
        address: friendlyAddress,
        displayName: data.display_name,
        raw: data,
      });
    }

    return NextResponse.json({
      address: `Ubicación (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})`,
    });
  } catch (err: any) {
    console.warn("Geocoding reverse error:", err);
    return NextResponse.json(
      { address: `Ubicación (${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)})` },
      { status: 200 }
    );
  }
}
