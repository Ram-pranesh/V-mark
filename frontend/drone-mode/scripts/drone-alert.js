/**
 * DRONE-SPECIFIC MULTI-STAGE FIRE DETECTION ALERT CENTER (DUMMY DATA)
 * Implements Stage 1 (Satellite), Stage 2 (Atmospheric), Stage 3 (Drone) verification
 */

(function () {
    console.log('Drone-alert.js loaded successfully');

    let alertData = {
        stage1_count: 3,
        stage2_count: 2,
        stage3_count: 1,
        stage1_locations: [
            { id: 'S-701', latitude: 11.55, longitude: 77.08, confidence: 94.5, brightness: 348.2, source: 'VIIRS NOAA-20', date: '02 02 2026', hotspots: 12, city: 'Satyamangalam' },
            { id: 'S-702', latitude: 20.22, longitude: 79.30, confidence: 91.2, brightness: 335.6, source: 'MODIS (Terra/Aqua)', date: '02 02 2026', hotspots: 8, city: 'Tadoba' },
            { id: 'S-703', latitude: 22.30, longitude: 80.65, confidence: 88.7, brightness: 342.1, source: 'VIIRS SNPP', date: '01 02 2026', hotspots: 15, city: 'Kanha' }
        ],
        stage2_locations: [
            { id: 'A-201', latitude: 11.55, longitude: 77.08, confidence: 96.0, city: 'Satyamangalam', co: '2450 ppb', pm25: '185 µg/m³', temp: '42.5°C', humidity: '18%', wind: '12 km/h' },
            { id: 'A-202', latitude: 22.30, longitude: 80.65, confidence: 92.5, city: 'Kanha', co: '1980 ppb', pm25: '142 µg/m³', temp: '39.8°C', humidity: '22%', wind: '15 km/h' }
        ],
        stage3_locations: [
            { id: 'D-101', latitude: 11.55, longitude: 77.08, confidence: 98.4, city: 'Satyamangalam', drone_id: 'TN-SAT-HR-01', vision_conf: 98.4, thermal_conf: 97.2, status: 'Active' }
        ]
    };

    let currentView = 'stage1'; // Default view

    window.openDroneAlertCenter = function () {
        console.log('Drone Alert Center opened!');

        // Create modal
        let modal = document.getElementById('drone-alert-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'drone-alert-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 850px; height: 650px; background: rgba(10, 12, 16, 0.98); 
            backdrop-filter: blur(20px); border: 1px solid #444; border-radius: 16px;
            color: #fff; z-index: 10000; display: flex; flex-direction: column;
            box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(255, 107, 53, 0.2);
            font-family: 'Inter', sans-serif; overflow: hidden;
        `;

        modal.innerHTML = `
            <!-- Left Navigation Bar -->
            <div style="display:flex; height:100%;">
                <div style="width:240px; background:rgba(20, 24, 30, 0.8); border-right:1px solid #333; padding:25px 0; display:flex; flex-direction:column;">
                    <div style="padding:0 25px 25px 25px;">
                        <div style="display:flex; align-items:center; gap:10px; color:#ff6b35;">
                            <span class="material-icons-round">radar</span>
                            <span style="font-weight:700; font-size:1.1rem; letter-spacing:1px;">ALERT CENTER</span>
                        </div>
                        <div style="font-size:0.75rem; color:#666; margin-top:5px;">Drone Telemetry Verification</div>
                    </div>

                    <div id="drone-stage-tabs" style="flex:1;">
                        <div class="drone-tab active" data-view="stage1" style="padding:15px 25px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:all 0.3s;">
                            <span class="material-icons-round" style="color:#aaa;">satellite_alt</span>
                            <div style="flex:1;">
                                <div style="font-size:0.9rem; font-weight:600;">SATELLITE</div>
                                <div style="font-size:0.7rem; color:#888;">Stage 1 Confirmation</div>
                            </div>
                            <span style="background:#FFA500; color:#fff; font-size:0.7rem; padding:2px 6px; border-radius:10px;">${alertData.stage1_count}</span>
                        </div>
                        <div class="drone-tab" data-view="stage2" style="padding:15px 25px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:all 0.3s;">
                            <span class="material-icons-round" style="color:#aaa;">air</span>
                            <div style="flex:1;">
                                <div style="font-size:0.9rem; font-weight:600;">ATMOSPHERIC</div>
                                <div style="font-size:0.7rem; color:#888;">Stage 2 Analysis</div>
                            </div>
                            <span style="background:#555; color:#fff; font-size:0.7rem; padding:2px 6px; border-radius:10px;">${alertData.stage2_count}</span>
                        </div>
                        <div class="drone-tab" data-view="stage3" style="padding:15px 25px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:all 0.3s;">
                            <span class="material-icons-round" style="color:#aaa;">camera_indoor</span>
                            <div style="flex:1;">
                                <div style="font-size:0.9rem; font-weight:600;">DRONE VISION</div>
                                <div style="font-size:0.7rem; color:#888;">Stage 3 Reality Check</div>
                            </div>
                            <span style="background:#555; color:#fff; font-size:0.7rem; padding:2px 6px; border-radius:10px;">${alertData.stage3_count}</span>
                        </div>
                    </div>

                    <div style="padding:0 25px;">
                        <button id="drone-alert-close" style="width:100%; padding:10px; background:#111; border:1px solid #333; color:#888; border-radius:8px; cursor:pointer; font-size:0.8rem; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <span class="material-icons-round" style="font-size:1.1rem;">close</span> Close Center
                        </button>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div id="drone-content-display" style="flex:1; padding:30px; overflow-y:auto; background:radial-gradient(circle at top right, rgba(255, 255, 255, 0.05), transparent);">
                    <!-- View loaded dynamically -->
                </div>
            </div>

            <style>
                .drone-tab:hover { background: rgba(255, 255, 255, 0.05); }
                .drone-tab.active[data-view="stage1"] { background: rgba(255, 165, 0, 0.1); border-left: 3px solid #FFA500; }
                .drone-tab.active[data-view="stage2"] { background: rgba(66, 133, 244, 0.1); border-left: 3px solid #4285F4; }
                .drone-tab.active[data-view="stage3"] { background: rgba(255, 68, 68, 0.1); border-left: 3px solid #ff4444; }
                
                .drone-tab.active[data-view="stage1"] .material-icons-round { color: #FFA500 !important; }
                .drone-tab.active[data-view="stage2"] .material-icons-round { color: #4285F4 !important; }
                .drone-tab.active[data-view="stage3"] .material-icons-round { color: #ff4444 !important; }
                
                .drone-tab.active div div:first-child { color: #fff; }
                
                .drone-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    cursor: pointer;
                }
                .drone-card:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: #FFA500;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .drone-card.stage2:hover { border-color: #4285F4; }
                .drone-card.stage3:hover { border-color: #ff4444; }

                .badge-stat {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    color: #aaa;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
            </style>
        `;

        document.body.appendChild(modal);

        // Bind Events
        document.getElementById('drone-alert-close').onclick = () => modal.remove();

        const tabs = document.querySelectorAll('.drone-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => { t.classList.remove('active'); t.querySelector('span:last-child').style.background = '#555'; });
                tab.classList.add('active');
                tab.querySelector('span:last-child').style.background = '#ff6b35';
                loadView(tab.dataset.view);
            };
        });

        // Load default view
        loadView(currentView);
    };

    function loadView(view) {
        currentView = view;
        const display = document.getElementById('drone-content-display');
        display.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%;"><div style="animation:spin 1s infinite; width:30px; height:30px; border:2px solid #333; border-top-color:#ff6b35; border-radius:50%;"></div></div>';

        setTimeout(() => {
            if (view === 'stage1') display.innerHTML = renderStage1();
            else if (view === 'stage2') display.innerHTML = renderStage2();
            else if (view === 'stage3') display.innerHTML = renderStage3();
        }, 300);
    }

    function renderStage1() {
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <h2 style="margin:0; font-size:1.4rem; font-weight:700;">Satellite Confirmations</h2>
                <div style="font-size:0.8rem; color:#888;">Data Source: FIRMS Global</div>
            </div>
        `;

        alertData.stage1_locations.forEach((loc, idx) => {
            // Assign dummy classifications for demo
            let classification = "STAGE 1 CONFIRMED";
            let classColor = "#FFA500"; // Orange
            let confColor = "#FFA500";

            if (idx === 1) {
                classification = "MEDIUM RISK";
                classColor = "#ffff00"; // Yellow
                confColor = "#ffff00";
            } else if (idx === 2) {
                classification = "LOW RISK";
                classColor = "#00C851"; // Green
                confColor = "#00C851";
            }

            html += `
                <div class="drone-card stage1" onclick="window.DroneUI.flyToLocation(${loc.latitude}, ${loc.longitude}); document.getElementById('drone-alert-modal').remove();">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <div style="font-size:1.1rem; font-weight:700; color:#fff;">${loc.city} Division</div>
                            <div style="font-size:0.8rem; color:#888; font-family:monospace; margin-top:2px;">${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}</div>
                            
                            <div style="display:flex; gap:10px; margin-top:15px;">
                                <div class="badge-stat" style="border-color:${confColor}33;">Confidence: <span style="color:${confColor};">${loc.confidence}%</span></div>
                                <div class="badge-stat">Intensity: <span style="color:#aaa;">${loc.brightness}K</span></div>
                                <div class="badge-stat">Points: <span style="color:#aaa;">${loc.hotspots}</span></div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.75rem; color:${classColor}; font-weight:bold; letter-spacing:1px; margin-bottom:5px;">${classification}</div>
                            <div style="font-size:0.7rem; color:#555;">${loc.date}</div>
                        </div>
                    </div>
                </div>
            `;
        });
        return html;
    }

    function renderStage2() {
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <h2 style="margin:0; font-size:1.4rem; font-weight:700;">Atmospheric Verification</h2>
                <div style="font-size:0.8rem; color:#888;">Detected Gas Spikes & Thermal Shifts</div>
            </div>
        `;

        alertData.stage2_locations.forEach(loc => {
            html += `
                <div class="drone-card stage2" onclick="window.DroneUI.flyToLocation(${loc.latitude}, ${loc.longitude}); document.getElementById('drone-alert-modal').remove();">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                        <div>
                            <div style="font-size:1.1rem; font-weight:700; color:#fff;">${loc.city} - Critical Match</div>
                            <div style="font-size:0.8rem; color:#888;">Confirmed anomaly in 1km radius</div>
                        </div>
                        <div class="badge-stat" style="background:rgba(66, 133, 244, 0.1); border-color:#4285F4; color:#4285F4; font-weight:bold;">STAGE 2 PASS</div>
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:15px;">
                        <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border:1px solid rgba(255, 255, 255, 0.05);">
                            <div style="font-size:0.7rem; color:#666; letter-spacing:0.5px; text-transform:uppercase;">Carbon Monoxide</div>
                            <div style="font-size:1.1rem; color:#fff; font-weight:700; margin:4px 0;">${loc.co}</div>
                            <div style="font-size:0.65rem; color:#4285F4;">↑ 324% spike</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border:1px solid rgba(255, 255, 255, 0.05);">
                            <div style="font-size:0.7rem; color:#666; letter-spacing:0.5px; text-transform:uppercase;">PM2.5 Density</div>
                            <div style="font-size:1.1rem; color:#fff; font-weight:700; margin:4px 0;">${loc.pm25}</div>
                            <div style="font-size:0.65rem; color:#4285F4;">↑ 410% spike</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.2); padding:12px; border-radius:8px; border:1px solid rgba(255, 255, 255, 0.05);">
                            <div style="font-size:0.7rem; color:#666; letter-spacing:0.5px; text-transform:uppercase;">Temperature</div>
                            <div style="font-size:1.1rem; color:#fff; font-weight:700; margin:4px 0;">${loc.temp}</div>
                            <div style="font-size:0.65rem; color:#4285F4;">Analyzed anomaly</div>
                        </div>
                    </div>
                    
                    <div style="margin-top:20px; padding:15px; background:rgba(0,0,0,0.3); border-radius:10px; border:1px solid rgba(255,255,255,0.03);">
                        <div style="font-size:0.75rem; color:#888; margin-bottom:12px;">5-Day Atmospheric Trend Analysis</div>
                        <div style="height:40px; display:flex; align-items:flex-end; gap:4px;">
                            <div style="flex:1; height:20%; background:#333; border-radius:2px;"></div>
                            <div style="flex:1; height:25%; background:#333; border-radius:2px;"></div>
                            <div style="flex:1; height:40%; background:#444; border-radius:2px;"></div>
                            <div style="flex:1; height:65%; background:#555; border-radius:2px;"></div>
                            <div style="flex:1; height:100%; background:#4285F4; border-radius:2px;"></div>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:#444; margin-top:5px;">
                            <span>28 Jan</span>
                            <span>29 Jan</span>
                            <span>30 Jan</span>
                            <span>31 Jan</span>
                            <span style="color:#4285F4;">01 Feb (CONFIRMED)</span>
                        </div>
                    </div>
                </div>
            `;
        });
        return html;
    }

    function renderStage3() {
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <h2 style="margin:0; font-size:1.4rem; font-weight:700;">Drone Physical Verification</h2>
                <div style="font-size:0.8rem; color:#888;">Real-time AI Visual Analysis</div>
            </div>
        `;

        alertData.stage3_locations.forEach(loc => {
            html += `
                <div class="drone-card stage3" style="border:1px solid #ff4444; background:rgba(255, 68, 68, 0.04);">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px;">
                        <div>
                            <div style="font-size:1.2rem; font-weight:800; color:#fff;">FIRE CONFIRMED: ${loc.city}</div>
                            <div style="font-size:0.85rem; color:#888;">Verified by Drone ${loc.drone_id}</div>
                        </div>
                        <div style="padding:5px 15px; background:#ff4444; color:#fff; border-radius:10px; font-weight:800; box-shadow:0 0 15px rgba(255,68,68,0.3);">${loc.vision_conf}% MATCH</div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; height:220px; margin-bottom:20px;">
                        <div style="position:relative; border-radius:12px; overflow:hidden; border:1px solid #444;">
                            <img src="../assets/drone_visual.jpg" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; bottom:10px; left:10px; background:rgba(0,0,0,0.7); padding:4px 8px; border-radius:4px; font-size:0.65rem;">VISUAL SPECTRUM</div>
                        </div>
                        <div style="position:relative; border-radius:12px; overflow:hidden; border:1px solid #444;">
                            <img src="../assets/drone_thermal.jpg" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; bottom:10px; left:10px; background:rgba(255,0,0,0.7); padding:4px 8px; border-radius:4px; font-size:0.65rem;">THERMAL SCAN (850°C)</div>
                        </div>
                    </div>

                    <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:10px; border:1px solid #333;">
                        <div style="font-size:0.8rem; color:#aaa; font-weight:600; text-transform:uppercase; margin-bottom:10px; color:#ff4444;">AI Vision Breakdown</div>
                        <div style="display:flex; gap:30px;">
                            <div>
                                <div style="font-size:0.7rem; color:#666;">SMOKE COLOR</div>
                                <div style="font-size:0.9rem; color:#fff; font-weight:600;">Dark Gray</div>
                            </div>
                            <div>
                                <div style="font-size:0.7rem; color:#666;">FLAME AREA</div>
                                <div style="font-size:0.9rem; color:#fff; font-weight:600;">120m²</div>
                            </div>
                            <div>
                                <div style="font-size:0.7rem; color:#666;">AI CONFIDENCE</div>
                                <div style="font-size:0.9rem; color:#fff; font-weight:600; color:#ff4444;">${loc.vision_conf}%</div>
                            </div>
                        </div>
                    </div>

                    <button onclick="window.DroneUI.flyToLocation(${loc.latitude}, ${loc.longitude}); document.getElementById('drone-alert-modal').remove();" style="width:100%; margin-top:20px; padding:15px; background:#ff4444; border:none; color:#fff; font-weight:800; border-radius:10px; cursor:pointer; font-size:1rem; transition:all 0.2s; box-shadow:0 4px 15px rgba(255,68,68,0.2);" onmouseover="this.style.background='#ff5555'; this.style.transform='scale(1.01)';" onmouseout="this.style.background='#ff4444'; this.style.transform='scale(1)';">
                        FLY TO ACTIVE FIRE SITE
                    </button>
                </div>
            `;
        });
        return html;
    }

    // Export to global for index.html access
    window.openDroneAlertCenter = window.openDroneAlertCenter;

})();
