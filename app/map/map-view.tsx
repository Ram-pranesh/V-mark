"use client"

import { useEffect, useRef } from "react"

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Load external CSS
    const cssLinks = [
      "https://unpkg.com/maplibre-gl@5.8.0/dist/maplibre-gl.css",
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200",
      "https://fonts.googleapis.com/icon?family=Material+Icons+Round",
    ]

    cssLinks.forEach((href) => {
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = href
        document.head.appendChild(link)
      }
    })

    // Load the app CSS
    const appCss = document.createElement("link")
    appCss.rel = "stylesheet"
    appCss.href = "/frontend/assets/css/style.css"
    document.head.appendChild(appCss)

    // Load external scripts sequentially
    const externalScripts = [
      "https://unpkg.com/maplibre-gl@5.8.0/dist/maplibre-gl.js",
      "https://unpkg.com/maplibre-contour@0.0.5/dist/index.min.js",
      "https://cdn.jsdelivr.net/npm/chart.js",
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    ]

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const s = document.createElement("script")
        s.src = src
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.body.appendChild(s)
      })
    }

    async function initializeMap() {
      // Load external dependencies
      for (const src of externalScripts) {
        await loadScript(src)
      }

      // Load bootstrap which handles config + map scripts
      await loadScript("/frontend/scripts/app-bootstrap.js")
    }

    initializeMap().catch((err) =>
      console.error("Failed to initialize map:", err)
    )
  }, [])

  return (
    <>
      <div id="sidebar" className="open">
        <div className="sidebar-header">
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#ff6b35"
            >
              <path d="M560-32v-80q117 0 198.5-81.5T840-392h80q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T560-32Zm0-160v-80q50 0 85-35t35-85h80q0 83-58.5 141.5T560-192ZM222-57q-15 0-30-6t-27-17L23-222q-11-12-17-27t-6-30q0-16 6-30.5T23-335l127-127q23-23 57-23.5t57 22.5l50 50 28-28-50-50q-23-23-23-56t23-56l57-57q23-23 56.5-23t56.5 23l50 50 28-28-50-50q-23-23-23-56.5t23-56.5l127-127q12-12 27-18t30-6q15 0 29.5 6t26.5 18l142 142q12 11 17.5 25.5T895-730q0 15-5.5 30T872-673L745-546q-23 23-56.5 23T632-546l-50-50-28 28 50 50q23 23 22.5 56.5T603-405l-56 56q-23 23-56.5 23T434-349l-50-50-28 28 50 50q23 23 22.5 57T405-207L278-80q-11 11-25.5 17T222-57Zm0-79 42-42-142-142-42 42 142 142Zm85-85 42-42-142-142-42 42 142 142Zm184-184 56-56-142-142-56 56 142 142Zm198-198 42-42-142-142-42 42 142 142Zm85-85 42-42-142-142-42 42 142 142ZM448-504Z" />
            </svg>
            <span>Satellite Telemetry</span>
          </h2>
        </div>

        <div className="sidebar-content">
          <div
            className="layer-group"
            style={{ flexShrink: 0, marginBottom: "10px" }}
          >
            <div className="group-title">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="20px"
                viewBox="0 -960 960 960"
                width="20px"
                fill="#ff6b35"
                style={{ marginRight: "8px" }}
              >
                <path d="M440-40v-80q-125-14-214.5-103.5T122-438H42v-80h80q14-125 103.5-214.5T440-836v-80h80v80q125 14 214.5 103.5T838-518h80v80h-80q-14 125-103.5 214.5T520-120v80h-80Zm40-158q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Z" />
              </svg>
              Satellite Feeds
            </div>

            <SatelliteCheckbox id="sat-arcgis" label="ArcGIS World Imagery" defaultChecked />
            <SatelliteCheckbox id="sat-sentinel" label="ESA Sentinel-2" />

            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #333",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "#888",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  className="material-icons-round"
                  style={{ fontSize: "14px", color: "#ff6b35" }}
                >
                  filter_alt
                </span>
                FIRE DATA SOURCES
              </div>
              <div className="dropdown" id="sources-dropdown">
                <button
                  className="dropdown-toggle"
                  onClick={() => toggleDropdown("sources-dropdown")}
                >
                  <span id="sources-label">All Sources</span>
                  <span className="material-icons-round">expand_more</span>
                </button>
                <div className="dropdown-menu">
                  <SourceCheckbox id="source-all" label="All Sources" defaultChecked />
                  <SourceCheckbox id="source-modis" label="MODIS Terra/Aqua" defaultChecked />
                  <SourceCheckbox id="source-viirs-snpp" label="VIIRS SNPP" defaultChecked />
                  <SourceCheckbox id="source-viirs-noaa20" label="VIIRS NOAA-20" defaultChecked />
                </div>
              </div>
            </div>
          </div>

          <div
            className="layer-group"
            style={{ flexShrink: 0, marginBottom: "10px" }}
          >
            <div className="group-title">
              <span className="material-icons-round">air</span> Atmospheric
            </div>
            <LayerCheckbox id="layer-wind" label="Wind Speed" layerId="wind-layer" />
            <LayerCheckbox id="layer-temp" label="Global Temperature" layerId="temp-layer" />
          </div>

          <div
            className="layer-group"
            style={{ flexShrink: 0, marginBottom: "2px", padding: "8px" }}
          >
            <div className="group-title" style={{ marginBottom: "6px" }}>
              <span className="material-icons-round">settings</span> Tools
            </div>
            <div className="tool-row" style={{ marginBottom: "6px", gap: "6px" }}>
              <button
                id="sidebar-measure-btn"
                className="sidebar-tool-compact-btn"
                title="Measure area"
                style={{ padding: "6px" }}
              >
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: "16px" }}
                >
                  activity_zone
                </span>
                <span style={{ fontSize: "12px" }}>Measure</span>
              </button>
              <button
                id="sidebar-route-btn"
                className="sidebar-tool-compact-btn"
                title="Route Planner"
                style={{ padding: "6px" }}
              >
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: "16px" }}
                >
                  conversion_path
                </span>
                <span style={{ fontSize: "12px" }}>Route</span>
              </button>
            </div>
            <div className="tool-row" style={{ justifyContent: "center" }}>
              <button
                id="sidebar-reset-btn"
                className="reset-tool-btn"
                style={{ padding: "4px 10px", fontSize: "10px" }}
              >
                <span
                  className="material-icons-round"
                  style={{ fontSize: "12px", marginRight: "3px" }}
                >
                  restart_alt
                </span>{" "}
                Reset
              </button>
            </div>
          </div>

          <div
            className="layer-group"
            style={{ flexShrink: 0, marginBottom: 0, padding: "18px" }}
          >
            <div className="group-title" style={{ marginBottom: "12px" }}>
              <span className="material-icons-round">
                settings_system_daydream
              </span>{" "}
              System
            </div>
            <div
              className="layer-item"
              onClick={() => {
                const w = window as Record<string, unknown>
                if (typeof w.openAlertCenter === "function") {
                  ;(w.openAlertCenter as () => void)()
                } else {
                  alert("Alert System Loading...")
                }
              }}
              style={{ padding: "10px 12px" }}
            >
              <span
                className="material-icons-round"
                style={{
                  marginRight: "12px",
                  fontSize: "22px",
                  color: "#ff6b35",
                }}
              >
                notifications_none
              </span>
              <span style={{ fontSize: "0.95rem" }}>Alert System</span>
            </div>
            <div
              className="layer-item"
              onClick={() =>
                (window.location.href = "/frontend/drone-mode/index.html")
              }
              style={{ padding: "10px 12px" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="22px"
                viewBox="0 -960 960 960"
                width="22px"
                fill="#4aa8ff"
                style={{ marginRight: "12px" }}
              >
                <path d="M160-160q0-75 41-134.5T307-381l-10-99H160v-240H40v-80h320v80H240v160h48l-8-80h400l-8 80h48v-160H600v-80h321v80H801v240H664l-10 99q65 27 105.5 86.5T800-160h-80q0-66-47-113t-113-47H400q-66 0-113 47t-47 113h-80Z" />
              </svg>
              <span style={{ fontSize: "0.95rem" }}>Drone Telemetry</span>
            </div>
          </div>
        </div>
      </div>

      <SidebarToggle />

      <div id="map" className="sidebar-open" />
      <div
        id="temp-tooltip"
        style={{
          position: "absolute",
          display: "none",
          background: "rgba(10, 10, 10, 0.85)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.15)",
          fontSize: "14px",
          pointerEvents: "none",
          zIndex: 100,
          backdropFilter: "blur(6px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      />
      <div id="wind-history-container" className="sidebar-open">
        <iframe
          id="wind-history-frame"
          src="/frontend/scripts/wind-history.html"
          title="Wind History"
        />
      </div>
      <div id="coords" className="sidebar-open" />
      <div
        id="dynamic-legend"
        className="legend-box"
        style={{ display: "none" }}
      />

      {/* Inline scripts for sidebar/map interactions */}
      <MapInteractionScripts />
    </>
  )
}

function SatelliteCheckbox({
  id,
  label,
  defaultChecked,
}: {
  id: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="layer-item">
      <input
        type="checkbox"
        id={id}
        defaultChecked={defaultChecked}
        onChange={() => {
          const w = window as Record<string, unknown>
          if (typeof w.toggleSatellite === "function") {
            ;(w.toggleSatellite as (s: string) => void)(
              id === "sat-arcgis" ? "arcgis" : "sentinel"
            )
          }
        }}
      />
      <span>{label}</span>
    </label>
  )
}

function SourceCheckbox({
  id,
  label,
  defaultChecked,
}: {
  id: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label className="dropdown-item">
      <input
        type="checkbox"
        id={id}
        defaultChecked={defaultChecked}
        onChange={() => {
          const w = window as Record<string, unknown>
          if (id === "source-all" && typeof w.toggleAllSources === "function") {
            ;(w.toggleAllSources as () => void)()
          } else if (typeof w.toggleIndividualSource === "function") {
            ;(w.toggleIndividualSource as () => void)()
          }
        }}
      />
      <span>{label}</span>
    </label>
  )
}

function LayerCheckbox({
  id,
  label,
  layerId,
}: {
  id: string
  label: string
  layerId: string
}) {
  return (
    <label className="layer-item">
      <input
        type="checkbox"
        id={id}
        onChange={() => {
          const w = window as Record<string, unknown>
          if (typeof w.toggleLayer === "function") {
            ;(w.toggleLayer as (s: string) => void)(layerId)
          }
        }}
      />
      <span>{label}</span>
    </label>
  )
}

function SidebarToggle() {
  return (
    <button
      id="sidebar-toggle"
      className="open"
      aria-label="Close sidebar"
      onClick={() => {
        const w = window as Record<string, unknown>
        if (typeof w.toggleSidebar === "function") {
          ;(w.toggleSidebar as () => void)()
        }
      }}
    >
      <span id="sidebar-toggle-icon" className="material-icons-round">
        menu_open
      </span>
    </button>
  )
}

function toggleDropdown(dropdownId: string) {
  const dropdown = document.getElementById(dropdownId)
  if (dropdown) {
    dropdown.classList.toggle("open")
  }
  document.querySelectorAll(".dropdown").forEach((d) => {
    if (d.id !== dropdownId) d.classList.remove("open")
  })
}

function MapInteractionScripts() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Sidebar toggle
          window.toggleSidebar = function() {
            var sidebar = document.getElementById("sidebar");
            var mapEl = document.getElementById("map");
            var windHistory = document.getElementById("wind-history-container");
            var coords = document.getElementById("coords");
            var toggle = document.getElementById("sidebar-toggle");
            var icon = document.getElementById("sidebar-toggle-icon");

            sidebar.classList.toggle("open");
            mapEl.classList.toggle("sidebar-open");
            windHistory.classList.toggle("sidebar-open");
            coords.classList.toggle("sidebar-open");
            toggle.classList.toggle("open");

            var isOpen = sidebar.classList.contains("open");
            icon.textContent = isOpen ? "menu_open" : "menu";
            toggle.setAttribute("aria-label", isOpen ? "Close sidebar" : "Open sidebar");

            setTimeout(function() {
              if (window.map && typeof map.resize === 'function') map.resize();
            }, 350);
          };

          window.setWindHistoryVisible = function(visible) {
            var windHistory = document.getElementById("wind-history-container");
            var mapEl = document.getElementById("map");
            var coords = document.getElementById("coords");
            var terrainToggle = document.querySelector(".floating-terrain-toggle");
            var mapSelector = document.querySelector(".floating-map-selector");

            if (!windHistory || !mapEl || !coords) return;
            windHistory.style.display = visible ? "block" : "none";
            mapEl.style.display = "block";
            coords.style.display = "block";
            if (terrainToggle) terrainToggle.style.display = "flex";
            if (mapSelector) mapSelector.style.display = "flex";
            if (window.map && map.resize) map.resize();
          };

          // Satellite Mutex Logic
          window.toggleSatellite = function(selected) {
            var arcgis = document.getElementById('sat-arcgis');
            var sentinel = document.getElementById('sat-sentinel');
            if (selected === 'arcgis') {
              if (arcgis.checked) {
                sentinel.checked = false;
                if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'visible');
                if (map.getLayer('sentinel-2')) map.setLayoutProperty('sentinel-2', 'visibility', 'none');
                ['country-borders', 'state-borders', 'state-fills', 'state-labels'].forEach(function(id) {
                  if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
                });
              } else {
                arcgis.checked = true;
              }
            } else {
              if (sentinel.checked) {
                arcgis.checked = false;
                if (map.getLayer('sentinel-2')) map.setLayoutProperty('sentinel-2', 'visibility', 'visible');
                if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'none');
                ['country-borders', 'country-labels', 'state-borders', 'state-fills', 'state-labels'].forEach(function(id) {
                  if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
                });
              } else {
                arcgis.checked = true;
                if (map.getLayer('satellite')) map.setLayoutProperty('satellite', 'visibility', 'visible');
                if (map.getLayer('sentinel-2')) map.setLayoutProperty('sentinel-2', 'visibility', 'none');
                ['country-borders', 'country-labels', 'state-borders', 'state-fills', 'state-labels'].forEach(function(id) {
                  if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
                });
              }
            }
            syncFireVisibility();
          };

          // Dropdown Toggle
          window.toggleDropdown = function(dropdownId) {
            var dropdown = document.getElementById(dropdownId);
            if (dropdown) dropdown.classList.toggle('open');
            document.querySelectorAll('.dropdown').forEach(function(d) {
              if (d.id !== dropdownId) d.classList.remove('open');
            });
          };

          document.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown')) {
              document.querySelectorAll('.dropdown').forEach(function(d) { d.classList.remove('open'); });
            }
          });

          // Source Filter Functions
          window.toggleAllSources = function() {
            var allCheckbox = document.getElementById('source-all');
            var modis = document.getElementById('source-modis');
            var viirs_snpp = document.getElementById('source-viirs-snpp');
            var viirs_noaa20 = document.getElementById('source-viirs-noaa20');
            modis.checked = allCheckbox.checked;
            viirs_snpp.checked = allCheckbox.checked;
            viirs_noaa20.checked = allCheckbox.checked;
            updateSourcesLabel();
            reloadFireData();
          };

          window.toggleIndividualSource = function() {
            var allCheckbox = document.getElementById('source-all');
            var modis = document.getElementById('source-modis');
            var viirs_snpp = document.getElementById('source-viirs-snpp');
            var viirs_noaa20 = document.getElementById('source-viirs-noaa20');
            allCheckbox.checked = modis.checked && viirs_snpp.checked && viirs_noaa20.checked;
            updateSourcesLabel();
            reloadFireData();
          };

          function updateSourcesLabel() {
            var modis = document.getElementById('source-modis');
            var viirs_snpp = document.getElementById('source-viirs-snpp');
            var viirs_noaa20 = document.getElementById('source-viirs-noaa20');
            var label = document.getElementById('sources-label');
            var selected = [];
            if (modis && modis.checked) selected.push('MODIS');
            if (viirs_snpp && viirs_snpp.checked) selected.push('VIIRS SNPP');
            if (viirs_noaa20 && viirs_noaa20.checked) selected.push('VIIRS NOAA-20');
            if (selected.length === 3) label.textContent = 'All Sources';
            else if (selected.length === 0) label.textContent = 'No Sources';
            else label.textContent = selected.join(', ');
          }

          function reloadFireData() {
            if (!window.enabledSources) window.enabledSources = new Set();
            else window.enabledSources.clear();
            if (document.getElementById('source-modis') && document.getElementById('source-modis').checked) window.enabledSources.add('MODIS_NRT');
            if (document.getElementById('source-viirs-snpp') && document.getElementById('source-viirs-snpp').checked) window.enabledSources.add('VIIRS_SNPP_NRT');
            if (document.getElementById('source-viirs-noaa20') && document.getElementById('source-viirs-noaa20').checked) window.enabledSources.add('VIIRS_NOAA20_NRT');
            if (window.loadFires) window.loadFires();
          }

          // Generic Layer Toggle
          window.toggleLayer = function(mapLayerId) {
            var domId = 'layer-' + mapLayerId.replace('-layer', '');
            var checkbox = document.getElementById(domId);
            if (!checkbox) return;
            if (mapLayerId === 'wind-layer' || mapLayerId === 'temp-layer') {
              var otherId = mapLayerId === 'wind-layer' ? 'temp-layer' : 'wind-layer';
              var otherCheckbox = document.getElementById('layer-' + otherId.replace('-layer', ''));
              if (otherCheckbox) otherCheckbox.checked = false;
            }
            if (mapLayerId === 'wind-layer') {
              var tempCheckbox = document.getElementById('layer-temp');
              if (tempCheckbox) tempCheckbox.checked = false;
              if (map.getLayer('temp-layer')) map.setLayoutProperty('temp-layer', 'visibility', 'none');
              updateLegend('temp-layer', false);
              var tooltip = document.getElementById('temp-tooltip');
              if (tooltip) tooltip.style.display = 'none';
              setWindHistoryVisible(checkbox.checked);
              if (map.getLayer('wind-layer')) map.setLayoutProperty('wind-layer', 'visibility', checkbox.checked ? 'visible' : 'none');
              syncFireVisibility();
              updateLegend(mapLayerId, checkbox.checked);
              return;
            }
            if (mapLayerId === 'temp-layer') {
              setWindHistoryVisible(false);
              var windCheckbox = document.getElementById('layer-wind');
              if (windCheckbox) windCheckbox.checked = false;
              updateLegend('wind-layer', false);
              if (map.getLayer('wind-layer')) map.setLayoutProperty('wind-layer', 'visibility', 'none');
              if (checkbox.checked) {
                if (map.getLayer('temp-layer')) map.setLayoutProperty('temp-layer', 'visibility', 'visible');
                setupTempTooltip();
                syncFireVisibility();
              } else {
                if (map.getLayer('temp-layer')) map.setLayoutProperty('temp-layer', 'visibility', 'none');
                var tooltip2 = document.getElementById('temp-tooltip');
                if (tooltip2) tooltip2.style.display = 'none';
                syncFireVisibility();
              }
              updateLegend(mapLayerId, checkbox.checked);
              return;
            }
            if (!window.map || !map.getLayer || !map.getLayer(mapLayerId)) return;
            map.setLayoutProperty(mapLayerId, 'visibility', checkbox.checked ? 'visible' : 'none');
            updateLegend(mapLayerId, checkbox.checked);
          };

          function syncFireVisibility() {
            var tempOn = document.getElementById('layer-temp') && document.getElementById('layer-temp').checked;
            var arcgis = document.getElementById('sat-arcgis');
            var sentinel = document.getElementById('sat-sentinel');
            var mapMode = window.mapSelect ? window.mapSelect.value : 'satellite';
            var show = !tempOn && mapMode === 'satellite' && ((arcgis && arcgis.checked) || (sentinel && sentinel.checked));
            ['fire-glow', 'fire-points', 'firms-fires-layer'].forEach(function(id) {
              if (map && map.getLayer && map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none');
              }
            });
          }

          function updateLegend(layer, visible) {
            var legend = document.getElementById('dynamic-legend');
            if (!visible) { legend.style.display = 'none'; return; }
            legend.style.display = 'block';
            if (layer.includes('wind')) legend.innerHTML = '<b>Wind Speed</b><br><span style="background:linear-gradient(90deg, #5b00a5 0%, #7516c7 14%, #3b5fff 28%, #1fa4ff 42%, #1dd2b7 56%, #7ddc3a 70%, #f2e30c 82%, #ff9a00 91%, #ff2f00 100%); display:block; height:10px; width:100%; border-radius:4px;"></span><div style="display:flex; justify-content:space-between; font-size:12px; margin-top:4px;"><span>Low</span><span>High</span></div>';
            if (layer.includes('temp')) legend.innerHTML = '<b>Temperature</b><br><span style="background:linear-gradient(90deg, #5b00a5 0%, #7a1fcf 12%, #3657ff 24%, #1fa4ff 36%, #18d17c 48%, #c2e51b 60%, #ffd400 72%, #ff9a00 84%, #ff2f00 100%); display:block; height:10px; width:100%; border-radius:4px;"></span><div style="display:flex; justify-content:space-between; font-size:12px; margin-top:4px;"><span>-40\\u00B0C</span><span>40\\u00B0C</span></div>';
          }

          function setupTempTooltip() {
            var tooltip = document.getElementById('temp-tooltip');
            var timer;
            var lastRequestId = 0;
            map.on('mousemove', function(e) {
              var tempCheckbox = document.getElementById('layer-temp');
              if (!tempCheckbox || !tempCheckbox.checked) { tooltip.style.display = 'none'; return; }
              var rect = map.getContainer().getBoundingClientRect();
              tooltip.style.display = 'block';
              tooltip.style.left = (rect.left + e.point.x + 6) + 'px';
              tooltip.style.top = (rect.top + e.point.y + 6) + 'px';
              tooltip.style.transform = 'none';
              clearTimeout(timer);
              timer = setTimeout(function() {
                var requestId = ++lastRequestId;
                fetch('https://api.open-meteo.com/v1/forecast?latitude=' + e.lngLat.lat + '&longitude=' + e.lngLat.lng + '&current=temperature_2m')
                  .then(function(res) { return res.json(); })
                  .then(function(data) {
                    if (requestId !== lastRequestId) return;
                    if (data.current) tooltip.innerHTML = '<div style="font-weight:bold; font-size:16px;">' + Math.round(data.current.temperature_2m) + '\\u00B0C</div>';
                  }).catch(function() {});
              }, 100);
            });
            map.on('mouseout', function() { tooltip.style.display = 'none'; });
          }
        `,
      }}
    />
  )
}
