import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 })
  }

  const apiKey = process.env.OPENWEATHER_KEY
  if (!apiKey) {
    return NextResponse.json({ name: `${lat}, ${lon}` })
  }

  try {
    const url = `http://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })

    if (resp.ok) {
      const data = await resp.json()
      if (data && data.length > 0) {
        const location = data[0]
        const nameParts = []
        if (location.name) nameParts.push(location.name)
        if (location.state) nameParts.push(location.state)
        if (location.country) nameParts.push(location.country)

        return NextResponse.json({
          name: nameParts.join(", "),
          latitude: lat,
          longitude: lon,
        })
      }
    }

    return NextResponse.json({ name: `${lat}, ${lon}` })
  } catch {
    return NextResponse.json({ name: `${lat}, ${lon}` })
  }
}
