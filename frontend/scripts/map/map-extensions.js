(function () {
    'use strict';

    let mapRef = null;

    // Wait for map to be ready
    function waitForMap(callback) {
        const candidate = window.map || (typeof map !== 'undefined' ? map : null);
        if (candidate && candidate.loaded && candidate.loaded()) {
            mapRef = candidate;
            callback();
        } else if (candidate) {
            mapRef = candidate;
            candidate.on('load', callback);
        } else {
            setTimeout(() => waitForMap(callback), 100);
        }
    }

    // Fetch fire data from FIRMS API
    const FETCH_GLOBAL = false;
    const FIRMS_DAYS_WINDOW = 5; // max lookback days allowed by the UI
    const todayIso = () => new Date().toISOString().split('T')[0];
    const clampToWindow = (iso) => {
        if (!iso) return todayIso();
        const today = new Date();
        const earliest = new Date();
        earliest.setDate(today.getDate() - (FIRMS_DAYS_WINDOW - 1));
        const picked = new Date(iso);
        if (Number.isNaN(picked.getTime())) return todayIso();
        if (picked > today) return todayIso();
        if (picked < earliest) return earliest.toISOString().split('T')[0];
        return iso;
    };

    let selectedDate = todayIso();
    let isLoading = false;
    let pendingAbort = null;

    async function fetchFireData() {
        const apiKey = CONFIG.FIRMS_MAP_KEY;
        if (!apiKey) return { type: 'FeatureCollection', features: [] };

        // Use global bounds to fetch all available points when requested
        const bounds = mapRef.getBounds();
        const west = (FETCH_GLOBAL ? -180 : bounds.getWest()).toFixed(2);
        const south = (FETCH_GLOBAL ? -90 : bounds.getSouth()).toFixed(2);
        const east = (FETCH_GLOBAL ? 180 : bounds.getEast()).toFixed(2);
        const north = (FETCH_GLOBAL ? 90 : bounds.getNorth()).toFixed(2);

        // FIRMS API endpoints for different satellites
        const allSources = [
            { id: 'VIIRS_SNPP_NRT', name: 'VIIRS SNPP' },
            { id: 'VIIRS_NOAA20_NRT', name: 'VIIRS NOAA-20' },
            { id: 'MODIS_NRT', name: 'MODIS Terra/Aqua' }
        ];

        // Filter sources based on user selection
        if (!window.enabledSources) {
            window.enabledSources = new Set(['MODIS_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT']);
        }
        const sources = allSources.filter(s => window.enabledSources.has(s.id));

        let allFeatures = [];
        const targetDate = clampToWindow(selectedDate || todayIso());

        // FIRMS "days" is relative to today, not an absolute date.
        // Request only as many days as needed to include the chosen date, then filter to that date client-side.
        const today = new Date();
        const picked = new Date(targetDate);
        const diffDays = Math.floor((today - picked) / 86400000);
        const daySpan = Math.min(FIRMS_DAYS_WINDOW, Math.max(1, diffDays + 1));

        for (const source of sources) {
            try {
                // Use the new processed endpoint that filters and classifies data
                const url = `/firms/area/processed?source=${encodeURIComponent(source.id)}&west=${west}&south=${south}&east=${east}&north=${north}&days=${daySpan}`;

                console.log(`Fetching ${source.name}...`);

                if (pendingAbort) pendingAbort.abort();
                pendingAbort = new AbortController();

                const response = await fetch(url, { signal: pendingAbort.signal });

                if (!response.ok) {
                    console.warn(`${source.name}: ${response.status}`);
                    continue;
                }

                const geojson = await response.json();

                // Filter by target date if specified
                const features = geojson.features.filter((f) => !targetDate || f.properties.acq_date === targetDate);
                allFeatures = allFeatures.concat(features);

                console.log(`${source.name}: ${features.length} records (${geojson.metadata.filtered_detections} after filtering)`);

            } catch (err) {
                if (err.name === 'AbortError') {
                    console.warn(`${source.name}: fetch aborted (new request started)`);
                } else {
                    console.error(`${source.name}:`, err.message);
                }
            }
        }

        return {
            type: 'FeatureCollection',
            features: allFeatures
        };
    }

    // Convert CSV to GeoJSON
    function csvToGeoJSON(csv, source) {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].toLowerCase().split(',');
        const latIdx = headers.indexOf('latitude');
        const lonIdx = headers.indexOf('longitude');
        const frpIdx = headers.indexOf('frp');
        const confIdx = headers.indexOf('confidence');
        const dateIdx = headers.indexOf('acq_date');
        const timeIdx = headers.indexOf('acq_time');
        const brightIdx = headers.findIndex(h => h.includes('bright'));

        const features = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const lat = parseFloat(cols[latIdx]);
            const lon = parseFloat(cols[lonIdx]);

            if (isNaN(lat) || isNaN(lon)) continue;

            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat]
                },
                properties: {
                    frp: parseFloat(cols[frpIdx]) || 10,
                    confidence: cols[confIdx] || 'nominal',
                    date: cols[dateIdx] || '',
                    time: cols[timeIdx] || '',
                    brightness: parseFloat(cols[brightIdx]) || 300,
                    source: source
                }
            });
        }

        return features;
    }

    // Add fire layer to map
    function addFireLayer(geojson) {
        const sourceId = 'fire-source';
        const glowId = 'fire-glow';
        const layerId = 'fire-points';

        // Update or add source
        if (mapRef.getSource(sourceId)) {
            mapRef.getSource(sourceId).setData(geojson);
        } else {
            mapRef.addSource(sourceId, {
                type: 'geojson',
                data: geojson
            });

            // Glow effect layer
            mapRef.addLayer({
                id: glowId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        2, ['interpolate', ['linear'], ['get', 'frp'], 0, 3, 100, 8, 500, 15],
                        8, ['interpolate', ['linear'], ['get', 'frp'], 0, 8, 100, 20, 500, 40]
                    ],
                    'circle-color': [
                        'match',
                        ['get', 'display_color'],
                        'yellow', '#ffeb3b',
                        'orange', '#ff9800',
                        'red', '#f44336',
                        '#ff4500' // default
                    ],
                    'circle-blur': 1,
                    'circle-opacity': 0.5
                }
            });

            // Main fire points
            mapRef.addLayer({
                id: layerId,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        2, ['interpolate', ['linear'], ['get', 'frp'], 0, 2, 100, 5, 500, 10],
                        8, ['interpolate', ['linear'], ['get', 'frp'], 0, 5, 100, 12, 500, 25]
                    ],
                    'circle-color': [
                        'match',
                        ['get', 'display_color'],
                        'yellow', '#ffeb3b',
                        'orange', '#ff9800',
                        'red', '#f44336',
                        '#ff4500' // default
                    ],
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                }
            });

            // Click popup
            mapRef.on('click', layerId, (e) => {
                const f = e.features[0];
                const p = f.properties;
                const coords = f.geometry.coordinates;

                // Determine severity badge color
                const severityBadgeColor = p.display_color === 'yellow' ? '#fbc02d' :
                    p.display_color === 'orange' ? '#f57c00' : '#d32f2f';

                // Format confidence display - keep VIIRS as original (l/n/h)
                let confidenceDisplay = p.confidence;
                if (typeof p.confidence === 'number') {
                    confidenceDisplay = p.confidence + '%';
                }
                // For VIIRS, keep as-is (l, n, h)

                new maplibregl.Popup()
                    .setLngLat(coords)
                    .setHTML(`
                        <div style="font-family: system-ui; min-width: 220px;">
                            <div style="background: #110d0dc5; padding: 6px 10px; border-radius: 6px 6px 0 0; border-bottom: 2px solid ${severityBadgeColor}; font-weight: 700; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
                                 <span style="color: ${severityBadgeColor};">Fire Hotspot</span>
                                 <span style="font-size: 10px; background: ${severityBadgeColor}; color: #fff; padding: 2px 6px; border-radius: 4px;">${p.severity_label || 'Active'}</span>
                            </div>
                            <div style="background: #fff; padding: 10px; border-radius: 0 0 6px 6px; font-size: 12px; line-height: 1.6; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                                <div style="margin-bottom: 6px;">
                                    <span style="display:inline-block; width: 80px; color: #666; font-weight: 500;">Confidence:</span>
                                    <b>${confidenceDisplay}</b>
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
                                    <b style="white-space: nowrap;">${p.source || p.satellite}</b>
                                </div>
                                <hr style="border: 0; border-top: 1px solid #eee; margin: 8px 0;">
                                <div style="margin-bottom: 4px;">
                                    <span style="color: #666;">Date:</span> ${p.acq_date || p.date}
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <span style="color: #666;">Time:</span> ${p.acq_time || p.time} UTC
                                </div>
                                <div>
                                    <span style="color: #666;">Location:</span> <a href="#" style="color: #3498db; text-decoration: none;">${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°</a>
                                </div>
                            </div>
                        </div>
                    `)
                    .addTo(mapRef);
            });

            mapRef.on('mouseenter', layerId, () => {
                mapRef.getCanvas().style.cursor = 'pointer';
            });
            mapRef.on('mouseleave', layerId, () => {
                mapRef.getCanvas().style.cursor = '';
            });
        }

        return geojson.features.length;
    }

    // Load fires for current view
    async function loadFires() {
        try {
            if (isLoading) return;
            isLoading = true;
            const geojson = await fetchFireData();
            addFireLayer(geojson);
        } catch (err) {
            console.error('Fire load error:', err);
        } finally {
            isLoading = false;
        }
    }

    // Auto-reload on map move
    let moveTimeout;
    function setupAutoReload() {
        mapRef.on('moveend', () => {
            // Only auto-reload if we already have data
            if (mapRef.getSource('fire-source')) {
                clearTimeout(moveTimeout);
                moveTimeout = setTimeout(() => {
                    console.log(' Reloading fires for new view...');
                    loadFires();
                }, 1200);
            }
        });
    }

    window.setFirmsDate = (isoDate) => {
        selectedDate = clampToWindow(isoDate);
        loadFires();
    };

    // Initialize
    waitForMap(() => {
        console.log('Fire intelligence: initializing...');
        setupAutoReload();

        // Auto-load fires on start
        setTimeout(() => {
            loadFires();
        }, 1000);

        console.log('Fire intelligence: ready. Open the sidebar for controls.');
    });

})();
