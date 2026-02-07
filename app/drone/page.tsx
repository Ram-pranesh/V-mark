"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  FORESTS,
  generateDronesForDock,
  type DroneForest,
  type DroneTelemetry,
} from "@/lib/drone-data";

export default function DroneTelemetryPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedForest, setSelectedForest] = useState<string | null>(null);
  const [selectedDockId, setSelectedDockId] = useState<string | null>(null);
  const [drones, setDrones] = useState<DroneTelemetry[]>([]);
  const [selectedDrone, setSelectedDrone] = useState<DroneTelemetry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Live telemetry
  const [liveLat, setLiveLat] = useState("--");
  const [liveLng, setLiveLng] = useState("--");
  const [liveSpeed, setLiveSpeed] = useState("--");
  const [liveAlt, setLiveAlt] = useState("--");
  const [liveBatt, setLiveBatt] = useState("--");
  const [battColor, setBattColor] = useState("text-chart-3");

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let cancelled = false;

    const loadMap = async () => {
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
        center: [79.0, 21.0],
        zoom: 5,
        pitch: 0,
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
            borders: {
              type: "raster",
              tiles: [
                "https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
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
          },
          layers: [
            { id: "satellite", type: "raster", source: "satellite", paint: {} },
            {
              id: "admin-borders",
              type: "raster",
              source: "borders",
              paint: { "raster-opacity": 0.7 },
            },
          ],
          terrain: { source: "terrainSource", exaggeration: 1.5 },
        },
      });

      (window as any).map = map;
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        // Add forest polygons
        const forestFeatures = Object.entries(FORESTS).map(([key, f]) => ({
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [f.coordinates] },
          properties: { id: key, name: f.name, loc: f.location },
        }));

        map.addSource("forest-zones", {
          type: "geojson",
          data: { type: "FeatureCollection", features: forestFeatures },
        });

        map.addLayer({
          id: "forest-fill",
          type: "fill",
          source: "forest-zones",
          paint: { "fill-color": "#ff6b35", "fill-opacity": 0.15 },
        });

        map.addLayer({
          id: "forest-line",
          type: "line",
          source: "forest-zones",
          paint: { "line-color": "#ff6b35", "line-width": 2 },
        });

        // Click interaction
        map.on("click", "forest-fill", (e: any) => {
          const forestId = e.features[0].properties.id;
          handleForestSelect(forestId);
        });

        map.on("mouseenter", "forest-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "forest-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        // Fit bounds to all forests
        const bounds = new maplibregl.LngLatBounds();
        forestFeatures.forEach((f) =>
          f.geometry.coordinates[0].forEach((c: any) => bounds.extend(c))
        );
        map.fitBounds(bounds, { padding: 60 });
      });
    };

    loadMap();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleForestSelect = useCallback(
    (forestKey: string) => {
      const forest = FORESTS[forestKey];
      if (!forest) return;

      setSelectedForest(forestKey);
      setSelectedDockId(null);
      setDrones([]);
      setSelectedDrone(null);

      // Fly to forest
      const map = mapRef.current;
      if (map && forest.center) {
        map.flyTo({ center: forest.center, zoom: 10, pitch: 0 });
      }
    },
    []
  );

  const handleDockSelect = useCallback(
    (dockId: string) => {
      if (!selectedForest) return;
      const forest = FORESTS[selectedForest];
      const dockDrones = generateDronesForDock(dockId, forest);
      setSelectedDockId(dockId);
      setDrones(dockDrones);
      if (dockDrones.length > 0) {
        handleDroneSelect(dockDrones[0]);
      }
    },
    [selectedForest]
  );

  const handleDroneSelect = useCallback(
    (drone: DroneTelemetry) => {
      setSelectedDrone(drone);

      // Clear previous sim
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }

      if (drone.status === "Charging") {
        setLiveLat("--");
        setLiveLng("--");
        setLiveSpeed("--");
        setLiveAlt("--");
        setLiveBatt("Charging...");
        setBattColor("text-chart-3");

        let battVal = drone.batt;
        simIntervalRef.current = setInterval(() => {
          battVal += 0.2;
          if (battVal > 100) battVal = 100;
          setLiveBatt(`${Math.floor(battVal)}% (Charging)`);
          setBattColor("text-chart-3");
        }, 1000);
      } else {
        // Flying simulation
        let progress = Math.random() * 0.6 + 0.2;
        const start = drone.trip.startCoords;
        const end = drone.trip.endCoords;
        const baseSpeed = drone.telemetry.speed;
        const baseAlt = parseInt(drone.telemetry.alt);
        let battVal = drone.batt;

        simIntervalRef.current = setInterval(() => {
          const step = baseSpeed / 10000;
          progress += step;
          if (progress >= 1.0) progress = 0.0;

          const curLng = start[0] + (end[0] - start[0]) * progress;
          const curLat = start[1] + (end[1] - start[1]) * progress;
          const curSpeed = Math.max(0, baseSpeed + (Math.random() * 10 - 5));
          const curAlt = Math.max(0, Math.floor(baseAlt + (Math.random() * 4 - 2)));

          battVal -= 0.05;
          if (battVal <= 0) battVal = 100;

          setLiveLat(curLat.toFixed(5));
          setLiveLng(curLng.toFixed(5));
          setLiveSpeed(`${curSpeed.toFixed(1)} km/h`);
          setLiveAlt(`${curAlt} m`);
          setLiveBatt(`${Math.floor(battVal)}%`);

          if (battVal > 60) setBattColor("text-chart-3");
          else if (battVal > 30) setBattColor("text-chart-4");
          else setBattColor("text-chart-5");
        }, 1000);
      }

      // Show drone path on map
      const map = mapRef.current;
      if (map) {
        const geojson = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [drone.trip.startCoords, drone.trip.endCoords],
          },
        };
        if (map.getSource("drone-path")) {
          map.getSource("drone-path").setData(geojson);
        } else if (map.isStyleLoaded()) {
          map.addSource("drone-path", { type: "geojson", data: geojson });
          map.addLayer({
            id: "drone-path-line",
            type: "line",
            source: "drone-path",
            paint: {
              "line-color": "#ff6b35",
              "line-width": 3,
              "line-dasharray": [2, 1],
            },
          });
        }
      }
    },
    []
  );

  // Cleanup sim on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const currentForest = selectedForest ? FORESTS[selectedForest] : null;

  const filteredForests = Object.entries(FORESTS).filter(
    ([, f]) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const videoMap: Record<number, string> = {
    1: "/assets/img/drone-gif.mp4",
    2: "/assets/img/drone-video2.mp4",
    3: "/assets/img/drone-video3.mp4",
    4: "/assets/img/drone-video4.mp4",
    5: "/assets/img/drone-video5.mp4",
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-border bg-card transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="16"
              viewBox="0 -960 960 960"
              width="16"
              fill="white"
            >
              <path d="M160-160q0-75 41-134.5T307-381l-10-99H160v-240H40v-80h320v80H240v160h48l-8-80h400l-8 80h48v-160H600v-80h321v80H801v240H664l-10 99q65 27 105.5 86.5T800-160h-80q0-66-47-113t-113-47H400q-66 0-113 47t-47 113h-80Z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-foreground">
            Drone Operations
          </span>
        </div>

        {/* Search */}
        <div className="border-b border-border p-4">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forests..."
              className="h-9 w-full rounded-lg border border-border bg-secondary pl-10 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Forest List / Selected Forest */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedForest ? (
            <div className="flex flex-col gap-2">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Forest Divisions ({filteredForests.length})
              </h3>
              {filteredForests.map(([key, f]) => (
                <button
                  key={key}
                  onClick={() => handleForestSelect(key)}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-secondary p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {f.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {f.location}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {f.state}
                    </span>
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {f.hotspots.total} hotspots
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedForest(null);
                  setSelectedDockId(null);
                  setDrones([]);
                  setSelectedDrone(null);
                  if (simIntervalRef.current)
                    clearInterval(simIntervalRef.current);
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                All Forests
              </button>

              {/* Forest Info */}
              {currentForest && (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h3 className="text-sm font-bold text-foreground">
                      {currentForest.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {currentForest.location}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-secondary p-2">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          Area
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {currentForest.acres}
                        </p>
                      </div>
                      <div className="rounded-md bg-secondary p-2">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          Terrain
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {currentForest.terrain}
                        </p>
                      </div>
                      <div className="rounded-md bg-secondary p-2">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          Hotspots
                        </span>
                        <p className="text-sm font-bold text-primary">
                          {currentForest.hotspots.total}
                        </p>
                      </div>
                      <div className="rounded-md bg-secondary p-2">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          Docks
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {currentForest.docks.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Severity breakdown */}
                  <div className="rounded-lg bg-secondary p-3">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Threat Level
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-5" />
                        <span className="text-xs text-foreground">
                          {currentForest.hotspots.severity.high} High
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />
                        <span className="text-xs text-foreground">
                          {currentForest.hotspots.severity.medium} Med
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-chart-3" />
                        <span className="text-xs text-foreground">
                          {currentForest.hotspots.severity.low} Low
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Docking Stations */}
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Docking Stations
                    </h4>
                    <div className="flex flex-col gap-2">
                      {currentForest.docks.map((dock) => (
                        <button
                          key={dock.id}
                          onClick={() => handleDockSelect(dock.id)}
                          className={cn(
                            "flex flex-col gap-1 rounded-lg border p-3 text-left transition-all",
                            selectedDockId === dock.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-secondary hover:border-primary/30"
                          )}
                        >
                          <span className="font-mono text-xs font-bold text-primary">
                            {dock.id}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dock.location}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Nav Links */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Home
            </Link>
            <Link
              href="/satellite"
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Map
            </Link>
            <Link
              href="/dashboard"
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </aside>

      {/* Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          "fixed top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-lg transition-all",
          sidebarOpen ? "left-[296px]" : "left-4"
        )}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {sidebarOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Main Area */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarOpen ? "ml-72" : "ml-0"
        )}
      >
        {/* Map + Video Row */}
        <div className="flex flex-1">
          {/* Map */}
          <div className="relative flex-1">
            <div ref={mapContainerRef} className="h-full w-full" />

            {/* Forest count overlay */}
            <div className="absolute left-4 top-4 z-10 rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Forest Divisions
              </div>
              <div className="text-lg font-bold text-primary">
                {Object.keys(FORESTS).length}
              </div>
            </div>
          </div>

          {/* Right Panel - Video/Drone Detail */}
          <div className="flex w-80 flex-col border-l border-border bg-card lg:w-96">
            {/* Video Area */}
            <div className="relative aspect-video w-full overflow-hidden bg-background">
              {selectedDrone && selectedDrone.status !== "Charging" ? (
                <video
                  key={selectedDrone.id}
                  className="h-full w-full object-cover"
                  src={videoMap[selectedDrone.videoId]}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : selectedDrone && selectedDrone.status === "Charging" ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-background">
                  <div className="relative mb-4 flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-chart-3/20" />
                    <div className="absolute inset-2 animate-pulse rounded-full bg-chart-3/10" />
                    <svg
                      className="relative h-12 w-12 text-chart-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-chart-3">
                    Drone Charging
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Video feed paused
                  </p>
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="48"
                    viewBox="0 -960 960 960"
                    width="48"
                    fill="currentColor"
                    className="mb-3 opacity-30"
                  >
                    <path d="M160-160q0-75 41-134.5T307-381l-10-99H160v-240H40v-80h320v80H240v160h48l-8-80h400l-8 80h48v-160H600v-80h321v80H801v240H664l-10 99q65 27 105.5 86.5T800-160h-80q0-66-47-113t-113-47H400q-66 0-113 47t-47 113h-80Z" />
                  </svg>
                  <p className="text-sm">Select a drone to view feed</p>
                </div>
              )}
              {selectedDrone && selectedDrone.status !== "Charging" && (
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-chart-5/90 px-2 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                  </span>
                  <span className="text-[10px] font-bold uppercase text-white">
                    Live
                  </span>
                </div>
              )}
            </div>

            {/* Drone Selector */}
            {drones.length > 0 && (
              <div className="border-b border-border p-3">
                <div className="flex flex-wrap gap-1.5">
                  {drones.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleDroneSelect(d)}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                        selectedDrone?.id === d.id
                          ? "bg-primary text-primary-foreground"
                          : d.status === "Charging"
                          ? "bg-chart-3/10 text-chart-3 hover:bg-chart-3/20"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d.id.split("-").pop()}
                      {d.status === "Charging" && (
                        <span className="ml-1 text-[9px]">[CHG]</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Telemetry Panel */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedDrone ? (
                <div className="flex flex-col gap-4">
                  {/* Drone Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-mono text-sm font-bold text-foreground">
                        {selectedDrone.id}
                      </h3>
                      <span
                        className={cn(
                          "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          selectedDrone.status === "Patrolling" &&
                            "bg-chart-3/10 text-chart-3",
                          selectedDrone.status === "Charging" &&
                            "bg-accent/10 text-accent",
                          selectedDrone.status === "Returning" &&
                            "bg-chart-4/10 text-chart-4"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            selectedDrone.status === "Patrolling" &&
                              "bg-chart-3",
                            selectedDrone.status === "Charging" && "bg-accent",
                            selectedDrone.status === "Returning" &&
                              "bg-chart-4"
                          )}
                        />
                        {selectedDrone.status}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-sm font-bold",
                        battColor
                      )}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {liveBatt}
                    </div>
                  </div>

                  {/* Live Telemetry Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Latitude", value: liveLat, icon: "N" },
                      { label: "Longitude", value: liveLng, icon: "E" },
                      { label: "Speed", value: liveSpeed, icon: "V" },
                      { label: "Altitude", value: liveAlt, icon: "H" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-secondary p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 font-mono text-[10px] font-bold text-primary">
                            {item.icon}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-sm font-bold text-foreground">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Trip Info */}
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Trip Data
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground">
                          Distance
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {selectedDrone.trip.distance}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">
                          Air Time
                        </span>
                        <p className="text-sm font-bold text-foreground">
                          {selectedDrone.trip.duration}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fire Event */}
                  {selectedDrone.telemetry.fireEvent && (
                    <div className="animate-pulse-glow rounded-lg border border-chart-5/30 bg-chart-5/10 p-3">
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-5 w-5 text-chart-5"
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
                        <div>
                          <p className="text-sm font-bold text-chart-5">
                            Fire Event Detected
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Thermal: {selectedDrone.telemetry.temp}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="text-sm">
                    Select a forest division and docking station to view drone
                    telemetry.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
