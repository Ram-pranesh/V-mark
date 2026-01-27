(function() {
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
    let currentDays = 1;
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
        const sources = [
            { id: 'VIIRS_SNPP_NRT', name: 'VIIRS SNPP' },
            { id: 'VIIRS_NOAA20_NRT', name: 'VIIRS NOAA-20' },
            { id: 'MODIS_NRT', name: 'MODIS Terra/Aqua' }
        ];
        
        let allFeatures = [];
        
        for (const source of sources) {
            try {
                // Use area endpoint with bounding box
                const url = `/firms/area?source=${encodeURIComponent(source.id)}&west=${west}&south=${south}&east=${east}&north=${north}&days=${currentDays}`;
                
                console.log(`Fetching ${source.name}...`);
                
                if (pendingAbort) {
                    pendingAbort.abort();
                }
                pendingAbort = new AbortController();

                const response = await fetch(url, { signal: pendingAbort.signal });
                
                if (!response.ok) {
                    console.warn(`${source.name}: ${response.status}`);
                    continue;
                }
                
                const text = await response.text();
                
                // Check if it's valid CSV
                if (text.includes('<!DOCTYPE') || text.includes('<html') || text.length < 50) {
                    console.warn(`${source.name}: Invalid response`, text.slice(0, 200));
                    continue;
                }
                
                const features = csvToGeoJSON(text, source.name);
                allFeatures = allFeatures.concat(features);
                
                console.log(`${source.name}: ${features.length} records`);
                
            } catch (err) {
                console.error(`${source.name}:`, err.message);
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
                        'interpolate', ['linear'], ['get', 'frp'],
                        0, '#ffff00',
                        50, '#ffa500',
                        150, '#ff4500',
                        300, '#ff0000'
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
                        'interpolate', ['linear'], ['get', 'frp'],
                        0, '#ffff00',
                        50, '#ffa500',
                        150, '#ff4500',
                        300, '#ff0000'
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
                
                new maplibregl.Popup()
                    .setLngLat(coords)
                    .setHTML(`
                        <div style="font-family: system-ui; min-width: 180px;">
                            <div style="font-weight: 600; color: #ff4500; margin-bottom: 8px; font-size: 14px;">
                                 Fire Detected
                            </div>
                            <div style="font-size: 12px; line-height: 1.6; color: #333;">
                                <b>Intensity:</b> ${p.frp} MW<br>
                                <b>Confidence:</b> ${p.confidence}<br>
                                <b>Source:</b> ${p.source}<br>
                                <b>Date:</b> ${p.date}<br>
                                <b>Time:</b> ${p.time} UTC<br>
                                <b>Location:</b> ${coords[1].toFixed(4)}°, ${coords[0].toFixed(4)}°
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

    function setupDaysSlider() {
        const slider = document.getElementById('firms-days');
        const label = document.getElementById('firms-days-label');
        if (!slider || !label) return;

        const maxDays = (CONFIG && CONFIG.FIRMS_DAYS_MAX) ? Number(CONFIG.FIRMS_DAYS_MAX) : 5;
        const defaultDays = (CONFIG && CONFIG.FIRMS_DAYS_DEFAULT) ? Number(CONFIG.FIRMS_DAYS_DEFAULT) : 1;
        slider.max = String(maxDays);
        slider.value = String(Math.min(defaultDays, maxDays));
        currentDays = Number(slider.value);
        label.textContent = `${currentDays} day${currentDays === 1 ? '' : 's'}`;

        let sliderTimeout;
        slider.addEventListener('input', () => {
            currentDays = Number(slider.value);
            label.textContent = `${currentDays} day${currentDays === 1 ? '' : 's'}`;
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(() => {
                loadFires();
            }, 600);
        });
    }

    // Initialize
    waitForMap(() => {
        console.log('Fire intelligence: initializing...');
        setupAutoReload();
        setupDaysSlider();
        
        // Auto-load fires on start
        setTimeout(() => {
            loadFires();
        }, 1000);
        
        console.log('Fire intelligence: ready. Open the sidebar for controls.');
    });

})();
