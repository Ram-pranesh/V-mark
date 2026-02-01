// Drone Map Initialization
// Using a darker style or satellite for the base, consistent with user request

const CONFIG = {
    // Centering near Central India for better overview of new dataset
    DEFAULT_CENTER: [79.0, 21.0],
    DEFAULT_ZOOM: 5
};

// Initialize Map
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
            'satellite': {
                'type': 'raster',
                'tiles': [
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                ],
                'tileSize': 256,
                'attribution': 'Esri, Maxar, Earthstar Geographics'
            },
            'borders': {
                'type': 'raster',
                'tiles': [
                    'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'
                ],
                'tileSize': 256,
                'attribution': 'CartoDB'
            },
            'mapbox-dem': {
                'type': 'raster-dem',
                'url': 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                'tileSize': 256
            }
        },
        layers: [
            {
                'id': 'satellite',
                'type': 'raster',
                'source': 'satellite',
                'paint': {}
            },
            {
                'id': 'admin-borders',
                'type': 'raster',
                'source': 'borders',
                'paint': { 'raster-opacity': 0.7 }
            }
        ],
        terrain: {
            source: 'mapbox-dem',
            exaggeration: 1.5
        }
    },
    center: CONFIG.DEFAULT_CENTER,
    zoom: CONFIG.DEFAULT_ZOOM,
    pitch: 0, // Top-down view as requested
    bearing: 0,
    attributionControl: false
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), 'top-right');

// Home Button Control
class HomeButtonControl {
    onAdd(map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this._container.innerHTML = `
            <button class="maplibregl-ctrl-icon" type="button" title="Home View (India)" aria-label="Home">
                <span class="material-icons-round" style="font-size:18px; line-height:29px; color:#333;">home</span>
            </button>
        `;
        this._container.onclick = () => {
            // 1. Fly to India
            this._map.flyTo({ center: [78.9629, 20.5937], zoom: 4.5, pitch: 0 });

            // 2. Ensure Borders are Visible (Toggle logic can be added if needed)
            if (this._map.getLayer('admin-borders')) {
                this._map.setLayoutProperty('admin-borders', 'visibility', 'visible');
            }
        };
        return this._container;
    }
    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }
}
map.addControl(new HomeButtonControl(), 'top-right');

window.map = map;

// Resize Observer to handle flex layout changes
const resizeObserver = new ResizeObserver(() => {
    map.resize();
});
resizeObserver.observe(document.getElementById('map'));

// --- Forest Logic ---

map.on('load', () => {
    // 1. Construct GeoJSON from DRONE_DB
    const forestFeatures = [];

    if (window.DRONE_DB && window.DRONE_DB.forests) {
        Object.keys(window.DRONE_DB.forests).forEach(key => {
            const forest = window.DRONE_DB.forests[key];
            if (forest.coordinates) {
                forestFeatures.push({
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [forest.coordinates]
                    },
                    properties: {
                        id: key,
                        name: forest.name,
                        loc: forest.location
                    }
                });
            }
        });
    }

    // 2. Add Source
    map.addSource('forest-zones', {
        type: 'geojson',
        data: {
            type: "FeatureCollection",
            features: forestFeatures
        }
    });

    // 3. Add Layers
    // Fill Layer
    map.addLayer({
        'id': 'forest-fill',
        'type': 'fill',
        'source': 'forest-zones',
        'paint': {
            'fill-color': '#ff6b35', // matching theme
            'fill-opacity': 0.15
        }
    });

    // Outline Layer
    map.addLayer({
        'id': 'forest-line',
        'type': 'line',
        'source': 'forest-zones',
        'paint': {
            'line-color': '#ff6b35',
            'line-width': 2
        }
    });

    // 4. Interaction
    map.on('click', 'forest-fill', (e) => {
        const feature = e.features[0];
        const id = feature.properties.id;

        if (window.DroneUI && id) {
            window.DroneUI.openForestPanel(id);
        }
    });

    // Cursor
    map.on('mouseenter', 'forest-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'forest-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Fit Bounds Top-Down
    if (forestFeatures.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        forestFeatures.forEach(f => {
            f.geometry.coordinates[0].forEach(c => bounds.extend(c));
        });
        map.fitBounds(bounds, { padding: 60, pitch: 0 }); // Force pitch 0
    }

    // Load Live Fires (Mocked Simulation)
    loadLiveSatelliteFires();
});

// --- Mock Fire Simulation Integration ---
async function loadLiveSatelliteFires() {
    console.log("Initializing Enhanced Mock Fire Simulation...");

    if (!window.DRONE_DB || !window.DRONE_DB.forests || typeof turf === 'undefined') {
        console.warn("Requirements (DRONE_DB or Turf.js) missing.");
        return;
    }

    const mockFires = [];

    // Iterate through each forest
    Object.values(window.DRONE_DB.forests).forEach(forest => {
        if (!forest.hotspots || !forest.coordinates) return;

        // 1. Geometry & Buffer
        let polyCoords = [...forest.coordinates];
        const first = polyCoords[0];
        const last = polyCoords[polyCoords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            polyCoords.push(first);
        }

        const forestPoly = turf.polygon([polyCoords]);
        const bufferedPoly = turf.buffer(forestPoly, 5, { units: 'kilometers' });
        const bbox = turf.bbox(bufferedPoly);

        // 2. USE EXACT DB COUNTS (Now strictly <= 12 manually)
        let proposedHigh = forest.hotspots.severity.high || 0;
        let proposedMed = forest.hotspots.severity.medium || 0;
        let proposedLow = forest.hotspots.severity.low || 0;

        // 3. Generate Points
        const severities = [
            { label: 'High', count: proposedHigh, minTemp: 400, maxTemp: 500, color: '#d32f2f' },
            { label: 'Medium', count: proposedMed, minTemp: 325, maxTemp: 399, color: '#ff9800' },
            { label: 'Low', count: proposedLow, minTemp: 300, maxTemp: 324, color: '#ffeb3b' }
        ];

        severities.forEach(sev => {
            if (sev.count <= 0) return;

            // STRICTLY INSIDE POLYGON (User Request: "all hotspots lie inside")
            // No outside buffer zones.

            const generate = (count, targetPoly) => {
                for (let i = 0; i < count; i++) {
                    let point = null;
                    for (let k = 0; k < 30; k++) {
                        // Use bbox of the Forest Itself, not buffer
                        const pt = turf.randomPoint(1, { bbox: turf.bbox(forestPoly) }).features[0];
                        if (turf.booleanPointInPolygon(pt, targetPoly)) {
                            point = pt;
                            break;
                        }
                    }
                    if (point) addFirePoint(point, sev);
                }
            };

            generate(sev.count, forestPoly);
        });
    });

    // --- SCATTERED INDIA HOTSPOTS (User Request) ---
    // Generate ~35 sparse hotspots STRICTLY inside India's borders
    // Simplified India Polygon Coordinates [Lon, Lat]
    const indiaPolyCoords = [
        [68.20, 23.70], [69.50, 23.90], [70.50, 22.50], [72.50, 21.00],
        [72.80, 19.00], [73.00, 18.50], [74.00, 16.00], [75.00, 13.00],
        [76.50, 10.00], [77.50, 8.50], [77.50, 8.00], [78.00, 8.50],
        [79.00, 10.00], [80.00, 12.00], [80.30, 13.10], [82.00, 16.00],
        [84.00, 18.00], [85.00, 19.50], [87.00, 21.50], [88.50, 22.50],
        [89.00, 23.00], [89.50, 25.00], [90.50, 26.00], [92.00, 26.50],
        [94.00, 27.50], [95.50, 28.00], [97.00, 28.50], [96.50, 29.00],
        [94.00, 29.50], [92.00, 30.00], [88.00, 27.50], [85.00, 27.00],
        [82.00, 29.00], [80.00, 30.50], [78.00, 31.50], [77.00, 32.50],
        [76.00, 33.00], [75.00, 34.00], [74.00, 35.00], [73.50, 34.50],
        [73.00, 33.00], [72.00, 32.00], [71.00, 30.00], [70.00, 28.00],
        [69.00, 26.00], [68.50, 24.50], [68.20, 23.70], [68.20, 23.70]
    ];

    // Ensure loop closure just in case

    const indiaPoly = turf.polygon([indiaPolyCoords]);
    const indiaBbox = turf.bbox(indiaPoly);
    const scatteredCount = 35;

    for (let i = 0; i < scatteredCount; i++) {
        let pt = null;
        // Retry logic to ensure point is inside polygon
        for (let k = 0; k < 20; k++) {
            const rnd = turf.randomPoint(1, { bbox: indiaBbox }).features[0];
            if (turf.booleanPointInPolygon(rnd, indiaPoly)) {
                pt = rnd;
                break;
            }
        }

        if (pt) {
            // Random Severity
            const r = Math.random();
            let sev;
            if (r > 0.95) {
                sev = { label: 'High', minTemp: 400, maxTemp: 500, color: '#d32f2f' };
            } else if (r > 0.75) {
                sev = { label: 'Medium', minTemp: 325, maxTemp: 399, color: '#ff9800' };
            } else {
                sev = { label: 'Low', minTemp: 300, maxTemp: 324, color: '#ffeb3b' };
            }

            addFirePoint(pt, sev);
        }
    }

    function addFirePoint(point, sev) {
        // Metadata
        const temp = (Math.random() * (sev.maxTemp - sev.minTemp) + sev.minTemp).toFixed(2);
        const frp = (temp / 50).toFixed(2);

        // Correct Confidence Logic based on Severity
        let minConf = 50, maxConf = 75;
        if (sev.label === 'Medium') { minConf = 75; maxConf = 87; }
        if (sev.label === 'High') { minConf = 87; maxConf = 100; }

        const confidence = Math.floor(Math.random() * (maxConf - minConf)) + minConf;

        const sources = ["MODIS Terra", "MODIS Aqua", "VIIRS SNPP", "NOAA-20"];
        const source = sources[Math.floor(Math.random() * sources.length)];

        const date = new Date().toISOString().split('T')[0];
        const hour = Math.floor(Math.random() * 24);
        const min = Math.floor(Math.random() * 60);
        const timeStr = `${String(hour).padStart(2, '0')}${String(min).padStart(2, '0')}`;

        mockFires.push({
            type: "Feature",
            geometry: point.geometry,
            properties: {
                severity_label: sev.label,
                display_color: sev.color,
                brightness: temp,
                frp: frp,
                confidence: confidence + '%',
                source: source,
                acq_date: date,
                acq_time: timeStr
            }
        });
    }

    const fireGeoJSON = {
        type: "FeatureCollection",
        features: mockFires
    };

    const map = window.map;

    // 3. ADD SOURCE
    if (!map.getSource('live-fires')) {
        map.addSource('live-fires', {
            type: 'geojson',
            data: fireGeoJSON
        });

        // Glow Layer
        map.addLayer({
            id: 'fire-glow',
            type: 'circle',
            source: 'live-fires',
            paint: {
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    2, 5,
                    8, 15
                ],
                'circle-color': ['get', 'display_color'],
                'circle-blur': 1,
                'circle-opacity': 0.5
            }
        });

        // Main Point Layer
        map.addLayer({
            id: 'fire-points',
            type: 'circle',
            source: 'live-fires',
            paint: {
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    2, 3,
                    8, 8
                ],
                'circle-color': ['get', 'display_color'],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
            }
        });

        // --- INTERACTION: CORRECTED POPUP STYLE ---
        map.on('click', 'fire-points', (e) => {
            const f = e.features[0];
            const p = f.properties;
            const coords = f.geometry.coordinates.slice();

            // Determine badge color
            const severityBadgeColor = p.display_color === '#ffeb3b' ? '#fbc02d' :
                p.display_color === '#ff9800' ? '#f57c00' : '#d32f2f';

            // Ensure popup appears over the point even if wraparound
            while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
                coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
            }

            new maplibregl.Popup()
                .setLngLat(coords)
                .setHTML(`
                    <div style="font-family: system-ui; min-width: 220px;">
                        <div style="background: #110d0dc5; padding: 6px 10px; border-radius: 6px 6px 0 0; border-bottom: 2px solid ${severityBadgeColor}; font-weight: 700; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
                             <span style="color: ${severityBadgeColor};">Fire Hotspot</span>
                             <span style="font-size: 10px; background: ${severityBadgeColor}; color: #fff; padding: 2px 6px; border-radius: 4px;">${p.severity_label}</span>
                        </div>
                        <div style="background: #fff; padding: 10px; border-radius: 0 0 6px 6px; font-size: 12px; line-height: 1.6; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                            <div style="margin-bottom: 6px;">
                                <span style="display:inline-block; width: 80px; color: #666; font-weight: 500;">Confidence:</span>
                                <b>${p.confidence}</b>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <span style="display:inline-block; width: 80px; color: #666; font-weight: 500;">Intensity:</span>
                                <b style="color: #000;">${p.frp} MW</b>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <span style="display:inline-block; width: 80px; color: #666; font-weight: 500;">Brightness:</span>
                                <b>${p.brightness} K</b>
                            </div>
                            <div style="margin-bottom: 6px;">
                                <span style="display:inline-block; width: 80px; color: #666; font-weight: 500;">Source:</span>
                                <b style="white-space: nowrap;">${p.source}</b>
                            </div>
                            
                            <div style="margin-bottom: 4px;">
                                <span style="color: #666;">Date:</span> ${p.acq_date}
                            </div>
                            <div style="margin-bottom: 4px;">
                                <span style="color: #666;">Time:</span> ${p.acq_time} UTC
                            </div>
                            <div>
                                <span style="color: #666;">Location:</span> <a href="#" style="color: #3498db; text-decoration: none;">${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°</a>
                            </div>
                        </div>
                    </div>
                `)
                .addTo(map);
        });

        // Cursor
        map.on('mouseenter', 'fire-points', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'fire-points', () => { map.getCanvas().style.cursor = ''; });

    } else {
        // Update existing data
        map.getSource('live-fires').setData(fireGeoJSON);
    }
}
