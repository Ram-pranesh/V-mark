import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") || "VIIRS_SNPP_NRT";
  const west = searchParams.get("west") || "-180";
  const south = searchParams.get("south") || "-90";
  const east = searchParams.get("east") || "180";
  const north = searchParams.get("north") || "90";
  const days = searchParams.get("days") || "1";

  const apiKey = process.env.FIRMS_MAP_KEY;
  if (!apiKey) {
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      metadata: { filtered_detections: 0 },
    });
  }

  try {
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/${source}/${west},${south},${east},${north}/${days}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({
        type: "FeatureCollection",
        features: [],
        metadata: { filtered_detections: 0 },
      });
    }

    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({
        type: "FeatureCollection",
        features: [],
        metadata: { filtered_detections: 0 },
      });
    }

    const headers = lines[0].toLowerCase().split(",");
    const latIdx = headers.indexOf("latitude");
    const lonIdx = headers.indexOf("longitude");
    const frpIdx = headers.indexOf("frp");
    const confIdx = headers.indexOf("confidence");
    const dateIdx = headers.indexOf("acq_date");
    const timeIdx = headers.indexOf("acq_time");
    const brightIdx = headers.findIndex((h: string) => h.includes("bright"));

    const features = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const lat = parseFloat(cols[latIdx]);
      const lon = parseFloat(cols[lonIdx]);
      if (isNaN(lat) || isNaN(lon)) continue;

      const confidence = cols[confIdx] || "nominal";
      let confNorm = 50;
      if (typeof confidence === "string") {
        if (confidence === "h" || confidence === "high") confNorm = 90;
        else if (confidence === "n" || confidence === "nominal") confNorm = 60;
        else if (confidence === "l" || confidence === "low") confNorm = 30;
        else {
          const parsed = parseInt(confidence);
          if (!isNaN(parsed)) confNorm = parsed;
        }
      }

      let color = "#ffff00";
      let label = "Active";
      if (confNorm >= 90) {
        color = "#FF8C00";
        label = "Stage 1";
      } else if (confNorm >= 60) {
        color = "#ffff00";
        label = "Medium";
      } else {
        color = "#00C851";
        label = "Low";
      }

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          frp: parseFloat(cols[frpIdx]) || 10,
          confidence,
          confidence_normalized: confNorm,
          acq_date: cols[dateIdx] || "",
          acq_time: cols[timeIdx] || "",
          brightness: parseFloat(cols[brightIdx]) || 300,
          source,
          display_color: color,
          severity_label: label,
        },
      });
    }

    return NextResponse.json({
      type: "FeatureCollection",
      features,
      metadata: { filtered_detections: features.length },
    });
  } catch (error) {
    console.error("FIRMS API error:", error);
    return NextResponse.json({
      type: "FeatureCollection",
      features: [],
      metadata: { filtered_detections: 0 },
    });
  }
}
