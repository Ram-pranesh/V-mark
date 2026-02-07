"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface WeatherChartProps {
  weatherData: any[];
  loading: boolean;
}

const metrics = [
  { key: "temp_wind", label: "Temp & Wind" },
  { key: "pm25", label: "PM2.5" },
  { key: "co", label: "CO" },
  { key: "co2", label: "CO2" },
  { key: "no2", label: "NO2" },
  { key: "humidity", label: "Humidity" },
];

export function WeatherChart({ weatherData, loading }: WeatherChartProps) {
  const [activeMetric, setActiveMetric] = useState("temp_wind");

  // Process data for chart - sample every 3 hours for readability
  const chartData = weatherData
    .filter((_, i) => i % 3 === 0)
    .map((d) => ({
      time: new Date(d.date).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      }),
      temperature: d.temperature_2m,
      wind: d.wind_speed_10m,
      pm25: d.pm2_5,
      co: d.carbon_monoxide,
      co2: d.carbon_dioxide,
      no2: d.nitrogen_dioxide,
      humidity: d.relative_humidity_2m,
    }));

  const getLines = () => {
    switch (activeMetric) {
      case "temp_wind":
        return (
          <>
            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#ff6b35"
              strokeWidth={2}
              dot={false}
              name="Temperature (\u00b0C)"
            />
            <Line
              type="monotone"
              dataKey="wind"
              stroke="#4aa8ff"
              strokeWidth={2}
              dot={false}
              name="Wind (m/s)"
            />
          </>
        );
      case "pm25":
        return (
          <Line
            type="monotone"
            dataKey="pm25"
            stroke="#ffd700"
            strokeWidth={2}
            dot={false}
            name="PM2.5 (\u00b5g/m\u00b3)"
          />
        );
      case "co":
        return (
          <Line
            type="monotone"
            dataKey="co"
            stroke="#dc143c"
            strokeWidth={2}
            dot={false}
            name="CO (\u00b5g/m\u00b3)"
          />
        );
      case "co2":
        return (
          <Line
            type="monotone"
            dataKey="co2"
            stroke="#00c851"
            strokeWidth={2}
            dot={false}
            name="CO2 (ppm)"
          />
        );
      case "no2":
        return (
          <Line
            type="monotone"
            dataKey="no2"
            stroke="#4aa8ff"
            strokeWidth={2}
            dot={false}
            name="NO2 (\u00b5g/m\u00b3)"
          />
        );
      case "humidity":
        return (
          <Line
            type="monotone"
            dataKey="humidity"
            stroke="#ff6b35"
            strokeWidth={2}
            dot={false}
            name="Humidity (%)"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-foreground">Weather Trends</h2>
        <div className="flex flex-wrap gap-1">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeMetric === m.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f2e" />
              <XAxis
                dataKey="time"
                stroke="#8b8b9e"
                fontSize={10}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#8b8b9e" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#111118",
                  border: "1px solid #1f1f2e",
                  borderRadius: "8px",
                  color: "#e8e8ed",
                  fontSize: "12px",
                }}
              />
              <Legend />
              {getLines()}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
