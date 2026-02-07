"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { StatsCards } from "./stats-cards";
import { WeatherChart } from "./weather-chart";
import { FireDataTable } from "./fire-data-table";
import { AirQualityPanel } from "./air-quality-panel";

export function DashboardContent() {
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 20.5937,
    lng: 78.9629,
    name: "India (Default)",
  });
  const [searchInput, setSearchInput] = useState("");

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/detailed-weather?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setWeatherData(data);
      }
    } catch (err) {
      console.error("Failed to fetch weather data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  const handleSearch = async () => {
    if (!searchInput.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setSelectedLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          name: data[0].display_name.split(",")[0],
        });
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }
  };

  // Get current metrics from most recent data
  const currentData = weatherData.length
    ? weatherData.reduce((prev, curr) =>
        Math.abs(new Date(curr.date).getTime() - Date.now()) <
        Math.abs(new Date(prev.date).getTime() - Date.now())
          ? curr
          : prev
      )
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Real-time atmospheric and fire detection data for{" "}
            <span className="font-medium text-primary">
              {selectedLocation.name}
            </span>
          </p>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search location..."
              className="h-10 w-64 rounded-lg border border-border bg-card pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards currentData={currentData} loading={loading} />

      {/* Charts Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WeatherChart weatherData={weatherData} loading={loading} />
        </div>
        <div>
          <AirQualityPanel currentData={currentData} loading={loading} />
        </div>
      </div>

      {/* Fire Data Table */}
      <div className="mt-8">
        <FireDataTable />
      </div>
    </div>
  );
}
