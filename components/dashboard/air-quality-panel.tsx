"use client";

import { cn } from "@/lib/utils";

interface AirQualityPanelProps {
  currentData: any;
  loading: boolean;
}

const pollutants = [
  {
    key: "carbon_monoxide",
    label: "CO",
    unit: "\u00b5g/m\u00b3",
    thresholds: [4400, 10000, 17000],
    colors: ["text-chart-3", "text-chart-4", "text-chart-1", "text-chart-5"],
  },
  {
    key: "nitrogen_dioxide",
    label: "NO2",
    unit: "\u00b5g/m\u00b3",
    thresholds: [40, 70, 150],
    colors: ["text-chart-3", "text-chart-4", "text-chart-1", "text-chart-5"],
  },
  {
    key: "pm2_5",
    label: "PM2.5",
    unit: "\u00b5g/m\u00b3",
    thresholds: [10, 25, 50],
    colors: ["text-chart-3", "text-chart-4", "text-chart-1", "text-chart-5"],
  },
  {
    key: "carbon_dioxide",
    label: "CO2",
    unit: "ppm",
    thresholds: [400, 600, 1000],
    colors: ["text-chart-3", "text-chart-4", "text-chart-1", "text-chart-5"],
  },
  {
    key: "aerosol_optical_depth",
    label: "AOD",
    unit: "",
    thresholds: [0.1, 0.3, 0.5],
    colors: ["text-chart-3", "text-chart-4", "text-chart-1", "text-chart-5"],
  },
];

function getColorClass(value: number | null, thresholds: number[], colors: string[]) {
  if (value === null || value === undefined) return "text-muted-foreground";
  if (value < thresholds[0]) return colors[0];
  if (value < thresholds[1]) return colors[1];
  if (value < thresholds[2]) return colors[2];
  return colors[3];
}

export function AirQualityPanel({ currentData, loading }: AirQualityPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-bold text-foreground">
        Air Quality Index
      </h2>
      <p className="mb-6 text-xs text-muted-foreground">
        Real-time atmospheric composition analysis
      </p>

      <div className="flex flex-col gap-4">
        {pollutants.map((p) => {
          const value = currentData ? currentData[p.key] : null;
          const colorClass = getColorClass(
            value,
            p.thresholds,
            p.colors
          );

          return (
            <div
              key={p.key}
              className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3"
            >
              <div>
                <span className="text-sm font-semibold text-foreground">
                  {p.label}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {p.unit}
                </span>
              </div>
              <span
                className={cn(
                  "text-lg font-bold",
                  loading ? "animate-pulse text-muted-foreground" : colorClass
                )}
              >
                {loading || value === null || value === undefined
                  ? "--"
                  : typeof value === "number"
                  ? value.toFixed(p.key === "aerosol_optical_depth" ? 3 : 1)
                  : String(value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fire Risk Indicator */}
      <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="mb-1 flex items-center gap-2">
          <svg
            className="h-5 w-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
            />
          </svg>
          <span className="text-sm font-bold text-primary">
            Fire Risk Assessment
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {currentData && currentData.carbon_monoxide > 1000
            ? "Elevated CO levels detected. Possible fire activity in the region."
            : "No anomalous atmospheric indicators detected. Normal conditions."}
        </p>
      </div>
    </div>
  );
}
