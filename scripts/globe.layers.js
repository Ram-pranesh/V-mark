//
(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  function onLoad() {
    map.setProjection({ type: "globe" });

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

    // Ensure base imagery stays under overlays
    if (map.getLayer("osm-roads")) {
      map.moveLayer("sentinel-2", "osm-roads");
    }

    // --- 2. GAS INTELLIGENCE (OpenWeatherMap AQI tiles fallback) ---
    map.addSource("gas-base", {
      type: "raster",
      tiles: [
        `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_KEY}`
      ],
      tileSize: 256
    });

    map.addLayer({
      id: "no2-layer",
      type: "raster",
      source: "gas-base",
      paint: { "raster-opacity": 0.55, "raster-hue-rotate": 160 },
      layout: { visibility: "none" }
    });

    map.addLayer({
      id: "co-layer",
      type: "raster",
      source: "gas-base",
      paint: { "raster-opacity": 0.55, "raster-hue-rotate": 80 },
      layout: { visibility: "none" }
    });

    map.addLayer({
      id: "so2-layer",
      type: "raster",
      source: "gas-base",
      paint: { "raster-opacity": 0.55, "raster-hue-rotate": 220 },
      layout: { visibility: "none" }
    });
    
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

    // Temp Layer
    map.addSource("weather-temp", {
        type: "raster",
        tiles: [`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${CONFIG.OPENWEATHER_KEY}`],
        tileSize: 256
    });
    map.addLayer({
        id: "temp-layer",
        type: "raster",
        source: "weather-temp",
        paint: { "raster-opacity": 0.6 },
        layout: { visibility: "none" }
    });

    // --- 3. FIRMS Fire Detections (WMS overlay) ---
    const enableFirmsWms = CONFIG && String(CONFIG.ENABLE_FIRMS_WMS).toLowerCase() === "true";
    if (CONFIG && CONFIG.FIRMS_MAP_KEY && enableFirmsWms) {
      const firmsBase = `/firms/wms?format=image/png&transparent=true&height=256&width=256&srs=EPSG:3857`;

      map.addSource("firms-fires", {
        type: "raster",
        tiles: [
          `${firmsBase}&layers=VIIRS_SNPP_NRT&bbox={bbox-epsg-3857}`,
          `${firmsBase}&layers=VIIRS_NOAA20_NRT&bbox={bbox-epsg-3857}`,
          `${firmsBase}&layers=MODIS_NRT&bbox={bbox-epsg-3857}`
        ],
        tileSize: 256
      });

      map.addLayer({
        id: "firms-fires-layer",
        type: "raster",
        source: "firms-fires",
        paint: { "raster-opacity": 0.8 },
        layout: { visibility: "visible" }
      });
    }

    // --- 3. Atmosphere ---
    // MapLibre (v5.x) does not support the "sky" layer type.
    // Leaving this disabled avoids the console error and keeps the map stable.
  }

  if (map.loaded && map.loaded()) {
    onLoad();
  } else {
    map.on("load", onLoad);
  }
})();