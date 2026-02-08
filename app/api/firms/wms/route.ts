import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const apiKey = process.env.FIRMS_MAP_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "FIRMS_MAP_KEY not configured" },
      { status: 400 }
    )
  }

  const layers = searchParams.get("layers")
  const bbox = searchParams.get("bbox")
  if (!layers || !bbox) {
    return NextResponse.json(
      { error: "Missing required query params" },
      { status: 400 }
    )
  }

  const params = new URLSearchParams({
    service: searchParams.get("service") || "WMS",
    request: searchParams.get("request") || "GetMap",
    version: searchParams.get("version") || "1.1.1",
    styles: searchParams.get("styles") || "",
    format: searchParams.get("format") || "image/png",
    transparent: searchParams.get("transparent") || "true",
    height: searchParams.get("height") || "256",
    width: searchParams.get("width") || "256",
    srs: searchParams.get("srs") || "EPSG:3857",
    layers,
    bbox,
    MAP_KEY: apiKey,
    map_key: apiKey,
    key: apiKey,
  })

  const timeParam = searchParams.get("time")
  if (timeParam) params.set("time", timeParam)

  try {
    const resp = await fetch(
      `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/?${params.toString()}`,
      { signal: AbortSignal.timeout(45000) }
    )

    const contentType =
      resp.headers.get("Content-Type") || "application/octet-stream"
    const buffer = await resp.arrayBuffer()

    return new NextResponse(Buffer.from(buffer), {
      status: resp.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: "FIRMS WMS request failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    )
  }
}
