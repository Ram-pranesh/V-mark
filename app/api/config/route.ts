import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    FIRMS_MAP_KEY: process.env.FIRMS_MAP_KEY || "",
    FIRMS_WMS_URL: process.env.FIRMS_WMS_URL || "/api/firms/wms",
    ENABLE_FIRMS_WMS: process.env.ENABLE_FIRMS_WMS || "false",
    FIRMS_DAYS_DEFAULT: parseInt(process.env.FIRMS_DAYS_DEFAULT || "1", 10),
    FIRMS_DAYS_MAX: 5,
    OPENWEATHER_KEY: process.env.OPENWEATHER_KEY || "",
    SENTINELHUB_INSTANCE_ID: process.env.SENTINELHUB_INSTANCE_ID || "",
    NASA_EARTHDATA_TOKEN: process.env.NASA_EARTHDATA_TOKEN || "",
    DEFAULT_CENTER: [75, 20],
    DEFAULT_ZOOM: 2,
    SENTINEL_WMS_URL:
      process.env.SENTINEL_WMS_URL || "https://tiles.maps.eox.at/wms",
  })
}
