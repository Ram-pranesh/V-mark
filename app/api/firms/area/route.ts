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

  const source = searchParams.get("source")
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
    return new NextResponse(csvText, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
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
