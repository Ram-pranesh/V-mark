// Map initialization (core)
const map = new maplibregl.Map({
  container: "map",
  center: CONFIG.DEFAULT_CENTER,
  zoom: CONFIG.DEFAULT_ZOOM,
  maxZoom: 22,
  hash: false,
  attributionControl: false,
  pitch: 0, // Start flat earth view
  bearing: 0,
  style: {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      // 1. Satellite (Base)
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: "Esri, Maxar, Earthstar Geographics"
      },
      // 2. Terrain (3D Height)
      terrainSource: {
        type: "raster-dem",
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        ],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
        attribution: "AWS Terrain Tiles"
      },
      terrainSourceHillshade: {
        type: "raster-dem",
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
        ],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 15,
        attribution: "AWS Terrain Tiles"
      },
      // 3. Roads Overlay
      osmRoads: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 18,
        attribution: "© OpenStreetMap contributors"
      },
      // 4. Contours Overlay
      contours: {
        type: "raster",
        tiles: [
          "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        maxzoom: 15,
        attribution: "© OpenTopoMap"
      }
    },
    layers: [
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        paint: { "raster-opacity": 1 }
      },
      {
        id: "osm-roads",
        type: "raster",
        source: "osmRoads",
        layout: { visibility: "none" }
      },
      {
        id: "contours-layer",
        type: "raster",
        source: "contours",
        paint: {
          "raster-opacity": 1,
          "raster-saturation": -0.7, // Grayscale to simulate black lines
          "raster-contrast": 0.2
        },
        layout: { visibility: "none" }
      }
    ],
    projection: {
      type: "mercator"
    }
  }
});

// Expose map for split files and other scripts
window.map = map;
