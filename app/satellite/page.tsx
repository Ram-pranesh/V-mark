"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SatellitePage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSat, setActiveSat] = useState("arcgis");
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState("satellite");
  const [coordsText, setCoordsText] = useState("Lat: -- | Lng: --");
  const [dateOffset, setDateOffset] = useState(0);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [useGmt, setUseGmt] = useState(false);
  const [sources, setSources] = useState({
    MODIS_NRT: true,
    VIIRS_SNPP_NRT: true,
    VIIRS_NOAA20_NRT: true,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;

    const loadMap = async () => {
      // Load MapLibre dynamically
      const configRes = await fetch("/api/config");
      const config = await configRes.json();
      (window as any).CONFIG = config;

      // Wait for maplibre-gl to be loaded
      if (!(window as any).maplibregl) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@5.8.0/dist/maplibre-gl.css";
        document.head.appendChild(link);

        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/maplibre-gl@5.8.0/dist/maplibre-gl.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      if (cancelled) return;
      const maplibregl = (window as any).maplibregl;

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        center: config.DEFAULT_CENTER,
        zoom: config.DEFAULT_ZOOM,
        maxZoom: 22,
        attributionControl: false,
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: {
            satellite: {
              type: "raster",
              tiles: [
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              ],
              tileSize: 256,
              maxzoom: 17,
            },
            terrainSource: {
              type: "raster-dem",
              tiles: [
                "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
              ],
              encoding: "terrarium",
              tileSize: 256,
              maxzoom: 15,
            },
            osmRoads: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              maxzoom: 18,
            },
            contours: {
              type: "raster",
              tiles: [
                "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
                "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              maxzoom: 15,
            },
          },
          layers: [
            {
              id: "satellite",
              type: "raster",
              source: "satellite",
              paint: { "raster-opacity": 1 },
            },
            {
              id: "osm-roads",
              type: "raster",
              source: "osmRoads",
              layout: { visibility: "none" },
            },
            {
              id: "contours-layer",
              type: "raster",
              source: "contours",
              paint: { "raster-opacity": 1 },
              layout: { visibility: "none" },
            },
          ],
          projection: { type: "globe" },
        },
      });

      (window as any).map = map;
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.ScaleControl(), "bottom-left");

      // Mouse move for coordinates
      map.on("mousemove", (e: any) => {
        setCoordsText(
          `Lat: ${e.lngLat.lat.toFixed(6)} | Lng: ${e.lngLat.lng.toFixed(6)}`
        );
      });

      // Load additional layers after map loads
      map.on("load", () => {
        try { map.setProjection({ type: "globe" }); } catch {}
        try { map.setTerrain({ source: "terrainSource", exaggeration: 1.5 }); } catch {}

        // Sentinel-2
        map.addSource("sentinel-2-source", {
          type: "raster",
          tiles: [
            "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg",
          ],
          tileSize: 256,
          maxzoom: 14,
        });
        map.addLayer({
          id: "sentinel-2",
          type: "raster",
          source: "sentinel-2-source",
          layout: { visibility: "none" },
          paint: { "raster-opacity": 1 },
        });

        // Wind layer
        if (config.OPENWEATHER_KEY) {
          map.addSource("weather-wind", {
            type: "raster",
            tiles: [
              `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${config.OPENWEATHER_KEY}`,
            ],
            tileSize: 256,
          });
          map.addLayer({
            id: "wind-layer",
            type: "raster",
            source: "weather-wind",
            paint: { "raster-opacity": 0.6 },
            layout: { visibility: "none" },
          });

          // Temperature layer
          map.addSource("weather-temp", {
            type: "raster",
            tiles: [
              `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${config.OPENWEATHER_KEY}`,
            ],
            tileSize: 256,
          });
          map.addLayer({
            id: "temp-layer",
            type: "raster",
            source: "weather-temp",
            paint: { "raster-opacity": 0.88 },
            layout: { visibility: "none" },
          });
        }

        // Load fire data
        loadFires(map, config);

        // Weather popup on click
        map.on("click", async (e: any) => {
          const lat = e.lngLat.lat;
          const lng = e.lngLat.lng;
          const popup = new maplibregl.Popup({ closeButton: true, maxWidth: "320px" })
            .setLngLat([lng, lat])
            .setHTML('<div style="color:#333;padding:8px;">Scanning atmosphere...</div>')
            .addTo(map);

          try {
            const [weatherRes, meteoRes] = await Promise.all([
              fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${config.OPENWEATHER_KEY}`
              ),
              fetch(`/api/detailed-weather?lat=${lat}&lng=${lng}`),
            ]);
            const weatherData = await weatherRes.json();
            const meteoData = await meteoRes.json();
            const locationName = weatherData.name || "Target Zone";
            const current =
              meteoData && meteoData.length
                ? meteoData.reduce((prev: any, curr: any) =>
                    Math.abs(new Date(curr.date).getTime() - Date.now()) <
                    Math.abs(new Date(prev.date).getTime() - Date.now())
                      ? curr
                      : prev
                  )
                : null;

            if (current) {
              popup.setHTML(`
                <div style="font-family:system-ui;min-width:200px;color:#333;">
                  <div style="background:#1a1a2e;color:#fff;padding:8px;border-radius:6px 6px 0 0;font-weight:600;">${locationName}</div>
                  <div style="padding:10px;">
                    <div style="font-size:24px;font-weight:bold;margin-bottom:8px;">${Math.round(current.temperature_2m)}\u00b0C</div>
                    <div style="font-size:12px;margin-bottom:4px;">Wind: <b>${current.wind_speed_10m?.toFixed(1)} m/s</b></div>
                    <div style="font-size:12px;margin-bottom:4px;">Humidity: <b>${current.relative_humidity_2m}%</b></div>
                    <hr style="border:0;border-top:1px solid #eee;margin:8px 0;">
                    <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">ATMOSPHERIC (ug/m3)</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
                      <div style="background:#f5f5f5;padding:4px;border-radius:4px;">CO <b style="float:right;">${current.carbon_monoxide?.toFixed(1)}</b></div>
                      <div style="background:#f5f5f5;padding:4px;border-radius:4px;">PM2.5 <b style="float:right;">${current.pm2_5?.toFixed(1)}</b></div>
                      <div style="background:#f5f5f5;padding:4px;border-radius:4px;">NO2 <b style="float:right;">${current.nitrogen_dioxide?.toFixed(1)}</b></div>
                      <div style="background:#f5f5f5;padding:4px;border-radius:4px;">CO2 <b style="float:right;">${current.carbon_dioxide?.toFixed(0)} ppm</b></div>
                    </div>
                  </div>
                </div>
              `);
            }
          } catch {
            popup.setHTML(
              '<div style="color:red;padding:10px;">Unable to retrieve atmospheric data.</div>'
            );
          }
        });
      });
    };

    loadMap();
    return () => { cancelled = true; };
  }, []);

  // Fire data loader
  async function loadFires(map: any, config: any) {
    if (!config.FIRMS_MAP_KEY) return;
    const bounds = map.getBounds();
    const enabledSrcs = Object.entries(sources)
      .filter(([, v]) => v)
      .map(([k]) => k);

    for (const source of enabledSrcs) {
      try {
        const url = `/api/firms/area/processed?source=${source}&west=${bounds.getWest().toFixed(2)}&south=${bounds.getSouth().toFixed(2)}&east=${bounds.getEast().toFixed(2)}&north=${bounds.getNorth().toFixed(2)}&days=${Math.min(5, dateOffset + 1)}`;
        const res = await fetch(url);
        const geojson = await res.json();

        if (map.getSource("fire-source")) {
          const existing = map.getSource("fire-source")._data;
          existing.features = [
            ...existing.features,
            ...geojson.features,
          ];
          map.getSource("fire-source").setData(existing);
        } else {
          map.addSource("fire-source", { type: "geojson", data: geojson });
          map.addLayer({
            id: "fire-glow",
            type: "circle",
            source: "fire-source",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 8, 15],
              "circle-color": ["get", "display_color"],
              "circle-blur": 1,
              "circle-opacity": 0.5,
            },
          });
          map.addLayer({
            id: "fire-points",
            type: "circle",
            source: "fire-source",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 8, 10],
              "circle-color": ["get", "display_color"],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#fff",
            },
          });

          // Fire popup
          map.on("click", "fire-points", (e: any) => {
            const f = e.features[0];
            const p = f.properties;
            const c = f.geometry.coordinates;
            const maplibregl = (window as any).maplibregl;
            new maplibregl.Popup()
              .setLngLat(c)
              .setHTML(`
                <div style="font-family:system-ui;min-width:220px;">
                  <div style="background:#1a1a2e;padding:6px 10px;border-radius:6px 6px 0 0;border-bottom:2px solid ${p.display_color};font-weight:700;font-size:14px;display:flex;justify-content:space-between;align-items:center;color:${p.display_color};">
                    Fire Hotspot
                    <span style="font-size:10px;background:${p.display_color};color:#fff;padding:2px 6px;border-radius:4px;">${p.severity_label}</span>
                  </div>
                  <div style="background:#fff;padding:10px;border-radius:0 0 6px 6px;font-size:12px;color:#333;">
                    <div style="margin-bottom:4px;">Confidence: <b>${p.confidence}</b></div>
                    <div style="margin-bottom:4px;">Intensity: <b>${p.frp} MW</b></div>
                    <div style="margin-bottom:4px;">Brightness: <b>${p.brightness} K</b></div>
                    <div style="margin-bottom:4px;">Source: <b>${p.source}</b></div>
                    <hr style="border:0;border-top:1px solid #eee;margin:6px 0;">
                    <div>Date: ${p.acq_date} ${p.acq_time} UTC</div>
                    <div>Location: ${c[1].toFixed(4)}, ${c[0].toFixed(4)}</div>
                  </div>
                </div>
              `)
              .addTo(map);
          });
        }
      } catch (err) {
        console.error("Fire load error:", err);
      }
    }
  }

  // Time updates
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      date.setDate(date.getDate() - dateOffset);
      const y = date.getFullYear();
      const m = date.toLocaleString("en-US", { month: "short" });
      const d = String(date.getDate()).padStart(2, "0");
      setCurrentDate(`${y} ${m} ${d}`);

      const now = new Date();
      const hh = useGmt
        ? String(now.getUTCHours()).padStart(2, "0")
        : String(now.getHours()).padStart(2, "0");
      const mm = useGmt
        ? String(now.getUTCMinutes()).padStart(2, "0")
        : String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hh}:${mm} ${useGmt ? "GMT" : "Local"}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [dateOffset, useGmt]);

  // Handlers
  function toggleSatellite(type: string) {
    setActiveSat(type);
    const map = mapRef.current;
    if (!map) return;
    if (type === "arcgis") {
      if (map.getLayer("satellite")) map.setLayoutProperty("satellite", "visibility", "visible");
      if (map.getLayer("sentinel-2")) map.setLayoutProperty("sentinel-2", "visibility", "none");
    } else {
      if (map.getLayer("sentinel-2")) map.setLayoutProperty("sentinel-2", "visibility", "visible");
      if (map.getLayer("satellite")) map.setLayoutProperty("satellite", "visibility", "none");
    }
  }

  function toggleAtmospheric(layer: string) {
    const map = mapRef.current;
    if (!map) return;
    if (activeLayer === layer) {
      setActiveLayer(null);
      if (map.getLayer("wind-layer")) map.setLayoutProperty("wind-layer", "visibility", "none");
      if (map.getLayer("temp-layer")) map.setLayoutProperty("temp-layer", "visibility", "none");
    } else {
      setActiveLayer(layer);
      if (layer === "wind") {
        if (map.getLayer("wind-layer")) map.setLayoutProperty("wind-layer", "visibility", "visible");
        if (map.getLayer("temp-layer")) map.setLayoutProperty("temp-layer", "visibility", "none");
      } else {
        if (map.getLayer("temp-layer")) map.setLayoutProperty("temp-layer", "visibility", "visible");
        if (map.getLayer("wind-layer")) map.setLayoutProperty("wind-layer", "visibility", "none");
      }
    }
  }

  function switchMapMode(mode: string) {
    setMapMode(mode);
    const map = mapRef.current;
    if (!map) return;
    const overlays = ["osm-roads", "contours-layer"];
    overlays.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
    });
    if (mode === "roadmap") {
      if (map.getLayer("osm-roads")) map.setLayoutProperty("osm-roads", "visibility", "visible");
      map.setTerrain(null);
    } else if (mode === "terrain") {
      if (map.getLayer("contours-layer")) map.setLayoutProperty("contours-layer", "visibility", "visible");
      try { map.setTerrain({ source: "terrainSource", exaggeration: 1.5 }); } catch {}
    } else {
      try { map.setTerrain({ source: "terrainSource", exaggeration: 1.5 }); } catch {}
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-card transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "w-64"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="white">
              <path d="M560-32v-80q117 0 198.5-81.5T840-392h80q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T560-32Z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground">Satellite Telemetry</span>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Satellite Feeds */}
          <div className="mb-4 rounded-lg bg-secondary p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="3" />
                <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Satellite Feeds
            </h3>
            <label className="mb-2 flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <input
                type="radio"
                name="satellite"
                checked={activeSat === "arcgis"}
                onChange={() => toggleSatellite("arcgis")}
                className="accent-primary"
              />
              ArcGIS World Imagery
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <input
                type="radio"
                name="satellite"
                checked={activeSat === "sentinel"}
                onChange={() => toggleSatellite("sentinel")}
                className="accent-primary"
              />
              ESA Sentinel-2
            </label>

            {/* Source filters */}
            <div className="mt-3 border-t border-border pt-3">
              <span className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">Fire Data Sources</span>
              {[
                { key: "MODIS_NRT", label: "MODIS Terra/Aqua" },
                { key: "VIIRS_SNPP_NRT", label: "VIIRS SNPP" },
                { key: "VIIRS_NOAA20_NRT", label: "VIIRS NOAA-20" },
              ].map((src) => (
                <label key={src.key} className="mb-1 flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={sources[src.key as keyof typeof sources]}
                    onChange={(e) =>
                      setSources((prev) => ({ ...prev, [src.key]: e.target.checked }))
                    }
                    className="accent-primary"
                  />
                  {src.label}
                </label>
              ))}
            </div>
          </div>

          {/* Atmospheric */}
          <div className="mb-4 rounded-lg bg-secondary p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Atmospheric
            </h3>
            <button
              onClick={() => toggleAtmospheric("wind")}
              className={cn(
                "mb-2 w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                activeLayer === "wind"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              Wind Speed
            </button>
            <button
              onClick={() => toggleAtmospheric("temp")}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                activeLayer === "temp"
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              Global Temperature
            </button>
          </div>

          {/* System Links */}
          <div className="rounded-lg bg-secondary p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35" />
              </svg>
              System
            </h3>
            <Link href="/dashboard" className="mb-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics Dashboard
            </Link>
            <Link href="/drone" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted">
              <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="#4aa8ff">
                <path d="M160-160q0-75 41-134.5T307-381l-10-99H160v-240H40v-80h320v80H240v160h48l-8-80h400l-8 80h48v-160H600v-80h321v80H801v240H664l-10 99q65 27 105.5 86.5T800-160h-80q0-66-47-113t-113-47H400q-66 0-113 47t-47 113h-80Z" />
              </svg>
              Drone Telemetry
            </Link>
          </div>
        </div>
      </aside>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "fixed top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-lg transition-all",
          sidebarOpen ? "left-[272px]" : "left-4"
        )}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Map Container */}
      <div
        className={cn(
          "relative flex-1 transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-0"
        )}
      >
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Coordinates Display */}
        <div className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-card/80 px-3 py-1.5 font-mono text-xs text-muted-foreground backdrop-blur-sm">
          {coordsText}
        </div>

        {/* Layer Selector */}
        <div className="absolute right-4 top-16 z-10 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 backdrop-blur-sm">
          <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <select
            value={mapMode}
            onChange={(e) => switchMapMode(e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-foreground outline-none"
          >
            <option value="satellite">Satellite</option>
            <option value="roadmap">Roadmap</option>
            <option value="terrain">Terrain</option>
          </select>
        </div>

        {/* Time Control */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/90 px-4 py-2.5 backdrop-blur-sm">
          <button
            onClick={() => setDateOffset((d) => Math.min(d + 1, 4))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label="Previous day"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <span>{currentDate}</span>
            <span className="text-primary">{currentTime}</span>
          </div>
          <button
            onClick={() => setDateOffset((d) => Math.max(d - 1, 0))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            aria-label="Next day"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            onClick={() => setUseGmt(!useGmt)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {useGmt ? "GMT" : "Local"}
          </button>
        </div>

        {/* Fire Legend */}
        <div className="absolute bottom-6 right-4 z-10 rounded-xl border border-border bg-card/90 p-3 backdrop-blur-sm">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Fire Severity</div>
          {[
            { color: "bg-chart-3", label: "Low" },
            { color: "bg-chart-4", label: "Medium" },
            { color: "bg-primary", label: "Stage 1" },
            { color: "bg-accent", label: "Stage 2" },
            { color: "bg-chart-5", label: "Stage 3" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 py-1">
              <div className={`h-3 w-3 rounded-sm ${item.color}`} />
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Home link */}
        <Link
          href="/"
          className="absolute bottom-6 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card/90 text-foreground backdrop-blur-sm transition-colors hover:bg-muted"
          aria-label="Back to home"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </Link>
      </div>
    </div>
  );
}
