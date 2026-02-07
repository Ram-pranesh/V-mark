import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DEFAULT_CENTER: [78.9629, 20.5937],
    DEFAULT_ZOOM: 4,
    OPENWEATHER_KEY: process.env.OPENWEATHER_KEY || "",
    FIRMS_MAP_KEY: process.env.FIRMS_MAP_KEY || "",
    ENABLE_FIRMS_WMS: "false",
  });
}
