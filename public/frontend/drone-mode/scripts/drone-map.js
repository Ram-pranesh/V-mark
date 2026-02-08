// Drone Map Initialization
const CONFIG = {
    DEFAULT_CENTER: [79.0, 21.0],
    DEFAULT_ZOOM: 5
};

// --- SVG ICONS ---
const DOCK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="#ff6b35"><path d="M120-120v-80l170-49 62-520q4-30 26-50.5t53-20.5h98q31 0 53 20.5t26 50.5l62 520 170 49v80H120Zm320-120h80v-480q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720v480Z"/></svg>`;
const NODE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-360q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM480-160q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Zm0-320Zm141.5 141.5Q680-397 680-480t-58.5-141.5Q563-680 480-680t-141.5 58.5Q280-563 280-480t58.5 141.5Q397-280 480-280t141.5-58.5Z"/></svg>`;

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

// Animation Handler
window.DroneMap = window.DroneMap || {};
window.DroneMap.animateInspection = function (lat, lng) {
    // Minimal inspect: avoid camera spins/flies per user request
    if (!map) return;
    map.easeTo({ center: [lng, lat], zoom: 13, pitch: 0, bearing: 0, duration: 500 });
};

// Load Forest & Fire Logic
map.on('load', async () => {
    // 0. Load Images
    const loadSvg = (name, svg) => {
        if (map.hasImage(name)) return;
        const img = new Image(48, 48);
        img.onload = () => { if (!map.hasImage(name)) map.addImage(name, img); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };
    loadSvg('dock-icon', DOCK_ICON_SVG);
    loadSvg('node-icon', NODE_ICON_SVG);

    // 1. Forest Polygons
    const forestFeatures = [];
    const dockFeatures = [];

    if (window.DRONE_DB && window.DRONE_DB.forests) {
        Object.keys(window.DRONE_DB.forests).forEach(key => {
            const forest = window.DRONE_DB.forests[key];
            if (forest.coordinates) {
                forestFeatures.push({
                    type: "Feature",
                    geometry: { type: "Polygon", coordinates: [forest.coordinates] },
                    properties: { id: key, name: forest.name, loc: forest.location }
                });

                // Add Docks
                if (forest.docks) {
                    forest.docks.forEach(dock => {
                        if (dock.coordinates) {
                            dockFeatures.push({
                                type: "Feature",
                                geometry: { type: "Point", coordinates: dock.coordinates },
                                properties: {
                                    id: dock.id,
                                    location: dock.location,
                                    forestKey: key
                                }
                            });
                        }
                    });
                }
            }
        });
    }

    if (!map.getSource('forest-zones')) {
        map.addSource('forest-zones', { type: 'geojson', data: { type: "FeatureCollection", features: forestFeatures } });
        map.addLayer({ 'id': 'forest-fill', 'type': 'fill', 'source': 'forest-zones', 'paint': { 'fill-color': '#ff6b35', 'fill-opacity': 0.15 } });
        map.addLayer({ 'id': 'forest-line', 'type': 'line', 'source': 'forest-zones', 'paint': { 'line-color': '#ff6b35', 'line-width': 2 } });
    }

    if (!map.getSource('dock-stations')) {
        map.addSource('dock-stations', { type: 'geojson', data: { type: "FeatureCollection", features: dockFeatures } });
        map.addLayer({
            'id': 'dock-stations-layer',
            'type': 'symbol',
            'source': 'dock-stations',
            'layout': {
                'icon-image': 'dock-icon',
                'icon-size': 0.8,
                'icon-allow-overlap': true,
                'visibility': 'none' // Hidden initially
            }
        });
    }

    // Interaction
    map.on('click', 'forest-fill', (e) => {
        if (window.DroneUI) window.DroneUI.openForestPanel(e.features[0].properties.id);
    });

    map.on('click', 'dock-stations-layer', (e) => {
        const p = e.features[0].properties;
        if (window.DroneUI) {
            if (p.forestKey) window.DroneUI.openForestPanel(p.forestKey);
            window.DroneUI.handleDockSelect(p.id);
        }
    });

    map.on('mouseenter', 'forest-fill', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'forest-fill', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'dock-stations-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'dock-stations-layer', () => map.getCanvas().style.cursor = '');

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

    // Load Generative Fires
    loadLiveSatelliteFires();
});


async function loadLiveSatelliteFires() {
    console.log("%c [FIRE-SIM] Starting Heatmap Generation...", "color:#ff6b35; font-weight:bold; font-size:12px;");

    if (typeof turf === 'undefined') {
        console.error("CRITICAL: Turf.js not loaded.");
        return;
    }

    // Retry mechanism for DB
    if (!window.DRONE_DB || !window.DRONE_DB.forests) {
        console.warn("[FIRE-SIM] DB not ready. Retrying in 500ms...");
        setTimeout(loadLiveSatelliteFires, 500);
        return;
    }

    const mockFires = [];

    // 1. Alert Sync
    if (window.DroneAlertData) {
        console.log("Syncing with Alert Center...");
        const { stage1_locations, stage2_locations, stage3_locations } = window.DroneAlertData;
        const addPt = (loc, sev, col) => {
            mockFires.push({
                type: "Feature", geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
                properties: {
                    id: loc.id, severity_label: sev, display_color: col,
                    brightness: loc.brightness || (sev === 'High' ? 850 : 350),
                    frp: 10, confidence: loc.confidence + '%', city: loc.city,
                    source: "ALERT SYNC", acq_date: "LIVE", acq_time: "NOW"
                }
            });
        };
        if (stage1_locations) stage1_locations.forEach(l => addPt(l, 'Medium', '#D97706'));
        if (stage2_locations) stage2_locations.forEach(l => addPt(l, 'Stage 2', '#3B82F6'));
        if (stage3_locations) stage3_locations.forEach(l => addPt(l, 'High', '#B91C1C'));
    }

    // 2. Distributed Hotspots (Land Only BBOX)
    // Central India Landmass (Avoids Ocean)
    const INDIA_LAND_BBOX = [75.0, 16.0, 84.0, 26.0];
    console.log("Generating distributed points within Land BBOX:", INDIA_LAND_BBOX);

    Object.entries(window.DRONE_DB.forests).forEach(([forestKey, forest]) => {
        if (!forest.hotspots) return;

        const severityConfig = {
            stage3: { label: 'Stage 3', color: '#d63b3b', brightness: [800, 950], confidence: [92, 99] },
            stage2: { label: 'Stage 2', color: '#4f82f2', brightness: [650, 800], confidence: [85, 92] },
            stage1: { label: 'Stage 1', color: '#f28c28', brightness: [500, 650], confidence: [75, 85] },
            medium: { label: 'Medium', color: '#e5d24a', brightness: [350, 500], confidence: [60, 75] },
            low: { label: 'Low', color: '#45b36b', brightness: [280, 350], confidence: [50, 60] }
        };

        const fireRequests = [];
        Object.entries(forest.hotspots.severity).forEach(([k, c]) => {
            for (let i = 0; i < c; i++) fireRequests.push(k);
        });

        // Polygon & BBox for validations
        if (!forest.coordinates) return;
        const forestPoly = turf.polygon([forest.coordinates]);
        const bbox = turf.bbox(forestPoly);

        let insideCount = 0;
        const insideCap = Math.min(9, fireRequests.length); // Keep in-region fires < 10

        fireRequests.forEach((sevKey, idx) => {
            const conf = severityConfig[sevKey];
            if (!conf) return;

            // Decision: Inside or Outside?
            const shouldPrioritizeInside = insideCount < insideCap;
            let isInside = shouldPrioritizeInside;
            if (!isInside && insideCount < insideCap && Math.random() < 0.35) {
                isInside = true;
            }

            let pt = null;
            const limit = 40; // Max attempts

            if (isInside) {
                const nodes = window.COMM_NODES_SYSTEM && window.COMM_NODES_SYSTEM.nodes ? window.COMM_NODES_SYSTEM.nodes[forestKey] || [] : [];
                const radiusKm = (window.COMM_NODES_SYSTEM && window.COMM_NODES_SYSTEM.coverageRadius) || 15;

                // Prefer placing inside a comm-node coverage circle that is also inside the forest
                for (let k = 0; k < limit; k++) {
                    let candidate = null;
                    if (nodes.length > 0) {
                        const n = nodes[Math.floor(Math.random() * nodes.length)];
                        const dist = Math.random() * radiusKm;
                        const bearing = Math.random() * 360 - 180;
                        const nodePt = turf.point([n.lng, n.lat]);
                        candidate = turf.destination(nodePt, dist, bearing, { units: 'kilometers' });
                    } else {
                        candidate = turf.randomPoint(1, { bbox: bbox }).features[0];
                    }

                    if (candidate && turf.booleanPointInPolygon(candidate, forestPoly)) { pt = candidate; break; }
                }
            } else {
                for (let k = 0; k < limit; k++) {
                    // Outside (India Land BBOX)
                    const r = turf.randomPoint(1, { bbox: INDIA_LAND_BBOX }).features[0];
                    if (!turf.booleanPointInPolygon(r, forestPoly)) { pt = r; break; }
                }
            }

            if (pt) {
                // Calculate params
                const bright = Math.floor(Math.random() * (conf.brightness[1] - conf.brightness[0]) + conf.brightness[0]);
                const confid = Math.floor(Math.random() * (conf.confidence[1] - conf.confidence[0]) + conf.confidence[0]);

                if (isInside) insideCount++;

                mockFires.push({
                    type: "Feature", geometry: pt.geometry,
                    properties: {
                        id: `${forestKey}-${sevKey}-${idx}`,
                        severity_label: conf.label,
                        display_color: conf.color,
                        brightness: bright,
                        frp: 5.5,
                        confidence: confid + '%',
                        city: isInside ? forest.location : "Active Fire Zone",
                        source: sevKey.includes('stage') ? 'ALERT SYSTEM' : 'SATELLITE',
                        acq_date: new Date().toISOString().split('T')[0],
                        acq_time: "LIVE",
                        forestKey,
                        insideForest: isInside
                    }
                });
            }
        });
    });

    console.log(`[FIRE-SIM] Generation Complete. Total Hotspots: ${mockFires.length}`);

    const fireGeoJSON = { type: "FeatureCollection", features: mockFires };
    window.DroneMap.fireData = fireGeoJSON;

    if (window.map) {
        if (!window.map.getSource('live-fires')) {
            console.log("Adding new 'live-fires' source...");
            window.map.addSource('live-fires', { type: 'geojson', data: fireGeoJSON });

            // Add layers
            // Glow
            window.map.addLayer({
                id: 'fire-points', type: 'circle', source: 'live-fires',
                paint: {
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.5, 8, 6.5],
                    'circle-color': ['get', 'display_color'],
                    'circle-stroke-width': 0.6,
                    'circle-stroke-color': '#f3f3f3',
                    'circle-opacity': 0.7
                }
            });

            // Add interactions
            window.map.on('click', 'fire-points', (e) => {
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

            window.map.on('mouseenter', 'fire-points', () => window.map.getCanvas().style.cursor = 'pointer');
            window.map.on('mouseleave', 'fire-points', () => window.map.getCanvas().style.cursor = '');

        } else {
            console.log("Updating existing 'live-fires' source...");
            window.map.getSource('live-fires').setData(fireGeoJSON);
        }
    }

    // Manual Debug Trigger
    window.DroneMap.reloadFires = loadLiveSatelliteFires;
}

// Auto-Loader Check (for situations where map is already loaded)
if (window.map && window.map.loaded()) {
    console.log("Map already loaded. Triggering fire generation...");
    loadLiveSatelliteFires();
}
