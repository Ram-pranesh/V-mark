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
      type: "globe"
    }
  }
});

// Expose map for split files and other scripts
window.map = map;

// --- User Provided "Pulsing Dot" Implementation ---
const pulsingDotSize = 200;
const pulsingDot = {
  width: pulsingDotSize,
  height: pulsingDotSize,
  data: new Uint8Array(pulsingDotSize * pulsingDotSize * 4),

  onAdd() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    this.context = canvas.getContext('2d');
  },

  render() {
    const duration = 1000;
    const t = (performance.now() % duration) / duration;

    const radius = (pulsingDotSize / 2) * 0.3;
    const outerRadius = (pulsingDotSize / 2) * 0.7 * t + radius;
    const context = this.context;

    // draw outer circle
    context.clearRect(0, 0, this.width, this.height);
    context.beginPath();
    context.arc(
      this.width / 2,
      this.height / 2,
      outerRadius,
      0,
      Math.PI * 2
    );
    context.fillStyle = `rgba(255, 200, 200,${1 - t})`;
    context.fill();

    // draw inner circle
    context.beginPath();
    context.arc(
      this.width / 2,
      this.height / 2,
      radius,
      0,
      Math.PI * 2
    );
    context.fillStyle = 'rgba(255, 100, 100, 1)';
    context.strokeStyle = 'white';
    context.lineWidth = 2 + 4 * (1 - t);
    context.fill();
    context.stroke();

    this.data = context.getImageData(0, 0, this.width, this.height).data;
    map.triggerRepaint();
    return true;
  }
};

map.on('load', () => {
  map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 });
});

// Helper to add a confirmed fire marker
window.addConfirmedFireMarker = (lng, lat) => {
  // Remove existing marker if any
  if (window.lastConfirmedFireId) {
    if (map.getLayer(window.lastConfirmedFireId)) map.removeLayer(window.lastConfirmedFireId);
    if (map.getSource(window.lastConfirmedFireId)) map.removeSource(window.lastConfirmedFireId);
    window.lastConfirmedFireId = null;
  }

  const id = `confirmed-fire-${Date.now()}`;
  window.lastConfirmedFireId = id;

  // Check if source exists, if not add it
  map.addSource(id, {
    'type': 'geojson',
    'data': {
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'geometry': {
          'type': 'Point',
          'coordinates': [lng, lat]
        }
      }]
    }
  });

  map.addLayer({
    'id': id,
    'type': 'symbol',
    'source': id,
    'layout': {
      'icon-image': 'pulsing-dot'
    }
  });

  // Fly to it
  map.flyTo({ center: [lng, lat], zoom: 14, pitch: 45 });
};

