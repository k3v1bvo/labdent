import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const query = encodeURIComponent(`${q.trim()}, Bolivia`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=bo&limit=6&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "GuiselaLabDent/1.0 (contacto@guiseladental.com)",
        "Accept-Language": "es",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    return NextResponse.json({ results: Array.isArray(data) ? data : [] });
  } catch (err: any) {
    console.warn("Geocoding search error:", err);
    return NextResponse.json({ results: [] });
  }
}
