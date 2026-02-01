//
(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  function onLoad() {
    // Set globe projection
    try {
      map.setProjection({ type: "globe" });
    } catch (e) {
      console.warn("Globe projection not supported, using mercator", e);
    }

    // --- 1. SATELLITE 2: Sentinel-2 Cloudless (EOX WMTS) ---
    map.addSource("sentinel-2-source", {
      type: "raster",
      tiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      tileSize: 256,
      maxzoom: 14,
      attribution: "Sentinel-2 Cloudless (EOX)"
    });

    map.addLayer({
      id: "sentinel-2",
      type: "raster",
      source: "sentinel-2-source",
      layout: { visibility: "none" }, // Hidden by default
      paint: { "raster-opacity": 1 }
    });

    // --- Boundaries & States (For Satellite/Sentinel Mode) ---
    // 1. World Countries
    map.addSource("world-countries", {
      type: "geojson",
      data: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson"
    });

    map.addLayer({
      id: "country-borders",
      type: "line",
      source: "world-countries",
      layout: { visibility: "none" },
      paint: {
        "line-color": "#000000",  // Black color
        "line-width": 1.5,        // Reduced thickness
        "line-opacity": 0.8
      }
    });

    // Add country labels
    map.addLayer({
      id: "country-labels",
      type: "symbol",
      source: "world-countries",
      layout: {
        "visibility": "none",
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 14,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.15,
        "text-max-width": 8
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "#000000",
        "text-halo-width": 2.5,
        "text-halo-blur": 1
      }
    });

    // 2. US States with Hover
    map.addSource("us-states", {
      type: "geojson",
      data: "https://maplibre.org/maplibre-gl-js/docs/assets/us_states.geojson",
      generateId: true // Important for feature-state
    });

    map.addLayer({
      id: "state-fills",
      type: "fill",
      source: "us-states",
      layout: { visibility: "none" },
      paint: {
        "fill-color": "#627BC1",
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.4, // Hover opacity
          0.0  // Normal opacity (transparent)
        ]
      }
    });

    map.addLayer({
      id: "state-borders",
      type: "line",
      source: "us-states",
      layout: { visibility: "none" },
      paint: {
        "line-color": "#000000",  // Black color
        "line-width": 1,          // Reduced thickness
        "line-opacity": 0.8
      }
    });

    // Labels for states
    map.addLayer({
      id: "state-labels",
      type: "symbol",
      source: "us-states",
      layout: {
        "visibility": "none",
        "text-field": ["get", "STATE_NAME"],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-size": 12,
        "text-transform": "uppercase",
        "text-letter-spacing": 0.1
      },
      paint: {
        "text-color": "#fff",
        "text-halo-color": "#000",
        "text-halo-width": 2
      }
    });

    // Hover Effect Logic
    let hoveredStateId = null;
    let statePopup = null;

    map.on("mousemove", "state-fills", (e) => {
      // Only active if Sentinel-2 is visible
      if (map.getLayoutProperty("sentinel-2", "visibility") !== "visible") return;

      if (e.features.length > 0) {
        if (hoveredStateId !== null) {
          map.setFeatureState({ source: "us-states", id: hoveredStateId }, { hover: false });
        }
        hoveredStateId = e.features[0].id;
        map.setFeatureState({ source: "us-states", id: hoveredStateId }, { hover: true });

        // Popup logic
        const stateName = e.features[0].properties.STATE_NAME;
        if (!statePopup) {
          statePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'state-popup' });
        }
        statePopup
          .setLngLat(e.lngLat)
          .setHTML(`<div style="color:#000; font-weight:bold; padding:4px;">${stateName}</div>`)
          .addTo(map);
      }
    });

    map.on("mouseleave", "state-fills", () => {
      if (hoveredStateId !== null) {
        map.setFeatureState({ source: "us-states", id: hoveredStateId }, { hover: false });
      }
      hoveredStateId = null;
      if (statePopup) {
        statePopup.remove();
        statePopup = null;
      }
    });


    // Ensure base imagery stays under overlays
    if (map.getLayer("osm-roads")) {
      map.moveLayer("sentinel-2", "osm-roads");
    }

    // Wind Layer
    map.addSource("weather-wind", {
      type: "raster",
      tiles: [`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_KEY}`],
      tileSize: 256
    });
    map.addLayer({
      id: "wind-layer",
      type: "raster",
      source: "weather-wind",
      paint: { "raster-opacity": 0.6 },
      layout: { visibility: "none" }
    });

    // Temperature Layer - overlaid on main globe
    map.addSource("weather-temp", {
      type: "raster",
      tiles: [`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_KEY}`],
      tileSize: 256,
      maxzoom: 18
    });
    map.addLayer({
      id: "temp-layer",
      type: "raster",
      source: "weather-temp",
      paint: {
        "raster-opacity": 0.88,
        "raster-saturation": 0.5,
        "raster-contrast": 0.40,
        "raster-resampling": "linear"
      },
      layout: { visibility: "none" }
    });

    // --- 3. FIRMS Fire Detections (WMS overlay) ---
    const enableFirmsWms = CONFIG && String(CONFIG.ENABLE_FIRMS_WMS).toLowerCase() === "true";
    const firmsWmsBase = (CONFIG && CONFIG.FIRMS_WMS_URL ? CONFIG.FIRMS_WMS_URL : "/firms/wms").replace(/\/$/, "");
    const firmsBase = `${firmsWmsBase}?format=image/png&transparent=true&height=256&width=256&srs=EPSG:3857`;
    let firmsWmsDisabled = false;

    const getFirmsTiles = (dateStr) => {
      const timeParam = dateStr ? `&time=${dateStr}` : "";
      return [
        `${firmsBase}&layers=VIIRS_SNPP_NRT&bbox={bbox-epsg-3857}${timeParam}`,
        `${firmsBase}&layers=VIIRS_NOAA20_NRT&bbox={bbox-epsg-3857}${timeParam}`,
        `${firmsBase}&layers=MODIS_NRT&bbox={bbox-epsg-3857}${timeParam}`
      ];
    };

    const disableFirmsLayer = (reason) => {
      if (map.getLayer("firms-fires-layer")) map.removeLayer("firms-fires-layer");
      if (map.getSource("firms-fires")) map.removeSource("firms-fires");
      firmsWmsDisabled = true;
      console.warn(reason || "Disabling FIRMS WMS overlay after repeated errors. Falling back to point feed.");
    };

    const buildFirmsLayer = (dateStr) => {
      if (!(CONFIG && CONFIG.FIRMS_MAP_KEY && enableFirmsWms) || firmsWmsDisabled) return;

      if (map.getLayer("firms-fires-layer")) map.removeLayer("firms-fires-layer");
      if (map.getSource("firms-fires")) map.removeSource("firms-fires");

      map.addSource("firms-fires", {
        type: "raster",
        tiles: getFirmsTiles(dateStr),
        tileSize: 256
      });

      map.addLayer({
        id: "firms-fires-layer",
        type: "raster",
        source: "firms-fires",
        paint: { "raster-opacity": 0.8 },
        layout: { visibility: "none" }
      });
    };

    window.updateFirmsDate = (dateStr) => buildFirmsLayer(dateStr);

    // Disable noisy WMS requests if the service responds with errors (e.g., bad key or layer names)
    map.on("error", (evt) => {
      if (firmsWmsDisabled) return;
      if (evt && evt.sourceId === "firms-fires") {
        const status = evt.error && (evt.error.status || evt.error.statusCode);
        const message = (evt.error && evt.error.message) || "";
        const shouldDisable = status === 404 || /404/.test(message) || /Failed to fetch|ERR_CONNECTION/i.test(message || "");
        if (shouldDisable) {
          disableFirmsLayer("FIRMS WMS returned 404/connection errors. Check FIRMS_MAP_KEY and ENABLE_FIRMS_WMS.");
        }
      }
    });
    buildFirmsLayer();


  }

  if (map.loaded && map.loaded()) {
    onLoad();
  } else {
    map.on("load", onLoad);
  }
})();
