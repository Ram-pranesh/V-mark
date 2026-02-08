import { NextRequest, NextResponse } from "next/server"

const SOURCE_NAME_MAP: Record<string, string> = {
  MODIS_NRT: "MODIS Terra/Aqua",
  VIIRS_SNPP_NRT: "VIIRS SNPP",
  VIIRS_NOAA20_NRT: "VIIRS NOAA-20",
}

function parseCsvToFireData(csvText: string, sourceName: string) {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",")
    if (values.length < headers.length) continue

    const row: Record<string, string | number> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || ""
    })

    const lat = parseFloat(row.latitude as string)
    const lon = parseFloat(row.longitude as string)
    if (isNaN(lat) || isNaN(lon)) continue

    let confidence = 0
    const confVal = (row.confidence || "0") as string
    if (confVal === "nominal" || confVal === "n") confidence = 50
    else if (confVal === "low" || confVal === "l") confidence = 30
    else if (confVal === "high" || confVal === "h") confidence = 90
    else confidence = parseFloat(confVal) || 0

    if (confidence < 60) continue

    let severity = "low"
    if (confidence >= 80) severity = "high"
    else if (confidence >= 60) severity = "medium"

    data.push({
      latitude: lat,
      longitude: lon,
      brightness: parseFloat(row.brightness as string) || 0,
      bright_ti4: parseFloat(row.bright_ti4 as string) || 0,
      bright_ti5: parseFloat(row.bright_ti5 as string) || 0,
      frp: parseFloat(row.frp as string) || 0,
      confidence,
      acq_date: row.acq_date || "",
      acq_time: row.acq_time || "",
      satellite: row.satellite || "",
      source: sourceName,
      severity,
    })
  }

  return data
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const apiKey = process.env.FIRMS_MAP_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "FIRMS_MAP_KEY not configured" },
      { status: 400 }
    )
  }

  const source = searchParams.get("source") || ""
  const west = searchParams.get("west")
  const south = searchParams.get("south")
  const east = searchParams.get("east")
  const north = searchParams.get("north")
  const days = searchParams.get("days") || "1"

  if (!source || !west || !south || !east || !north) {
    return NextResponse.json(
      { error: "Missing required query params" },
      { status: 400 }
    )
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${source}/${west},${south},${east},${north}/${days}`

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(20000),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json(
        {
          error: "FIRMS request failed",
          status: resp.status,
          details: text.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const csvText = await resp.text()
    const cleanSourceName = SOURCE_NAME_MAP[source] || source
    const fireData = parseCsvToFireData(csvText, cleanSourceName)

    return NextResponse.json({
      type: "FeatureCollection",
      features: fireData.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        properties: point,
      })),
      metadata: {
        total_detections: csvText.trim().split("\n").length - 1,
        filtered_detections: fireData.length,
        source: cleanSourceName,
        date_range_days: days,
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: "FIRMS request failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    )
  }
}
