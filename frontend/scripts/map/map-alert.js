/**
 * MULTI-STAGE FIRE DETECTION ALERT CENTER
 * Implements Stage 1 (Satellite), Stage 2 (Atmospheric), Stage 3 (Drone) verification
 */

(function () {
    console.log('Map-alert.js loaded successfully');

    let alertData = {
        stage1_count: 0,
        stage2_count: 0,
        stage3_count: 0,
        stage1_locations: [],
        stage2_locations: [],
        stage3_locations: [],
        docking_stations_available: false
    };

    let currentView = null; // 'stage1', 'stage2', 'stage3', or null

    /**
     * Open Alert Center Modal
     */
    window.openAlertCenter = async function () {
        console.log('Alert Center opened!');

        // Fetch multi-stage analysis data
        await fetchMultiStageData();

        // Create modal
        let modal = document.getElementById('alert-center-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'alert-center-modal';
        modal.style.cssText = `
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%);
            width: 700px; 
            max-height: 600px;
            background: rgba(10, 12, 16, 0.98); 
            backdrop-filter: blur(15px);
            border: 1px solid #444; 
            border-radius: 12px;
            color: #fff; 
            z-index: 10000; 
            display: flex; 
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0,0,0,0.8);
            font-family: 'Segoe UI', sans-serif;
        `;

        modal.innerHTML = createAlertCenterHTML();
        document.body.appendChild(modal);

        // Bind events
        document.getElementById('alert-close-btn').addEventListener('click', closeAlertCenter);
        bindStageClickEvents();
    };

    /**
     * Fetch multi-stage analysis from existing map data
     * OPTIMIZED: Uses data already loaded on the map
     */
    async function fetchMultiStageData() {
        try {
            // Show minimalistic spinner
            const spinner = document.createElement('div');
            spinner.id = 'alert-loading';
            spinner.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 10001;
            `;
            spinner.innerHTML = `
                <div style="width: 50px; height: 50px; border: 3px solid #333; border-top: 3px solid #FF8C00; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(spinner);

            // Get existing fire data from the map
            const fireSource = window.map.getSource('fire-source');
            let stage1_locations = [];
            let stage2_locations = [];

            if (fireSource) {
                const fireData = fireSource._data;

                if (fireData && fireData.features) {
                    // Analyze existing hotspots
                    fireData.features.forEach(feature => {
                        const props = feature.properties;
                        const coords = feature.geometry.coordinates;

                        // Check if it's Stage 1 (confidence >= 90% and orange color)
                        if (props.severity_label === 'Stage 1' ||
                            (props.confidence_normalized >= 90 && props.display_color === '#FF8C00')) {

                            stage1_locations.push({
                                latitude: coords[1],
                                longitude: coords[0],
                                confidence: props.confidence_normalized || props.confidence,
                                trend: [props.confidence_normalized || props.confidence],
                                slope: 0,
                                hotspot_count: 1,
                                daily_stats: [{
                                    date: props.acq_date,
                                    avg_confidence: props.confidence_normalized || props.confidence,
                                    avg_frp: props.frp,
                                    avg_brightness: props.brightness
                                }],
                                stage: 1,
                                status: 'STAGE_1_CONFIRMED',
                                color: '#FF8C00'
                            });
                        }
                    });
                }
            }

            alertData = {
                stage1_count: stage1_locations.length,
                stage2_count: stage2_locations.length,
                stage3_count: 0,
                stage1_locations: stage1_locations,
                stage2_locations: stage2_locations,
                stage3_locations: [],
                docking_stations_available: false
            };

            // Remove spinner
            spinner.remove();

            console.log('Alert data loaded from map:', alertData);

        } catch (error) {
            console.error('Error fetching multi-stage data:', error);
            const spinner = document.getElementById('alert-loading');
            if (spinner) spinner.remove();
        }
    }

    /**
     * Create Alert Center HTML
     */
    function createAlertCenterHTML() {
        return `
            ${createHeader()}
            ${createRoadmap()}
            ${createContentArea()}
        `;
    }

    /**
     * Header
     */
    function createHeader() {
        return `
            <div style="padding: 12px 20px; border-bottom: 1px solid #333; display:flex; justify-content:space-between; align-items:center; background: rgba(255,107,53,0.1);">
                <div style="display:flex; align-items:center; gap:10px;">
                    
                    <div>
                        <h2 style="margin:0; font-size:16px; color:#ff6b35;">FIRE ALERT</h2>
                        <span style="font-size:11px; color:#aaa; font-family:monospace;">Multi-Stage Verification</span>
                    </div>
                </div>
                <button id="alert-close-btn" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>
            </div>
        `;
    }

    /**
     * Roadmap with Stage Counts
     */
    function createRoadmap() {
        const stage1Color = alertData.stage1_count > 0 ? '#FF8C00' : '#555';
        const stage2Color = alertData.stage2_count > 0 ? '#4169E1' : '#555';
        const stage3Color = alertData.stage3_count > 0 ? '#DC143C' : '#555';

        return `
            <div style="padding: 20px 30px; display:flex; justify-content:space-around; align-items:flex-start; position:relative;">
                
                <!-- Progress Line -->
                <div style="position:absolute; top:50px; left:20%; right:20%; height:2px; background:#333; z-index:0;">
                    <div style="position:absolute; top:0; left:0; height:100%; background:${stage1Color}; width:${alertData.stage1_count > 0 ? (alertData.stage2_count > 0 ? '100%' : '50%') : '0%'}; transition:width 1s;"></div>
                </div>

                <!-- Stage 1: Satellite -->
                <div id="stage-1-card" style="z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; width:150px; cursor:pointer; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="width:45px; height:45px; border-radius:50%; background:#1a1a1a; border:2px solid ${stage1Color}; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px ${stage1Color};">
                        <span class="material-icons-round" style="font-size:24px; color:${stage1Color};">satellite_alt</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:12px; color:#ddd;">Stage 1</div>
                        <div style="font-size:10px; color:#888;">Satellite</div>
                        <div style="font-size:20px; font-weight:bold; color:${stage1Color}; margin-top:4px;">${alertData.stage1_count}</div>
                        <div style="font-size:9px; color:#666;">Confirmed</div>
                    </div>
                </div>

                <!-- Stage 2: Atmospheric -->
                <div id="stage-2-card" style="z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; width:150px; cursor:pointer; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="width:45px; height:45px; border-radius:50%; background:#1a1a1a; border:2px solid ${stage2Color}; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px ${stage2Color};">
                        <span class="material-icons-round" style="font-size:24px; color:${stage2Color};">air</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:12px; color:#ddd;">Stage 2</div>
                        <div style="font-size:10px; color:#888;">Atmospheric</div>
                        <div style="font-size:20px; font-weight:bold; color:${stage2Color}; margin-top:4px;">${alertData.stage2_count}</div>
                        <div style="font-size:9px; color:#666;">Confirmed</div>
                    </div>
                </div>

                <!-- Stage 3: Drone -->
                <div id="stage-3-card" style="z-index:1; display:flex; flex-direction:column; align-items:center; gap:6px; width:150px; cursor:${alertData.docking_stations_available ? 'pointer' : 'not-allowed'}; transition:transform 0.3s; opacity:${alertData.docking_stations_available ? '1' : '0.5'};" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <div style="width:45px; height:45px; border-radius:50%; background:#1a1a1a; border:2px solid ${stage3Color}; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px ${stage3Color};">
                        <span class="material-icons-round" style="font-size:24px; color:${stage3Color};">flight_takeoff</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:12px; color:#ddd;">Stage 3</div>
                        <div style="font-size:10px; color:#888;">Drone</div>
                        ${alertData.docking_stations_available ? `
                            <div style="font-size:20px; font-weight:bold; color:${stage3Color}; margin-top:4px;">${alertData.stage3_count}</div>
                            <div style="font-size:9px; color:#666;">Confirmed</div>
                        ` : `
                            <div style="font-size:9px; color:#ff6b35; margin-top:6px; padding:4px 8px; background:rgba(255,107,53,0.1); border-radius:3px; border:1px solid #ff6b35;">No Stations</div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Content Area
     */
    function createContentArea() {
        return `
            <div id="alert-content-area" style="flex:1; padding:20px 25px; overflow-y:auto;">
                <div id="content-display" style="color:#aaa; text-align:center; padding:40px;">
                    <span class="material-icons-round" style="font-size:64px; color:#555;">touch_app</span>
                    <p style="margin-top:20px; font-size:16px;">Click on a stage above to view confirmed locations</p>
                </div>
            </div>
        `;
    }

    /**
     * Bind Stage Click Events
     */
    function bindStageClickEvents() {
        document.getElementById('stage-1-card').addEventListener('click', () => showStageDetails(1));
        document.getElementById('stage-2-card').addEventListener('click', () => showStageDetails(2));
        if (alertData.docking_stations_available) {
            document.getElementById('stage-3-card').addEventListener('click', () => showStageDetails(3));
        }
    }

    /**
     * Show Stage Details
     */
    async function showStageDetails(stage) {
        currentView = `stage${stage}`;
        const contentArea = document.getElementById('content-display');

        if (stage === 1) {
            contentArea.innerHTML = await createStage1View();
        } else if (stage === 2) {
            contentArea.innerHTML = await createStage2View();
        } else if (stage === 3) {
            contentArea.innerHTML = createStage3View();
        }

        // Bind location click events
        bindLocationEvents(stage);
    }

    /**
     * Create Stage 1 View (Satellite Confirmations)
     */
    async function createStage1View(loadMore = false) {
        if (alertData.stage1_locations.length === 0) {
            return `
                <div style="text-align:center; padding:40px; color:#888;">
                    <span class="material-icons-round" style="font-size:48px;">info</span>
                    <p style="margin-top:15px;">No Stage 1 confirmations found</p>
                </div>
            `;
        }

        // Pagination State
        if (!loadMore) {
            window.stage1_visible_count = 5;
        } else {
            window.stage1_visible_count = (window.stage1_visible_count || 5) + 5;
        }

        const visibleItems = alertData.stage1_locations.slice(0, window.stage1_visible_count);
        const hasMore = alertData.stage1_locations.length > window.stage1_visible_count;

        let html = `
            <h3 style="margin-top:0; color:#FF8C00; border-bottom:2px solid #FF8C00; padding-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span class="material-icons-round" style="vertical-align:middle;">satellite_alt</span>
                    Stage 1 Confirmed Locations 
                    <span style="font-size:12px; color:#888; font-weight:normal; margin-left:5px;">(${alertData.stage1_locations.length} total)</span>
                </div>
            </h3>
            <div id="stage1-list" style="display:grid; gap:10px; margin-top:15px;">
        `;

        for (const location of visibleItems) {
            const locationName = await getLocationName(location.latitude, location.longitude);

            html += `
                <div class="location-card" data-stage="1" style="background:#151515; border:2px solid #FF8C00; border-radius:8px; padding:15px; cursor:pointer; transition:all 0.3s;" onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='#151515'">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div style="flex:1;">
                            <div style="font-size:16px; font-weight:bold; color:#FF8C00; margin-bottom:5px;">${locationName}</div>
                            <div style="font-size:12px; color:#888; font-family:monospace;">
                                ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°
                            </div>
                            <div style="margin-top:10px; font-size:13px; color:#aaa;">
                                <strong>Confidence:</strong> ${location.confidence.toFixed(1)}%<br>
                                <strong>Hotspots:</strong> ${location.hotspot_count || 1} detections
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <button class="info-btn" data-location='${JSON.stringify(location)}' style="padding:8px 12px; background:#333; border:1px solid #555; border-radius:4px; color:#fff; cursor:pointer; font-size:12px; white-space:nowrap; display:flex; align-items:center; gap:5px;">
                                <span class="material-icons-round" style="font-size:14px;">info</span> Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `</div>`;

        if (hasMore) {
            html += `
                <div style="text-align:center; margin-top:20px;">
                    <button id="load-more-btn" style="padding:8px 20px; background:#222; border:1px solid #444; color:#ddd; border-radius:20px; cursor:pointer; font-size:12px;">
                        Load More (${alertData.stage1_locations.length - window.stage1_visible_count} remaining)
                    </button>
                </div>
            `;
        }

        return html;
    }

    // Hook for load more
    document.addEventListener('click', async (e) => {
        if (e.target.id === 'load-more-btn') {
            const contentArea = document.getElementById('content-display');
            contentArea.innerHTML = await createStage1View(true);
            // Re-bind not needed as we use event delegation or global listeners, 
            // but if we used specific bindings we would need to re-bind.
            // The Info button listener is global (see below).
        }
    });

    /**
     * Show Hotspot Info Window (Details + Stats On Demand)
     */
    async function showHotspotInfo(location) {
        // Show loading overlay
        const loadingModal = document.createElement('div');
        loadingModal.id = 'info-loading';
        loadingModal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 10003; color: #FF8C00; font-size: 20px; font-weight: bold;
            display: flex; align-items: center; gap: 10px; text-shadow: 0 2px 4px black;
         `;
        loadingModal.innerHTML = `<span class="material-icons-round" style="animation:spin 1s infinite;">refresh</span> Loading Info...`;
        document.body.appendChild(loadingModal);

        const locationName = await getLocationName(location.latitude, location.longitude);

        if (document.getElementById('info-loading')) document.getElementById('info-loading').remove();

        const infoModal = document.createElement('div');
        infoModal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 800px; height: 600px; background: #0a0a0a; border: 2px solid #FF8C00;
            border-radius: 12px; z-index: 10002; padding: 0; color: #fff;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 0 50px rgba(0,0,0,0.8);
            font-family: 'Segoe UI', sans-serif;
         `;

        // Format Source
        let sourceName = location.source || 'Satellite';
        if (sourceName.includes('MODIS')) sourceName = 'MODIS (Terra/Aqua)';
        if (sourceName.includes('SNPP')) sourceName = 'VIIRS SNPP';
        if (sourceName.includes('NOAA20') || sourceName.includes('NOAA-20')) sourceName = 'VIIRS NOAA-20';

        // Format Intensity (Brightness)
        let intensity = 'N/A';
        const bright = location.brightness || location.avg_brightness || location.brightness_2;
        if (bright) intensity = parseFloat(bright).toFixed(1) + ' K';

        infoModal.innerHTML = `
            <div style="padding:15px 20px; background:#111; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
                <div>
                     <h2 style="margin:0; font-size:18px; color:#FF8C00;">${locationName}</h2>
                     <div style="font-family:monospace; color:#888; font-size:12px;">${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}</div>
                </div>
                <button id="close-info-btn" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            <div style="flex:1; padding:20px; overflow-y:auto;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
                    <div style="background:#151515; padding:15px; border-radius:8px;">
                        <h4 style="margin:0 0 10px 0; color:#888; border-bottom:1px solid #333; padding-bottom:5px;">Details (Stage 1)</h4>
                        <div style="margin-bottom:8px;"><strong>Intensity:</strong> ${intensity}</div>
                        <div style="margin-bottom:8px;"><strong>Confidence:</strong> ${location.confidence ? location.confidence.toFixed(1) : 0}%</div>
                        <div style="margin-bottom:8px;"><strong>Source:</strong> ${sourceName}</div>
                        <div><strong>Date:</strong> ${location.acq_date || 'Today'}</div>
                    </div>
                    <div style="background:#151515; padding:15px; border-radius:8px; display:flex; flex-direction:column; justify-content:center; gap:10px;">
                        <button id="view-path-btn" style="padding:10px; background:#4169E1; border:none; border-radius:6px; color:#fff; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:5px;">
                            <span class="material-icons-round">map</span> View Path on Map
                        </button>
                        <button id="view-stats-btn" style="padding:10px; background:#222; border:1px solid #444; border-radius:6px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
                            <span class="material-icons-round">bar_chart</span> View 5-Day Stats
                        </button>
                    </div>
                </div>
                
                <div id="stats-container" style="display:none; height:300px; background:#151515; border-radius:8px; padding:10px;">
                    <canvas id="stats-chart"></canvas>
                </div>
            </div>
         `;

        document.body.appendChild(infoModal);

        // Events
        document.getElementById('close-info-btn').onclick = () => infoModal.remove();

        document.getElementById('view-path-btn').onclick = () => {
            infoModal.remove();
            closeAlertCenter();
            flyToLocation(location.latitude, location.longitude);
        };

        document.getElementById('view-stats-btn').onclick = async function () {
            const btn = this;
            const originalContent = btn.innerHTML;
            btn.innerHTML = `<span class="material-icons-round" style="animation:spin 1s infinite; font-size:16px;">refresh</span> Loading Stats...`;
            btn.disabled = true;

            // Call API for deep analysis
            try {
                const response = await fetch(`/api/analyze-hotspot?lat=${location.latitude}&lon=${location.longitude}`);
                if (response.ok) {
                    const result = await response.json();
                    const stats = result.stage1_result?.daily_stats || [];

                    document.getElementById('stats-container').style.display = 'block';
                    const ctx = document.getElementById('stats-chart').getContext('2d');

                    // Sort by date
                    stats.sort((a, b) => new Date(a.date) - new Date(b.date));

                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: stats.map(s => s.date),
                            datasets: [{
                                label: 'Confidence %',
                                data: stats.map(s => s.avg_confidence),
                                borderColor: '#FF8C00',
                                backgroundColor: 'rgba(255,140,0,0.2)',
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { labels: { color: '#fff' } } },
                            scales: {
                                y: { min: 0, max: 100, grid: { color: '#333' }, ticks: { color: '#fff' } },
                                x: { grid: { color: '#333' }, ticks: { color: '#fff' } }
                            }
                        }
                    });

                    btn.innerHTML = `<span class="material-icons-round">check_circle</span> Stats Loaded`;
                    btn.style.background = '#FF8C00';
                    btn.style.borderColor = '#FF8C00';
                } else {
                    const err = await response.json();
                    console.error(err);
                    btn.innerHTML = 'Stats Failed';
                    setTimeout(() => { btn.innerHTML = originalContent; btn.disabled = false; }, 2000);
                }
            } catch (e) {
                console.error(e);
                btn.innerHTML = 'Error';
                setTimeout(() => { btn.innerHTML = originalContent; btn.disabled = false; }, 2000);
            }
        };
    }

    // Add click handler for Info button
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.info-btn');
        if (btn) {
            e.stopPropagation();
            const location = JSON.parse(btn.dataset.location);
            showHotspotInfo(location);
        }
    });

    /**
     * Create Stage 2 View (Atmospheric Confirmations)
     */
    async function createStage2View() {
        if (alertData.stage2_locations.length === 0) {
            return `
                <div style="text-align:center; padding:40px; color:#888;">
                    <span class="material-icons-round" style="font-size:48px;">info</span>
                    <p style="margin-top:15px;">No Stage 2 confirmations found</p>
                </div>
            `;
        }

        let html = `
            <h3 style="margin-top:0; color:#4169E1; border-bottom:2px solid #4169E1; padding-bottom:10px;">
                <span class="material-icons-round" style="vertical-align:middle;">air</span>
                Stage 2 Confirmed Locations (${alertData.stage2_locations.length})
            </h3>
            <div style="display:grid; gap:15px; margin-top:20px;">
        `;

        for (const location of alertData.stage2_locations) {
            const locationName = await getLocationName(location.latitude, location.longitude);

            html += `
                <div class="location-card" data-stage="2" data-lat="${location.latitude}" data-lon="${location.longitude}" style="background:#151515; border:2px solid #4169E1; border-radius:8px; padding:15px; cursor:pointer; transition:all 0.3s;" onmouseover="this.style.background='#1a1a1a'" onmouseout="this.style.background='#151515'">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div style="flex:1;">
                            <div style="font-size:16px; font-weight:bold; color:#4169E1; margin-bottom:5px;">${locationName}</div>
                            <div style="font-size:12px; color:#888; font-family:monospace;">
                                ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°
                            </div>
                            <div style="margin-top:10px; font-size:13px; color:#aaa;">
                                <strong>Confidence:</strong> ${location.confidence.toFixed(1)}%<br>
                                <strong>Atmospheric Spikes:</strong> ${location.spike_indicators} indicators<br>
                                <strong>Status:</strong> Verified
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <button class="view-stats-btn" data-lat="${location.latitude}" data-lon="${location.longitude}" style="padding:8px 12px; background:#4169E1; border:none; border-radius:4px; color:#fff; cursor:pointer; font-size:12px; white-space:nowrap;">
                                <span class="material-icons-round" style="font-size:14px; vertical-align:middle;">analytics</span> View Stats
                            </button>
                            <button class="view-graph-btn" data-location='${JSON.stringify(location)}' style="padding:8px 12px; background:#FF8C00; border:none; border-radius:4px; color:#fff; cursor:pointer; font-size:12px; white-space:nowrap;">
                                <span class="material-icons-round" style="font-size:14px; vertical-align:middle;">show_chart</span> View Graph
                            </button>
                            <button class="goto-location-btn" data-lat="${location.latitude}" data-lon="${location.longitude}" style="padding:8px 12px; background:#10b981; border:none; border-radius:4px; color:#fff; cursor:pointer; font-size:12px; white-space:nowrap;">
                                <span class="material-icons-round" style="font-size:14px; vertical-align:middle;">place</span> Go To
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Create Stage 3 View
     */
    function createStage3View() {
        return `
            <div style="text-align:center; padding:40px; color:#888;">
                <span class="material-icons-round" style="font-size:48px; color:#DC143C;">flight_takeoff</span>
                <p style="margin-top:15px; font-size:16px;">Stage 3: Drone Confirmation</p>
                <p style="color:#666;">No docking stations available in satellite telemetry mode</p>
            </div>
        `;
    }

    /**
     * Bind Location Events (View Graph, Go To, View Stats)
     */
    function bindLocationEvents(stage) {
        // View Graph buttons
        document.querySelectorAll('.view-graph-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const location = JSON.parse(btn.dataset.location);
                showTrendGraph(location, stage);
            });
        });

        // Go To buttons
        document.querySelectorAll('.goto-location-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lat = parseFloat(btn.dataset.lat);
                const lon = parseFloat(btn.dataset.lon);
                flyToLocation(lat, lon);
            });
        });

        // View Stats buttons (Stage 2 only)
        document.querySelectorAll('.view-stats-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lat = parseFloat(btn.dataset.lat);
                const lon = parseFloat(btn.dataset.lon);
                if (window.showWeatherStats) {
                    closeAlertCenter();
                    window.showWeatherStats(lat, lon);
                }
            });
        });
    }

    /**
     * Show 5-day Trend Graph
     */
    function showTrendGraph(location, stage) {
        const graphModal = document.createElement('div');
        graphModal.id = 'trend-graph-modal';
        graphModal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 600px; height: 450px; background: #0a0a0a; border: 2px solid ${stage === 1 ? '#FF8C00' : '#4169E1'};
            border-radius: 12px; z-index: 10001; padding: 20px; color: #fff;
        `;

        graphModal.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="margin:0; color:${stage === 1 ? '#FF8C00' : '#4169E1'};">5-Day Trend Analysis</h3>
                <button id="close-graph-btn" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            <canvas id="trend-chart" style="width:100%; height:350px;"></canvas>
        `;

        document.body.appendChild(graphModal);

        document.getElementById('close-graph-btn').addEventListener('click', () => graphModal.remove());

        // Draw chart
        const ctx = document.getElementById('trend-chart').getContext('2d');

        if (stage === 1) {
            // Confidence trend chart
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: location.daily_stats.map((d, i) => `Day ${i + 1}`),
                    datasets: [{
                        label: 'Confidence (%)',
                        data: location.daily_stats.map(d => d.avg_confidence),
                        borderColor: '#FF8C00',
                        backgroundColor: 'rgba(255, 140, 0, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#fff' } } },
                    scales: {
                        y: { min: 0, max: 100, grid: { color: '#333' }, ticks: { color: '#fff' } },
                        x: { grid: { color: '#333' }, ticks: { color: '#fff' } }
                    }
                }
            });
        } else if (stage === 2) {
            // Multi-variable chart for Stage 2
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: location.daily_stats.map((d, i) => `Day ${i + 1}`),
                    datasets: [
                        {
                            label: 'Confidence (%)',
                            data: location.daily_stats.map(d => d.avg_confidence),
                            borderColor: '#4169E1',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Brightness (K)',
                            data: location.daily_stats.map(d => d.avg_brightness),
                            borderColor: '#FF8C00',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#fff' } } },
                    scales: {
                        y: { position: 'left', grid: { color: '#333' }, ticks: { color: '#fff' } },
                        y1: { position: 'right', grid: { display: false }, ticks: { color: '#fff' } },
                        x: { grid: { color: '#333' }, ticks: { color: '#fff' } }
                    }
                }
            });
        }
    }

    /**
     * Get Location Name from OpenWeather API
     */
    async function getLocationName(lat, lon) {
        try {
            const response = await fetch(`/api/location-name?lat=${lat}&lon=${lon}`);
            if (response.ok) {
                const data = await response.json();
                return data.name;
            }
        } catch (error) {
            console.error('Error fetching location name:', error);
        }
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    /**
     * Fly to Location on Map
     */
    function flyToLocation(lat, lon) {
        if (window.map) {
            closeAlertCenter();
            window.map.flyTo({
                center: [lon, lat],
                zoom: 12,
                pitch: 0,
                bearing: 0,
                duration: 2000
            });

            // Add marker
            if (window.addConfirmedFireMarker) {
                window.addConfirmedFireMarker(lon, lat);
            }
        }
    }

    /**
     * Close Alert Center
     */
    function closeAlertCenter() {
        const modal = document.getElementById('alert-center-modal');
        if (modal) modal.remove();
    }

    // Make functions globally available
    window.closeAlertCenter = closeAlertCenter;
    window.flyToLocation = flyToLocation;
})();
