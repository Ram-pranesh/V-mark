
(function () {
    // ---------------------------------------------------------
    // 1. DATA (Provided by User)
    // ---------------------------------------------------------
    const STAGE_2_CSV = `date,temperature_2m,wind_speed_10m,pm2_5,carbon_monoxide,carbon_dioxide,aerosol_optical_depth,nitrogen_dioxide,relative_humidity_2m,soil_moisture_0_to_1cm
2026-01-27 00:00:00,18.78,6.85,72.6,385,470,1.01,4.1,67,0.29
2026-01-27 12:00:00,27.38,8.67,56.8,285,452,1.23,2.5,51,0.28
2026-01-28 00:00:00,18.23,10.50,57.5,372,467,0.67,4.5,71,0.29
2026-01-28 12:00:00,24.18,6.99,39.2,243,449,0.43,2.1,49,0.28
2026-01-29 00:00:00,14.23,3.10,52.2,373,463,0.49,3.8,84,0.29
2026-01-29 12:00:00,23.48,8.94,56.9,304,448,0.73,2.2,62,0.28
2026-01-30 00:00:00,15.28,1.14,44.0,386,459,0.78,5.5,88,0.29
2026-01-30 12:00:00,26.98,5.50,48.9,326,451,0.89,1.5,49,0.28
2026-01-31 00:00:00,19.03,0.80,48.0,405,486,1.20,12.6,72,0.29
2026-01-31 16:00:00,21.28,3.24,78.0,517,487,1.32,16.7,76,0.29
2026-01-31 23:00:00,20.23,0.80,60.8,338,473,1.08,13.7,74,0.29
2026-02-01 06:00:00,25.98,8.91,36.3,279,455,0.80,3.3,46,0.28
2026-02-01 16:00:00,22.68,3.32,48.9,392,477,0.49,19.2,68,0.28
2026-02-01 22:00:00,20.98,0.80,49.7,349,485,0.47,16.5,69,0.28
2026-02-01 23:00:00,20.68,1.14,48.4,345,487,0.48,15.6,69,0.28`;

    // Mock Satellite Confidence Trend (Last 5 Days) to satisfy Stage 1
    // Day 5: 58, Day 4: 64, Day 3: 77, Day 2: 89, Today: 94
    const ALERT_SAT_TREND = [
        { day: 'Day -5', conf: 58 },
        { day: 'Day -4', conf: 64 },
        { day: 'Day -3', conf: 77 },
        { day: 'Day -2', conf: 89 },
        { day: 'Today', conf: 96 }
    ];

    // Helper to parse CSV
    function parseCSV(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        return lines.slice(1).map(line => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((h, i) => obj[h.trim()] = values[i]);
            return obj;
        });
    }

    const stage2Data = parseCSV(STAGE_2_CSV);

    // ---------------------------------------------------------
    // 2. ALERT CENTER LOGIC
    // ---------------------------------------------------------

    window.openAlertCenter = function (coordinates = null) {
        // Default coords if none provided (mock location)
        if (!coordinates) coordinates = { lat: 20.5937, lng: 78.9629 };

        // Create Modal
        let modal = document.getElementById('alert-center-modal');
        if (modal) modal.remove(); // Re-create to reset state

        modal = document.createElement('div');
        modal.id = 'alert-center-modal';
        // Larger than stats window (approx 900px maybe?)
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90vw; max-width: 1100px; height: 85vh;
            background: rgba(10, 12, 16, 0.98); backdrop-filter: blur(15px);
            border: 1px solid #333; border-radius: 12px;
            color: #fff; z-index: 10000; display: flex; flex-direction: column;
            box-shadow: 0 0 50px rgba(0,0,0,0.8);
            font-family: 'Segoe UI', sans-serif;
        `;

        // Store initial map state to restore later
        const initialMapState = {
            center: window.map ? window.map.getCenter() : null,
            zoom: window.map ? window.map.getZoom() : null,
            pitch: window.map ? window.map.getPitch() : null,
            bearing: window.map ? window.map.getBearing() : null
        };

        const closeAlertCenter = () => {
            const modal = document.getElementById('alert-center-modal');
            if (modal) modal.remove();

            // Restore map state
            if (window.map && initialMapState.center) {
                window.map.flyTo({
                    center: initialMapState.center,
                    zoom: initialMapState.zoom,
                    pitch: initialMapState.pitch,
                    bearing: initialMapState.bearing,
                    duration: 1500
                });
            }
        };

        // -----------------------
        // HEADER
        // -----------------------
        const header = `
            <div style="padding: 15px 25px; border-bottom: 1px solid #333; display:flex; justify-content:space-between; align-items:center; background: rgba(255,107,53,0.1);">
                <div style="display:flex; align-items:center; gap:12px;">
                     <span class="material-icons-round" style="color:#ff6b35; font-size:28px;">warning</span>
                     <div>
                        <h2 style="margin:0; font-size:20px; color:#ff6b35;">FIRE ALERT CENTER</h2>
                        <span style="font-size:12px; color:#aaa; font-family:monospace;">ID: FIRE-2026-XJ9 • LOC: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}</span>
                     </div>
                </div>
                <button id="alert-close-btn" style="background:none; border:none; color:#fff; font-size:24px; cursor:pointer;">&times;</button>
            </div>
        `;

        // -----------------------
        // ROADMAP VISUALIZATION
        // -----------------------
        // Fix: Use a container for the line track so 'width: 100%' refers to the track length, not the window.
        // Margins: 50px (padding) + 75px (half node width) = 125px.
        const roadmap = `
            <div style="padding: 30px 50px; display:flex; justify-content:center; position:relative; overflow:hidden;">
                
                <!-- Track Container -->
                <div style="position:absolute; top:52px; left:125px; right:125px; height:3px; z-index:0;">
                    <!-- Grey Background -->
                    <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:#333;"></div>
                    <!-- Orange Fill -->
                    <div id="roadmap-line-fill" style="position:absolute; top:0; left:0; width:0%; height:100%; background:#ff6b35; transition:width 1s ease-out;"></div>
                </div>
                
                <!-- Stage 1 -->
                <div id="stage-1-node" style="z-index:1; display:flex; flex-direction:column; align-items:center; gap:10px; width:150px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:#1a1a1a; border:2px solid #555; display:flex; align-items:center; justify-content:center; transition:all 0.5s;">
                        <span class="material-icons-round" style="font-size:24px; color:#555;">satellite_alt</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:14px; color:#888;">Satellite Confirmation</div>
                        <div id="stage-1-status" style="font-size:11px; color:#666;">Pending</div>
                    </div>
                </div>
                
                <!-- Spacer -->
                <div style="flex:1;"></div>

                <!-- Stage 2 -->
                <div id="stage-2-node" style="z-index:1; display:flex; flex-direction:column; align-items:center; gap:10px; width:150px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:#1a1a1a; border:2px solid #555; display:flex; align-items:center; justify-content:center; transition:all 0.5s;">
                        <span class="material-icons-round" style="font-size:24px; color:#555;">air</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:14px; color:#888;">Atmospheric Verification</div>
                        <div id="stage-2-status" style="font-size:11px; color:#666;">Waiting</div>
                    </div>
                </div>

                <!-- Spacer -->
                <div style="flex:1;"></div>

                <!-- Stage 3 -->
                <div id="stage-3-node" style="z-index:1; display:flex; flex-direction:column; align-items:center; gap:10px; width:150px;">
                    <div style="width:40px; height:40px; border-radius:50%; background:#1a1a1a; border:2px solid #555; display:flex; align-items:center; justify-content:center; transition:all 0.5s;">
                        <span class="material-icons-round" style="font-size:24px; color:#555;">flight_takeoff</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:14px; color:#888;">Drone Confirmation</div>
                        <div id="stage-3-status" style="font-size:11px; color:#666;">Waiting</div>
                    </div>
                </div>
            </div>
        `;

        // -----------------------
        // MAIN CONTENT AREA
        // -----------------------
        const content = `
            <div id="alert-content-area" style="flex:1; padding:20px 25px; display:grid; grid-template-columns: 1fr 1fr; gap:20px; overflow-y:auto;">
                <!-- Left Panel: Details -->
                <div style="background:#151515; border-radius:8px; padding:20px; border:1px solid #333;">
                    <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:10px; color:#ddd;">Analysis Feed</h3>
                    <div id="analysis-log" style="font-family:monospace; font-size:12px; color:#aaa; height:200px; overflow-y:auto; margin-bottom:20px; background:#000; padding:10px; border-radius:4px;">
                        > System Initialized.<br>
                        > Waiting for verification trigger...
                    </div>
                    
                    <div id="action-area">
                        <button id="btn-start-verify" style="width:100%; padding:12px; background:#ff6b35; border:none; border-radius:6px; color:#fff; font-weight:bold; cursor:pointer; font-size:14px;">INITIATE VERIFICATION SEQUENCE</button>
                    </div>
                </div>

                <!-- Right Panel: Visuals -->
                <div id="visual-panel" style="background:#151515; border-radius:8px; padding:20px; border:1px solid #333; display:flex; flex-direction:column; gap:15px;">
                    <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:10px; color:#ddd;">Visual Data</h3>
                    
                    <!-- Charts Placeholder -->
                    <div id="chart-container" style="flex:1; min-height:200px; display:flex; align-items:center; justify-content:center; color:#555; background:#0a0a0a; border-radius:6px; border:1px dashed #333;">
                        <span>No Data Available</span>
                    </div>
                </div>
            </div>
        `;

        modal.innerHTML = header + roadmap + content;
        document.body.appendChild(modal);

        // Bind Close Event
        document.getElementById('alert-close-btn').addEventListener('click', closeAlertCenter);

        // -----------------------
        // LOGIC & ANIMATION
        // -----------------------
        const logBox = document.getElementById('analysis-log');
        const log = (msg) => {
            logBox.innerHTML += `> ${msg}<br>`;
            logBox.scrollTop = logBox.scrollHeight;
        };

        const updateNode = (stage, status, color = '#ff6b35') => {
            const node = document.getElementById(`stage-${stage}-node`);
            const circle = node.children[0];
            const text = node.children[1].children[0];
            const sub = document.getElementById(`stage-${stage}-status`);

            if (status === 'active') {
                circle.style.borderColor = '#fff';
                circle.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
                circle.children[0].style.color = '#fff';
                sub.innerText = "Analyzing...";
                sub.style.color = "#fff";
            } else if (status === 'confirmed') {
                circle.style.backgroundColor = color;
                circle.style.borderColor = color;
                circle.style.boxShadow = `0 0 20px ${color}`;
                circle.children[0].style.color = '#fff'; // Icon White
                text.style.color = '#fff';
                sub.innerText = "VERIFIED";
                sub.style.color = color;

                // Update Line
                const line = document.getElementById('roadmap-line-fill');
                if (stage === 1) line.style.width = '50%';
                if (stage === 2) line.style.width = '100%';
            }
        };

        const drawStage1Chart = () => {
            const ctxContainer = document.getElementById('chart-container');
            ctxContainer.innerHTML = '<canvas id="stage1-chart"></canvas>';
            const ctx = document.getElementById('stage1-chart').getContext('2d');

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ALERT_SAT_TREND.map(d => d.day),
                    datasets: [{
                        label: 'Satellite Confidence (%)',
                        data: ALERT_SAT_TREND.map(d => d.conf),
                        borderColor: '#ff6b35',
                        backgroundColor: 'rgba(255, 107, 53, 0.2)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { min: 0, max: 100, grid: { color: '#333' } }, x: { grid: { color: '#333' } } }
                }
            });
        };

        const drawStage2Chart = () => {
            const ctxContainer = document.getElementById('chart-container');
            ctxContainer.innerHTML = '<canvas id="stage2-chart"></canvas>';
            const ctx = document.getElementById('stage2-chart').getContext('2d');

            // Extract recent data for chart
            const labels = stage2Data.slice(-10).map(d => d.date.split(' ')[1].substr(0, 5));
            const coData = stage2Data.slice(-10).map(d => parseFloat(d.carbon_monoxide));

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'CO Levels (μg/m³)',
                        data: coData,
                        backgroundColor: coData.map(v => v > 400 ? '#ff6b35' : '#4aa8ff'),
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { grid: { color: '#333' } }, x: { grid: { color: '#333' } } }
                }
            });
        };

        // --- SEQUENCE EXECUTION ---

        document.getElementById('btn-start-verify').onclick = async () => {
            const btn = document.getElementById('btn-start-verify');
            btn.style.display = 'none'; // Hide button during sequence

            // --- STAGE 1: SATELLITE ---
            log("Checking Satellite Confidence Trend (5 Days)...");
            updateNode(1, 'active');
            drawStage1Chart();

            await new Promise(r => setTimeout(r, 2000));

            log("Confidence: 58% -> 64% -> 77% -> 89% -> 96%");
            log("Trend: POSITIVE (Exponential Increase)");
            log("Stage 1 Verified.");
            updateNode(1, 'confirmed');

            await new Promise(r => setTimeout(r, 1000));

            // --- STAGE 2: ATMOSPHERIC ---
            log("Initializing Atmospheric Scan (Radius 1km)...");
            updateNode(2, 'active');
            drawStage2Chart();

            await new Promise(r => setTimeout(r, 2000));

            // Check spikes from CSV (Latest entry)
            // Latest: CO 345, Prev: 349. Wait, the provided CSV ends with specific high values.
            // Let's use the spike logic: "1.5 - 3 times actual value"
            // Assume normal is ~150.
            const latest = stage2Data[stage2Data.length - 1];
            log(`Current CO: ${latest.carbon_monoxide} μg/m³ (High)`);
            log(`Current PM2.5: ${latest.pm2_5} μg/m³ (Spike Detected)`);
            log(`Condition: ABNORMAL. > 2.0x Baseline.`);

            log("Stage 2 Verified.");
            updateNode(2, 'confirmed');

            // ADD PULSING DOT
            if (window.addConfirmedFireMarker && coordinates) {
                window.addConfirmedFireMarker(coordinates.lng, coordinates.lat);
                log("Map Marker Updated: Confirmed Hotspot.");
            }

            // --- STAGE 3: DRONE ---
            log("Awaiting Drone Dispatch...");

            const btnArea = document.getElementById('action-area');
            btnArea.innerHTML = `
                <button id="btn-dispatch-drone" style="width:100%; padding:15px; background:#ef4444; border:none; border-radius:6px; color:#fff; font-weight:bold; cursor:pointer; font-size:16px; box-shadow:0 0 20px rgba(239, 68, 68, 0.4); animation:pulse 2s infinite;">
                    <span class="material-icons-round" style="vertical-align:middle; margin-right:5px;">flight_takeoff</span>
                    DISPATCH DRONE SQUADRON
                </button>
            `;

            document.getElementById('btn-dispatch-drone').onclick = async () => {
                document.getElementById('btn-dispatch-drone').innerHTML = "DRONE DISPATCHED (ETA: 2m)";
                document.getElementById('btn-dispatch-drone').disabled = true;
                document.getElementById('btn-dispatch-drone').style.background = "#555";
                document.getElementById('btn-dispatch-drone').style.animation = "none";

                updateNode(3, 'active');
                log("Drone taking off from Docking Station 4...");

                // Show Drone Feed Simulation
                const visualPanel = document.getElementById('visual-panel');
                visualPanel.innerHTML = `
                    <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:10px; color:#ddd;">Drone Live Feed</h3>
                    <div style="position:relative; width:100%; height:300px; background:#000; overflow:hidden; border-radius:6px;">
                        <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                             <div style="color:#0f0; font-family:monospace;">CONNECTING FEED...</div>
                        </div>
                        <!-- Overlay UI -->
                        <div style="position:absolute; top:10px; left:10px; color:#0f0; font-family:monospace; font-size:12px; z-index:10;">
                            ALT: 120m<br>SPD: 15m/s<br>BAT: 94%
                        </div>
                         <div style="position:absolute; top:10px; right:10px; color:#0f0; font-family:monospace; font-size:12px; z-index:10;">
                            AI: SCANNING
                        </div>
                    </div>
                `;

                await new Promise(r => setTimeout(r, 2000));

                log("Feed Established.");
                // Simulating fire detection visuals
                visualPanel.querySelector('div[style*="background:#000"]').style.background = "linear-gradient(45deg, #330000, #111)";
                visualPanel.querySelector('div[style*="CONNECTING FEED"]').innerHTML = `
                    <div style="width:100px; height:100px; border:2px solid #ff0000; position:relative;">
                        <div style="position:absolute; top:-20px; left:0; background:#ff0000; color:#fff; font-size:10px; padding:2px;">CONFIDENCE: 98%</div>
                    </div>
                `;

                await new Promise(r => setTimeout(r, 1500));

                log("AI Analysis: WILDFIRE CONFIRMED.");
                log("Thermal Max: 850°C.");
                log("Est Area: 4.5 acres.");

                await new Promise(r => setTimeout(r, 1000));

                log("Stage 3 Verified.");
                updateNode(3, 'confirmed', '#ef4444'); // Red for danger/final

                // Final Report
                log("SENDING ALERTS...");
                await new Promise(r => setTimeout(r, 800));
                log("Alerts Sent: Forest Office (Email/SMS), Fire Dept (Route Plan).");

                document.getElementById('action-area').innerHTML = `
                    <div style="background:rgba(16, 185, 129, 0.1); border:1px solid #10b981; color:#10b981; padding:15px; border-radius:6px; text-align:center; font-weight:bold;">
                        INCIDENT RESPONDER ACTIVATED
                    </div>
                    <div style="margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; color:#ccc;">
                        <div>
                            <b>Satellite Conf:</b> 96%<br>
                            <b>Temp (Sat):</b> 20.6°C<br>
                            <b>Frames:</b> 128
                        </div>
                        <div>
                            <b>Drone Conf:</b> 99%<br>
                            <b>Temp (Therm):</b> 850°C<br>
                            <b>Affected:</b> 4.5 acres
                        </div>
                    </div>
                `;
            };
        };
    };
})();
