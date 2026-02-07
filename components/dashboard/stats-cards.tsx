"use client";

import { cn } from "@/lib/utils";

interface StatsCardsProps {
  currentData: any;
  loading: boolean;
}

const cards = [
  {
    title: "Temperature",
    key: "temperature_2m",
    unit: "\u00b0C",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    title: "Wind Speed",
    key: "wind_speed_10m",
    unit: " m/s",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    title: "Humidity",
    key: "relative_humidity_2m",
    unit: "%",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
      </svg>
    ),
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    title: "PM2.5",
    key: "pm2_5",
    unit: " \u00b5g/m\u00b3",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    title: "CO Level",
    key: "carbon_monoxide",
    unit: " \u00b5g/m\u00b3",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
  {
    title: "CO2 Level",
    key: "carbon_dioxide",
    unit: " ppm",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

export function StatsCards({ currentData, loading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const value = currentData ? currentData[card.key] : null;
        const displayValue =
          value !== null && value !== undefined
            ? typeof value === "number"
              ? value.toFixed(1) + card.unit
              : String(value) + card.unit
            : "--";

        return (
          <div
            key={card.key}
            className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.title}
              </span>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  card.bgColor,
                  card.color
                )}
              >
                {card.icon}
              </div>
            </div>
            <div
              className={cn(
                "text-2xl font-bold",
                loading ? "animate-pulse text-muted-foreground" : "text-foreground"
              )}
            >
              {loading ? "--" : displayValue}
            </div>
          </div>
        );
      })}
    </div>
  );
}
