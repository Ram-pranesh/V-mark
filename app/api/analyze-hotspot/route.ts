import { NextRequest, NextResponse } from "next/server"

function parseCsvToFireData(csvText: string, sourceName: string) {
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",")
    if (values.length < headers.length) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || ""
    })

    const lat = parseFloat(row.latitude)
    const lon = parseFloat(row.longitude)
    if (isNaN(lat) || isNaN(lon)) continue

    let confidence = 0
    const confVal = row.confidence || "0"
    if (confVal === "nominal" || confVal === "n") confidence = 50
    else if (confVal === "low" || confVal === "l") confidence = 30
    else if (confVal === "high" || confVal === "h") confidence = 90
    else confidence = parseFloat(confVal) || 0

    if (confidence < 30) continue

    data.push({
      latitude: lat,
      longitude: lon,
      brightness: parseFloat(row.brightness) || 0,
      bright_ti4: parseFloat(row.bright_ti4) || 0,
      confidence,
      acq_date: row.acq_date || "",
      acq_time: row.acq_time || "",
      source: sourceName,
    })
  }
  return data
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const latParam = searchParams.get("lat")
  const lonParam = searchParams.get("lon")

  if (!latParam || !lonParam) {
    return NextResponse.json(
      { error: "Missing lat/lon parameters" },
      { status: 400 }
    )
  }

  const lat = parseFloat(latParam)
  const lon = parseFloat(lonParam)
  const source = searchParams.get("source") || "VIIRS_NOAA20_NRT"
  const apiKey = process.env.FIRMS_MAP_KEY

  if (!apiKey) {
    return NextResponse.json({ error: "No API Key" }, { status: 400 })
  }

  try {
    const delta = 0.2
    const west = lon - delta
    const south = lat - delta
    const east = lon + delta
    const north = lat + delta

    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${source}/${west},${south},${east},${north}/5`
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) })

    if (resp.ok) {
      const csvText = await resp.text()
      const fireData = parseCsvToFireData(csvText, source)

      const nearbyPoints = fireData.filter(
        (p) =>
          Math.pow(p.latitude - lat, 2) + Math.pow(p.longitude - lon, 2) <
          0.0001
      )

      if (nearbyPoints.length > 0) {
        const byDate: Record<string, typeof nearbyPoints> = {}
        for (const p of nearbyPoints) {
          if (p.acq_date) {
            if (!byDate[p.acq_date]) byDate[p.acq_date] = []
            byDate[p.acq_date].push(p)
          }
        }

        const dailyStats = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, points]) => ({
            date,
            avg_confidence:
              points.reduce((s, p) => s + p.confidence, 0) / points.length,
            avg_brightness:
              points.reduce((s, p) => s + p.brightness, 0) / points.length,
            hotspot_count: points.length,
          }))

        return NextResponse.json({
          verified: true,
          stage1_result: {
            latitude: lat,
            longitude: lon,
            confidence:
              dailyStats[dailyStats.length - 1]?.avg_confidence || 0,
            daily_stats: dailyStats,
            source,
          },
          stage2_verified: false,
        })
      }
    }

    return NextResponse.json({
      verified: false,
      reason: "No nearby fire data found",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
