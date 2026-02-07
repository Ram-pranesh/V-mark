// Drone Map Initialization
const CONFIG = {
    DEFAULT_CENTER: [79.0, 21.0],
    DEFAULT_ZOOM: 5
};

const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
            'satellite': {
                'type': 'raster',
                'tiles': ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                'tileSize': 256,
                'attribution': 'Esri, Maxar'
            },
            'borders': {
                'type': 'raster',
                'tiles': ['https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'],
                'tileSize': 256
            },
            'mapbox-dem': {
                'type': 'raster-dem',
                'url': 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
                'tileSize': 256
            }
        },
        layers: [
            { 'id': 'satellite', 'type': 'raster', 'source': 'satellite', 'paint': {} },
            { 'id': 'admin-borders', 'type': 'raster', 'source': 'borders', 'paint': { 'raster-opacity': 0.7 } }
        ],
        terrain: { source: 'mapbox-dem', exaggeration: 1.5 }
    },
    center: CONFIG.DEFAULT_CENTER,
    zoom: CONFIG.DEFAULT_ZOOM,
    pitch: 0,
    attributionControl: false
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
window.map = map;

// Resize Observer
new ResizeObserver(() => map.resize()).observe(document.getElementById('map'));

// Load Forest & Fire Logic
map.on('load', () => {
    // 1. Forest Polygons
    const forestFeatures = [];
    if (window.DRONE_DB && window.DRONE_DB.forests) {
        Object.keys(window.DRONE_DB.forests).forEach(key => {
            const forest = window.DRONE_DB.forests[key];
            if (forest.coordinates) {
                forestFeatures.push({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [forest.coordinates] },
                    properties: { id: key, name: forest.name, loc: forest.location }
                });
            }
        });
    }

    map.addSource('forest-zones', { type: 'geojson', data: { type: "FeatureCollection", features: forestFeatures } });
    map.addLayer({ 'id': 'forest-fill', 'type': 'fill', 'source': 'forest-zones', 'paint': { 'fill-color': '#ff6b35', 'fill-opacity': 0.15 } });
    map.addLayer({ 'id': 'forest-line', 'type': 'line', 'source': 'forest-zones', 'paint': { 'line-color': '#ff6b35', 'line-width': 2 } });

    // Interaction
    map.on('click', 'forest-fill', (e) => {
        if (window.DroneUI) window.DroneUI.openForestPanel(e.features[0].properties.id);
    });
    map.on('mouseenter', 'forest-fill', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'forest-fill', () => map.getCanvas().style.cursor = '');

    if (forestFeatures.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        forestFeatures.forEach(f => f.geometry.coordinates[0].forEach(c => bounds.extend(c)));
        map.fitBounds(bounds, { padding: 60, pitch: 0 });
    }

    // Initialize Communication Nodes System
    if (window.COMM_NODES_SYSTEM && window.DRONE_DB) {
        COMM_NODES_SYSTEM.generateNodes();
        COMM_NODES_SYSTEM.addNodesToMap(map);
        COMM_NODES_SYSTEM.addLinksToMap(map);
        COMM_NODES_SYSTEM.addCoverageToMap(map);
    }

    // Load Fires
    loadLiveSatelliteFires();
});

// Animation Handler
window.DroneMap = {
    animateInspection: function (lat, lng) {
        if (!map) return;

        // 1. Zoom In
        map.flyTo({
            center: [lng, lat],
            zoom: 15,
            pitch: 40,
            duration: 3000,
            essential: true
        });

        // 2. Wait 3s then Zoom Out (Simulation of 'Checking')
        setTimeout(() => {
            // Rotate slightly
            map.easeTo({ bearing: 90, duration: 4000 });

            // Then return to default
            setTimeout(() => {
                map.flyTo({
                    center: CONFIG.DEFAULT_CENTER,
                    zoom: CONFIG.DEFAULT_ZOOM,
                    pitch: 0,
                    bearing: 0,
                    duration: 3000
                });
            }, 4000); // Wait for Rotation
        }, 3500); // Initial Zoom Time + Hover
    }
};

async function loadLiveSatelliteFires() {
    console.log("Initializing Fire Simulation...");
    if (!window.DRONE_DB || !window.DRONE_DB.forests || typeof turf === 'undefined') return;

    const mockFires = [];

    // 1. ADD: Explicit Synchronization with DroneAlertData
    if (window.DroneAlertData) {
        const { stage1_locations, stage2_locations, stage3_locations } = window.DroneAlertData;

        // Helper to add specific points
        const addSpecificPoint = (loc, severity, color) => {
            mockFires.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
                properties: {
                    id: loc.id,
                    severity_label: severity,
                    display_color: color,
                    brightness: loc.brightness || (severity === 'High' ? 850 : 350),
                    frp: 7.5,
                    confidence: loc.confidence + '%',
                    city: loc.city,
                    source: "ALERT SYSTEM SYNC",
                    acq_date: new Date().toISOString().split('T')[0],
                    acq_time: "LIVE"
                }
            });
        };

        stage1_locations.forEach(loc => addSpecificPoint(loc, 'Medium', '#D97706'));
        stage2_locations.forEach(loc => addSpecificPoint(loc, 'Stage 2', '#3B82F6'));
        stage3_locations.forEach(loc => addSpecificPoint(loc, 'High', '#B91C1C'));
    }

    // 2. FILLER DATA: Distributed across India (inside AND outside forest boundaries)
    // Use hotspot data from DRONE_DB
    Object.entries(window.DRONE_DB.forests).forEach(([forestKey, forest]) => {
        if (!forest.coordinates || !forest.hotspots) return;

        const forestPoly = turf.polygon([forest.coordinates]);
        const bbox = turf.bbox(forestPoly);

        // Expand bbox to include surrounding areas (50km buffer)
        const expandedBbox = [
            bbox[0] - 0.5, bbox[1] - 0.5,
            bbox[2] + 0.5, bbox[3] + 0.5
        ];

        // Severity configuration with SOFTER colors (reduced contrast)
        const severityConfig = {
            stage3: { label: 'Stage 3', color: '#C94A4A', brightness: [800, 950], confidence: [92, 99] },
            stage2: { label: 'Stage 2', color: '#6B8EC9', brightness: [650, 800], confidence: [85, 92] },
            stage1: { label: 'Stage 1', color: '#D9A066', brightness: [500, 650], confidence: [75, 85] },
            medium: { label: 'Medium', color: '#D9C766', brightness: [350, 500], confidence: [60, 75] },
            low: { label: 'Low', color: '#7AB87A', brightness: [280, 350], confidence: [50, 60] }
        };

        // Generate hotspots for each severity level
        Object.entries(forest.hotspots.severity).forEach(([severityKey, count]) => {
            const config = severityConfig[severityKey];
            if (!config || count === 0) return;

            for (let i = 0; i < count; i++) {
                // 60% inside forest, 40% outside (spread across India)
                const shouldBeInside = Math.random() < 0.6;
                let pt = null;

                if (shouldBeInside) {
                    // Generate inside forest
                    for (let k = 0; k < 20; k++) {
                        const rnd = turf.randomPoint(1, { bbox: bbox }).features[0];
                        if (turf.booleanPointInPolygon(rnd, forestPoly)) {
                            pt = rnd;
                            break;
                        }
                    }
                } else {
                    // Generate outside forest (in expanded area)
                    for (let k = 0; k < 20; k++) {
                        const rnd = turf.randomPoint(1, { bbox: expandedBbox }).features[0];
                        if (!turf.booleanPointInPolygon(rnd, forestPoly)) {
                            pt = rnd;
                            break;
                        }
                    }
                }

                if (pt) {
                    const brightness = Math.floor(Math.random() * (config.brightness[1] - config.brightness[0]) + config.brightness[0]);
                    const confidence = Math.floor(Math.random() * (config.confidence[1] - config.confidence[0]) + config.confidence[0]);

                    mockFires.push({
                        type: "Feature",
                        geometry: pt.geometry,
                        properties: {
                            id: `${forestKey}-${severityKey}-${i}`,
                            severity_label: config.label,
                            display_color: config.color,
                            brightness: brightness,
                            frp: severityKey === 'stage3' ? 12.5 : severityKey === 'stage2' ? 8.5 : severityKey === 'stage1' ? 5.5 : severityKey === 'medium' ? 3.2 : 1.5,
                            confidence: confidence + '%',
                            city: forest.location,
                            source: severityKey.includes('stage') ? 'ALERT SYSTEM' : 'SATELLITE',
                            acq_date: new Date().toISOString().split('T')[0],
                            acq_time: severityKey.includes('stage') ? 'LIVE' : '14:20'
                        }
                    });
                }
            }
        });
    });


    const fireGeoJSON = { type: "FeatureCollection", features: mockFires };

    if (!map.getSource('live-fires')) {
        map.addSource('live-fires', { type: 'geojson', data: fireGeoJSON });

        map.addLayer({
            id: 'fire-glow', type: 'circle', source: 'live-fires',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 6, 8, 20],
                'circle-color': ['get', 'display_color'],
                'circle-blur': 0.8, 'circle-opacity': 0.3
            }
        });

        map.addLayer({
            id: 'fire-points', type: 'circle', source: 'live-fires',
            paint: {
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4, 8, 9],
                'circle-color': ['get', 'display_color'],
                'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff'
            }
        });

        map.on('click', 'fire-points', (e) => {
            const f = e.features[0];
            const p = f.properties;
            const coords = f.geometry.coordinates.slice();

            // Action Button Logic
            let btnHtml = '';
            // Stage 3 - Full Analysis
            if (p.severity_label === 'Stage 3') {
                btnHtml = `<button onclick="window.DroneAlert.openSpecialStats('${p.id}', ${coords[1]}, ${coords[0]}, '${p.city}')" style="margin-top: 12px; width: 100%; padding: 8px; background: ${p.display_color}; border: none; border-radius: 4px; color: #fff; font-weight: 800; cursor: pointer; font-size: 11px;">VIEW FULL ANALYSIS</button>`;
            }
            // Stage 2 - Telemetry
            else if (p.severity_label === 'Stage 2') {
                btnHtml = `<button onclick="window.DroneAlert.openDetailsWindow('${p.id}', ${coords[1]}, ${coords[0]}, '${p.city}', 2)" style="margin-top: 12px; width: 100%; padding: 8px; background: ${p.display_color}; border: none; border-radius: 4px; color: #fff; font-weight: 800; cursor: pointer; font-size: 11px;">VIEW TELEMETRY</button>`;
            }
            // Stage 1 - Telemetry
            else if (p.severity_label === 'Stage 1') {
                btnHtml = `<button onclick="window.DroneAlert.openDetailsWindow('${p.id}', ${coords[1]}, ${coords[0]}, '${p.city}', 1)" style="margin-top: 12px; width: 100%; padding: 8px; background: ${p.display_color}; border: none; border-radius: 4px; color: #fff; font-weight: 800; cursor: pointer; font-size: 11px;">VIEW STATS</button>`;
            }
            // Medium - View Stats
            else if (p.severity_label === 'Medium') {
                btnHtml = `<button onclick="window.DroneAlert.openDetailsWindow('${p.id}', ${coords[1]}, ${coords[0]}, '${p.city}', 1)" style="margin-top: 12px; width: 100%; padding: 8px; background: ${p.display_color}; border: none; border-radius: 4px; color: #fff; font-weight: 800; cursor: pointer; font-size: 11px;">VIEW STATS</button>`;
            }
            // Low - Inspection Animation
            else {
                btnHtml = `<button onclick="window.DroneMap.animateInspection(${coords[1]}, ${coords[0]})" style="margin-top: 12px; width: 100%; padding: 8px; background: #333; border: none; border-radius: 4px; color: #fff; font-weight: 700; cursor: pointer; font-size: 11px; text-transform:uppercase;">Inspect Signal</button>`;
            }

            // Lower contrast colors
            const badgeColor = p.display_color + 'CC'; // Add opacity to soften

            new maplibregl.Popup()
                .setLngLat(coords)
                .setHTML(`
                    <div style="font-family: 'Segoe UI', system-ui; min-width: 220px; color: #333;">
                        <div style="background: ${badgeColor}; padding: 8px 12px; border-radius: 6px 6px 0 0; color: #fff; font-weight: 800; font-size: 13px; display: flex; justify-content: space-between;">
                             <span>${p.severity_label.toUpperCase()}</span>
                             <span style="font-size: 10px; opacity: 0.9;">${p.confidence}</span>
                        </div>
                        <div style="background: #fff; padding: 12px; border-radius: 0 0 6px 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <div style="margin-bottom: 8px; font-size: 14px; font-weight: 700; color:#444;">${p.city}</div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: #777;">
                                <div>INTENSITY:<br><b style="color:#222;">${p.brightness} K</b></div>
                                <div>SOURCE:<br><b style="color:#222;">${p.source}</b></div>
                            </div>
                            ${btnHtml}
                        </div>
                    </div>
                `)
                .addTo(map);
        });

        map.on('mouseenter', 'fire-points', () => map.getCanvas().style.cursor = 'pointer');
        map.on('mouseleave', 'fire-points', () => map.getCanvas().style.cursor = '');
    } else {
        map.getSource('live-fires').setData(fireGeoJSON);
    }
}
