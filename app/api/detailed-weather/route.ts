import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Missing lat/lng parameters" },
      { status: 400 }
    );
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 5);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,soil_moisture_0_to_1cm,cape&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&timezone=auto`;

    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm2_5,carbon_monoxide,nitrogen_dioxide,carbon_dioxide,aerosol_optical_depth&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}&timezone=auto`;

    const [weatherRes, airRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airUrl),
    ]);

    const weatherData = await weatherRes.json();
    const airData = await airRes.json();

    const hourly = weatherData.hourly || {};
    const airHourly = airData.hourly || {};
    const times = hourly.time || [];

    const combined = times.map((time: string, i: number) => ({
      date: time.replace("T", " "),
      temperature_2m: hourly.temperature_2m?.[i] ?? null,
      relative_humidity_2m: hourly.relative_humidity_2m?.[i] ?? null,
      wind_speed_10m: hourly.wind_speed_10m?.[i] ?? null,
      wind_direction_10m: hourly.wind_direction_10m?.[i] ?? null,
      wind_gusts_10m: hourly.wind_gusts_10m?.[i] ?? null,
      weather_code: hourly.weather_code?.[i] ?? null,
      soil_moisture_0_to_1cm: hourly.soil_moisture_0_to_1cm?.[i] ?? null,
      cape: hourly.cape?.[i] ?? null,
      pm2_5: airHourly.pm2_5?.[i] ?? null,
      carbon_monoxide: airHourly.carbon_monoxide?.[i] ?? null,
      nitrogen_dioxide: airHourly.nitrogen_dioxide?.[i] ?? null,
      carbon_dioxide: airHourly.carbon_dioxide?.[i] ?? null,
      aerosol_optical_depth: airHourly.aerosol_optical_depth?.[i] ?? null,
    }));

    return NextResponse.json(combined);
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}
