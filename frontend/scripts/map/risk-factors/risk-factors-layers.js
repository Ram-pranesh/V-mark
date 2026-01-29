(function () {
  const map = window.map || (typeof map !== "undefined" ? map : null);
  if (!map) return;

  const getUtcDate = (offsetDays = 0) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().split("T")[0];
  };

  const gibsDate = getUtcDate(-1);

  function onLoad() {
    map.addSource("soil-moisture-source", {
      type: "raster",
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Rootzone_Soil_Moisture/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png?time=${gibsDate}`
      ],
      tileSize: 256,
      maxzoom: 7
    });

    map.addLayer({
      id: "soil-moisture-layer",
      type: "raster",
      source: "soil-moisture-source",
      paint: { "raster-opacity": 0.65 },
      layout: { visibility: "none" }
    });

    map.addSource("lst-source", {
      type: "raster",
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png?time=${gibsDate}`
      ],
      tileSize: 256,
      maxzoom: 7
    });

    map.addLayer({
      id: "lst-layer",
      type: "raster",
      source: "lst-source",
      paint: { "raster-opacity": 0.65 },
      layout: { visibility: "none" }
    });

    map.addSource("ndvi-source", {
      type: "raster",
      tiles: [
        `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_16Day/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png?time=${gibsDate}`
      ],
      tileSize: 256,
      maxzoom: 7
    });

    map.addLayer({
      id: "ndvi-layer",
      type: "raster",
      source: "ndvi-source",
      paint: { "raster-opacity": 0.65 },
      layout: { visibility: "none" }
    });

    if (map.getSource("terrainSourceHillshade") && !map.getLayer("terrain-hillshade")) {
      map.addLayer({
        id: "terrain-hillshade",
        type: "hillshade",
        source: "terrainSourceHillshade",
        layout: { visibility: "none" },
        paint: {
          "hillshade-exaggeration": 0.7,
          "hillshade-shadow-color": "#a53010",
          "hillshade-highlight-color": "#ffb199"
        }
      });
    }
  }

  window.setRiskFactorLayerVisibility = (layerId, visible) => {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  };

  if (map.loaded && map.loaded()) {
    onLoad();
  } else {
    map.on("load", onLoad);
  }
})();
