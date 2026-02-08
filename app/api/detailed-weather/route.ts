import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 })
  }

  try {
    const weatherParams = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      hourly:
        "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,vapour_pressure_deficit,soil_moisture_0_to_1cm,soil_moisture_9_to_27cm,cape",
      past_days: "5",
      forecast_days: "1",
    })

    const airParams = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      hourly:
        "pm2_5,aerosol_optical_depth,carbon_monoxide,nitrogen_dioxide,carbon_dioxide",
      domains: "cams_global",
      past_days: "5",
      forecast_days: "1",
    })

    const [weatherResp, airResp] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`,
        { signal: AbortSignal.timeout(15000) }
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?${airParams.toString()}`,
        { signal: AbortSignal.timeout(15000) }
      ),
    ])

    const weatherData = await weatherResp.json()
    const airData = await airResp.json()

    if (!weatherData.hourly) {
      return NextResponse.json(
        { error: "No weather data available" },
        { status: 500 }
      )
    }

    const hourly = weatherData.hourly
    const airHourly = airData.hourly || {}
    const times = hourly.time || []

    const records = times.map((time: string, i: number) => ({
      date: time,
      temperature_2m: hourly.temperature_2m?.[i] ?? null,
      relative_humidity_2m: hourly.relative_humidity_2m?.[i] ?? null,
      precipitation: hourly.precipitation?.[i] ?? null,
      wind_speed_10m: hourly.wind_speed_10m?.[i] ?? null,
      wind_direction_10m: hourly.wind_direction_10m?.[i] ?? null,
      wind_gusts_10m: hourly.wind_gusts_10m?.[i] ?? null,
      vapour_pressure_deficit: hourly.vapour_pressure_deficit?.[i] ?? null,
      soil_moisture_0_to_1cm: hourly.soil_moisture_0_to_1cm?.[i] ?? null,
      soil_moisture_9_to_27cm: hourly.soil_moisture_9_to_27cm?.[i] ?? null,
      cape: hourly.cape?.[i] ?? null,
      pm2_5: airHourly.pm2_5?.[i] ?? null,
      aerosol_optical_depth: airHourly.aerosol_optical_depth?.[i] ?? null,
      carbon_monoxide: airHourly.carbon_monoxide?.[i] ?? null,
      nitrogen_dioxide: airHourly.nitrogen_dioxide?.[i] ?? null,
      carbon_dioxide: airHourly.carbon_dioxide?.[i] ?? null,
    }))

    return NextResponse.json(records)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
