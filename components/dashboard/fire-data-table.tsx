"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FireFeature {
  properties: {
    acq_date: string;
    acq_time: string;
    confidence: string;
    confidence_normalized: number;
    frp: number;
    brightness: number;
    source: string;
    severity_label: string;
    display_color: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

export function FireDataTable() {
  const [fires, setFires] = useState<FireFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState("all");
  const [sortBy, setSortBy] = useState<"frp" | "confidence" | "date">("frp");

  useEffect(() => {
    async function fetchFires() {
      setLoading(true);
      try {
        const sources = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "MODIS_NRT"];
        const allFeatures: FireFeature[] = [];

        for (const source of sources) {
          const res = await fetch(
            `/api/firms/area/processed?source=${source}&west=60&south=5&east=100&north=40&days=1`
          );
          const data = await res.json();
          if (data.features) {
            allFeatures.push(
              ...data.features.slice(0, 50).map((f: any) => ({
                ...f,
                properties: { ...f.properties, source },
              }))
            );
          }
        }
        setFires(allFeatures);
      } catch (err) {
        console.error("Failed to fetch fire data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFires();
  }, []);

  const filteredFires = fires
    .filter(
      (f) =>
        filterSource === "all" || f.properties.source === filterSource
    )
    .sort((a, b) => {
      if (sortBy === "frp") return b.properties.frp - a.properties.frp;
      if (sortBy === "confidence")
        return b.properties.confidence_normalized - a.properties.confidence_normalized;
      return 0;
    })
    .slice(0, 100);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Active Fire Detections
          </h2>
          <p className="text-sm text-muted-foreground">
            {fires.length} hotspots detected in the last 24 hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="h-9 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">All Sources</option>
            <option value="MODIS_NRT">MODIS</option>
            <option value="VIIRS_SNPP_NRT">VIIRS SNPP</option>
            <option value="VIIRS_NOAA20_NRT">VIIRS NOAA-20</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="frp">Sort by FRP</option>
            <option value="confidence">Sort by Confidence</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Location</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">FRP (MW)</th>
              <th className="px-4 py-3 text-left font-medium">Confidence</th>
              <th className="px-4 py-3 text-left font-medium">Brightness</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  Loading fire data...
                </td>
              </tr>
            ) : filteredFires.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No fire detections found. This may be because API keys are not configured.
                </td>
              </tr>
            ) : (
              filteredFires.map((fire, idx) => {
                const p = fire.properties;
                const coords = fire.geometry.coordinates;
                return (
                  <tr
                    key={idx}
                    className="border-b border-border/50 transition-colors hover:bg-secondary/50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: `${p.display_color}15`,
                          color: p.display_color,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: p.display_color }}
                        />
                        {p.severity_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">
                      {coords[1].toFixed(4)}, {coords[0].toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.source.replace("_NRT", "").replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      {p.frp.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.confidence_normalized}%`,
                              backgroundColor: p.display_color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {p.confidence_normalized}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground">
                      {p.brightness.toFixed(1)} K
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.acq_date} {p.acq_time}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
