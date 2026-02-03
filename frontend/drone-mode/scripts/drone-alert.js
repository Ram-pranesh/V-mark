/**
 * DRONE-SPECIFIC MULTI-STAGE FIRE DETECTION ALERT CENTER
 * Implements Stage 1 (Satellite), Stage 2 (Atmospheric), Stage 3 (Drone) verification
 * Matches Satellite Telemetry Roadmap Design
 */

(function () {
    console.log('Drone-alert.js loaded successfully');

    // Muted Color Palette
    const COLORS = {
        ORANGE: '#D97706', // Muted Orange
        BLUE: '#3B82F6',   // Muted Blue
        RED: '#B91C1C',    // Muted Red
        GREEN: '#059669',  // Muted Green
        TEXT_DARK: '#1a1a1a',
        TEXT_GRAY: '#666',
        BG_WHITE: '#ffffff',
        BG_LIGHT: '#f5f7fa',
        BORDER: '#e1e4e8'
    };

    // Shared Alert Data - Exported for Map to use
    window.DroneAlertData = {
        stage1_count: 5,
        stage2_count: 3,
        stage3_count: 1,
        stage1_locations: [
            { id: 'S-701', latitude: 11.55, longitude: 77.08, confidence: 94.5, brightness: 348.2, city: 'Satyamangalam' },
            { id: 'S-702', latitude: 20.22, longitude: 79.30, confidence: 91.2, brightness: 335.6, city: 'Tadoba' },
            { id: 'S-703', latitude: 22.30, longitude: 80.65, confidence: 88.7, brightness: 342.1, city: 'Kanha' }
        ],
        stage2_locations: [
            { id: 'A-201', latitude: 11.60, longitude: 77.15, confidence: 96.0, city: 'Satyamangalam (Zone B)', co: '2450 ppb', pm25: '185 µg/m³', temp: '42.5°C' },
            { id: 'A-202', latitude: 22.35, longitude: 80.70, confidence: 92.5, city: 'Kanha (Zone C)', co: '1980 ppb', pm25: '142 µg/m³', temp: '39.8°C' }
        ],
        stage3_locations: [
            { id: 'D-101', latitude: 11.52, longitude: 77.05, confidence: 98.4, city: 'Satyamangalam Core', drone_id: 'TN-SAT-HR-01', vision_conf: 98.4, thermal_conf: 97.2, status: 'Active' }
        ]
    };

    const alertData = window.DroneAlertData;

    const DRONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M259-80q-75 0-127-53T80-261q0-75 52-127t127-52q22 0 42.5 5t38.5 14q14-29 15-60t-11-60q-19 10-40 15t-44 5q-75 0-127.5-52.5T80-701q0-75 52.5-127T260-880q75 0 127.5 52T440-701q0 23-5.5 44T419-617q29 12 60 11.5t60-14.5q-9-18-14-38.5t-5-42.5q0-75 52-127t127-52q75 0 128 52t53 127q0 75-53 128t-128 53q-24 0-45.5-6T612-543q-13 30-12 61.5t15 62.5q19-10 40-15.5t44-5.5q75 0 128 52t53 127q0 75-53 128T699-80q-75 0-127-53t-52-128q0-23 5.5-44t15.5-40q-31-14-62.5-15.5T417-349q11 20 17 42t6 46q0 75-53 128T259-80Zm440-520q42 0 71.5-29.5T800-701q0-42-29.5-70.5T699-800q-42 0-70.5 28.5T600-701q0 8 1.5 16.5T605-668l60-60q12-12 28-12t28 12q12 12 12 28t-12 28l-62 63q9 5 19 7t21 2Zm-439-1q10 0 19-2t17-5l-64-64q-12-12-12-28t12-28q12-12 28-12t28 12l65 64q3-8 5-17.5t2-19.5q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm439 441q42 0 71.5-29.5T800-261q0-42-29.5-70.5T699-360q-10 0-19 1.5t-17 4.5l66 66q12 12 12 28t-12 28q-13 12-29 12t-28-12l-65-65q-3 8-5 17t-2 19q0 42 28.5 71.5T699-160Zm-440 0q42 0 71.5-29.5T360-261q0-11-2-21.5t-7-19.5l-70 70q-12 12-28.5 12T224-232q-12-12-12-28t12-28l67-67q-8-2-16-3.5t-16-1.5q-42 0-70.5 28.5T160-261q0 42 28.5 71.5T259-160Zm221-280q17 0 28.5-11.5T520-480q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480q0 17 11.5 28.5T480-440Z"/></svg>`;

    window.openDroneAlertCenter = function () {
        let modal = document.getElementById('drone-alert-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'drone-alert-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 850px; max-height: 750px;
            background: ${COLORS.BG_WHITE}; border: 1px solid ${COLORS.BORDER}; border-radius: 12px;
            color: ${COLORS.TEXT_DARK}; z-index: 10000; display: flex; flex-direction: column;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1); font-family: 'Segoe UI', Inter, sans-serif; overflow: hidden;
        `;

        modal.innerHTML = `
            ${createHeader()}
            ${createRoadmap()}
            ${createContentArea()}
        `;
        document.body.appendChild(modal);

        document.getElementById('alert-close-btn').addEventListener('click', () => modal.remove());
        bindStageClickEvents();
    };

    function createHeader() {
        return `
            <div style="padding: 15px 25px; border-bottom: 1px solid ${COLORS.BORDER}; display:flex; justify-content:space-between; align-items:center; background: ${COLORS.BG_LIGHT};">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span class="material-icons-round" style="color:${COLORS.ORANGE}; font-size:28px;">radar</span>
                    <div>
                        <h2 style="margin:0; font-size:18px; color:${COLORS.TEXT_DARK}; font-weight:700; letter-spacing:-0.2px;">Verification Center</h2>
                        <span style="font-size:11px; color:${COLORS.TEXT_GRAY}; text-transform:uppercase; letter-spacing:0.5px;">Satellite • Atmospheric • Drone</span>
                    </div>
                </div>
                <button id="alert-close-btn" style="background:none; border:none; color:${COLORS.TEXT_GRAY}; font-size:28px; cursor:pointer; padding:0; line-height:1;">&times;</button>
            </div>
        `;
    }

    function createRoadmap() {
        return `
            <div style="padding: 30px; display:flex; justify-content:space-around; align-items:flex-start; background: ${COLORS.BG_WHITE}; border-bottom: 1px solid ${COLORS.BORDER};">
                <div id="stage-1-card" class="stage-roadmap-card" style="display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:0.3s; width:150px;">
                    <div class="stage-icon-circle" style="width:50px; height:50px; border-radius:50%; background:${COLORS.BG_LIGHT}; border:2px solid ${COLORS.ORANGE}; display:flex; align-items:center; justify-content:center; color:${COLORS.ORANGE};">
                        <span class="material-icons-round" style="font-size:26px;">satellite_alt</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:12px; color:${COLORS.TEXT_GRAY}; text-transform:uppercase;">Stage 1</div>
                        <div style="font-size:14px; font-weight:700; color:${COLORS.TEXT_DARK};">Satellite</div>
                        <div style="font-size:22px; font-weight:bold; color:${COLORS.ORANGE}; margin-top:4px;">${alertData.stage1_count}</div>
                    </div>
                </div>
                <div id="stage-2-card" class="stage-roadmap-card" style="display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:0.3s; width:150px;">
                    <div class="stage-icon-circle" style="width:50px; height:50px; border-radius:50%; background:${COLORS.BG_LIGHT}; border:2px solid ${COLORS.BLUE}; display:flex; align-items:center; justify-content:center; color:${COLORS.BLUE};">
                        <span class="material-icons-round" style="font-size:26px;">air</span>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:12px; color:${COLORS.TEXT_GRAY}; text-transform:uppercase;">Stage 2</div>
                        <div style="font-size:14px; font-weight:700; color:${COLORS.TEXT_DARK};">Atmospheric</div>
                        <div style="font-size:22px; font-weight:bold; color:${COLORS.BLUE}; margin-top:4px;">${alertData.stage2_count}</div>
                    </div>
                </div>
                <div id="stage-3-card" class="stage-roadmap-card" style="display:flex; flex-direction:column; align-items:center; gap:10px; cursor:pointer; transition:0.3s; width:150px;">
                    <div class="stage-icon-circle" style="width:50px; height:50px; border-radius:50%; background:${COLORS.BG_LIGHT}; border:2px solid ${COLORS.RED}; display:flex; align-items:center; justify-content:center; color:${COLORS.RED};">
                        ${DRONE_SVG}
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:700; font-size:12px; color:${COLORS.TEXT_GRAY}; text-transform:uppercase;">Stage 3</div>
                        <div style="font-size:14px; font-weight:700; color:${COLORS.TEXT_DARK};">Drone Vision</div>
                        <div style="font-size:22px; font-weight:bold; color:${COLORS.RED}; margin-top:4px;">${alertData.stage3_count}</div>
                    </div>
                </div>
            </div>
            <style>
                .stage-roadmap-card:hover { transform: translateY(-5px); }
                .stage-roadmap-card:hover .stage-icon-circle { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .pointing-hand { animation: bouncePoint 1s infinite alternate; }
                @keyframes bouncePoint { from { transform: translateY(0); } to { transform: translateY(-10px); } }
            </style>
        `;
    }

    function createContentArea() {
        return `
            <div id="drone-alert-content-area" style="flex:1; padding:20px 30px; overflow-y:auto; background: #fafafa;">
                <div id="drone-content-display" style="color:${COLORS.TEXT_GRAY}; text-align:center; padding:80px 20px; display:flex; flex-direction:column; align-items:center;">
                    <span class="material-icons-round pointing-hand" style="font-size:64px; color:#ddd;">touch_app</span>
                    <p style="margin-top:20px; font-size:18px; font-weight:600; color:${COLORS.TEXT_DARK};">Select a verification stage above to inspect details</p>
                </div>
            </div>
        `;
    }

    function bindStageClickEvents() {
        document.getElementById('stage-1-card').addEventListener('click', () => showStageDetails(1));
        document.getElementById('stage-2-card').addEventListener('click', () => showStageDetails(2));
        document.getElementById('stage-3-card').addEventListener('click', () => showStageDetails(3));
    }

    function showStageDetails(stage) {
        currentView = `stage${stage}`;
        const container = document.getElementById('drone-alert-content-area');
        if (stage === 1) container.innerHTML = renderStageList(1);
        else if (stage === 2) container.innerHTML = renderStageList(2);
        else if (stage === 3) container.innerHTML = renderStage3();
    }

    function renderStageList(stage) {
        const list = stage === 1 ? alertData.stage1_locations : alertData.stage2_locations;
        const color = stage === 1 ? COLORS.ORANGE : COLORS.BLUE;
        let html = `<div style="display:grid; gap:12px;">`;
        list.forEach((loc) => {
            html += `
                <div style="background:#fff; border:1px solid ${COLORS.BORDER}; border-left:5px solid ${color}; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center; transition:0.2s;">
                    <div style="display:flex; align-items:center; gap:25px; flex:1;">
                        <div style="font-size:16px; font-weight:700; color:${COLORS.TEXT_DARK}; min-width:160px;">${loc.city}</div>
                        <div style="font-size:14px; color:${color}; font-weight:600;">Confidence: ${loc.confidence}%</div>
                        ${stage === 1 ? `<div style="font-size:14px; color:${COLORS.TEXT_GRAY}; font-weight:600;">Intensity: ${loc.brightness}K</div>` : ''}
                    </div>
                    <button onclick="window.DroneAlert.openDetailsWindow('${loc.id}', ${loc.latitude}, ${loc.longitude}, '${loc.city}', ${stage})" 
                            style="padding:10px 20px; background:${color}11; border:1px solid ${color}; color:${color}; border-radius:6px; font-size:12px; cursor:pointer; font-weight:700; transition:0.2s;">
                        VIEW STATS
                    </button>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    }

    function renderStage3() {
        let html = `<div style="display:grid; gap:20px;">`;
        alertData.stage3_locations.forEach(loc => {
            html += `
                <div style="background:#fff; border:1px solid ${COLORS.BORDER}; border-radius:12px; padding:25px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px;">
                        <div>
                            <div style="font-size:18px; font-weight:800; color:${COLORS.TEXT_DARK};">STAGE 3: ${loc.city.toUpperCase()} CONFIRMED</div>
                            <div style="font-size:13px; color:${COLORS.TEXT_GRAY}; margin-top:4px;">Drone Verification ID: ${loc.drone_id}</div>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:25px;">
                        <div style="position:relative; border-radius:8px; overflow:hidden; border:1px solid ${COLORS.BORDER}; aspect-ratio:16/9;">
                            <img src="../assets/img/drone_thermal.jpg" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:10px; padding:4px 8px; border-radius:4px; font-weight:700;">THERMAL MATCH • 850°C</div>
                        </div>
                        <div style="position:relative; border-radius:8px; overflow:hidden; border:1px solid ${COLORS.BORDER}; aspect-ratio:16/9;">
                            <img src="../assets/img/drone_visual.jpg" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:10px; padding:4px 8px; border-radius:4px; font-weight:700;">OPTICAL MATCH • FLAME DETECTED</div>
                        </div>
                    </div>

                    <div style="display:flex; gap:12px;">
                        <button onclick="window.DroneAlert.openReportGenerationModal('${loc.city}', '${loc.drone_id}')"
                                style="flex:2; padding:14px; background:${COLORS.TEXT_DARK}; border:none; color:#fff; font-weight:700; border-radius:8px; cursor:pointer; font-size:14px; transition:0.3s; display:flex; align-items:center; justify-content:center; gap:8px;">
                            <span class="material-icons-round">description</span> GENERATE COMPREHENSIVE REPORT
                        </button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    }

    window.DroneAlert = {
        openReportGenerationModal: function (city, droneId) {
            let modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 20000;
                display: flex; align-items: center; justify-content: center;
                animation: fadeIn 0.3s ease;
            `;

            modal.innerHTML = `
                <div style="background:#fff; width:500px; border-radius:12px; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.3); transform:translateY(0); animation:slideUp 0.3s ease;">
                    <div style="padding:20px; border-bottom:1px solid ${COLORS.BORDER}; display:flex; justify-content:space-between; align-items:center; background:${COLORS.BG_LIGHT};">
                        <div style="font-weight:700; color:${COLORS.TEXT_DARK};">MISSION REPORTS: ${city.toUpperCase()}</div>
                        <button onclick="this.closest('div').parentElement.parentElement.remove()" style="border:none; background:none; font-size:24px; cursor:pointer; color:#666;">&times;</button>
                    </div>
                    <div style="padding:25px;">
                        <div style="margin-bottom:20px; padding:15px; background:${COLORS.BG_LIGHT}; border-radius:8px; font-size:13px; color:#555; border:1px solid ${COLORS.BORDER};">
                            <strong style="color:${COLORS.TEXT_DARK}; display:block; margin-bottom:5px;">System Generated Analysis</strong>
                            Comprehensive data package ready for download. Includes satellite telemetry, atmospheric sensor logs, and drone visual verification data.
                        </div>

                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid ${COLORS.BORDER}; border-radius:8px; transition:0.2s; cursor:pointer; hover:bg-gray-50;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:36px; height:36px; background:${COLORS.ORANGE}22; color:${COLORS.ORANGE}; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                                        <span class="material-icons-round">satellite_alt</span>
                                    </div>
                                    <div>
                                        <div style="font-weight:700; font-size:13px; color:${COLORS.TEXT_DARK};">Stage 1: Satellite Telemetry</div>
                                        <div style="font-size:11px; color:#888;">PDF • 2.4 MB • Generated 04:30 AM</div>
                                    </div>
                                </div>
                                <span class="material-icons-round" style="color:${COLORS.TEXT_GRAY};">download</span>
                            </div>

                            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid ${COLORS.BORDER}; border-radius:8px; transition:0.2s; cursor:pointer; hover:bg-gray-50;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:36px; height:36px; background:${COLORS.BLUE}22; color:${COLORS.BLUE}; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                                        <span class="material-icons-round">air</span>
                                    </div>
                                    <div>
                                        <div style="font-weight:700; font-size:13px; color:${COLORS.TEXT_DARK};">Stage 2: Atmospheric Profile</div>
                                        <div style="font-size:11px; color:#888;">CSV/PDF • 4.1 MB • Generated 04:45 AM</div>
                                    </div>
                                </div>
                                <span class="material-icons-round" style="color:${COLORS.TEXT_GRAY};">download</span>
                            </div>

                            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; border:1px solid ${COLORS.BORDER}; border-radius:8px; transition:0.2s; cursor:pointer; hover:bg-gray-50;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div style="width:36px; height:36px; background:${COLORS.RED}22; color:${COLORS.RED}; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                                        <span class="material-icons-round">radar</span>
                                    </div>
                                    <div>
                                        <div style="font-weight:700; font-size:13px; color:${COLORS.TEXT_DARK};">Stage 3: Drone Verification</div>
                                        <div style="font-size:11px; color:#888;">MP4/PDF • 128 MB • Generated Just Now</div>
                                    </div>
                                </div>
                                <span class="material-icons-round" style="color:${COLORS.TEXT_GRAY};">download</span>
                            </div>
                        </div>

                         <button style="margin-top:20px; width:100%; padding:14px; background:${COLORS.GREEN}; border:none; color:#fff; font-weight:700; border-radius:8px; cursor:pointer; font-size:13px; box-shadow:0 8px 20px ${COLORS.GREEN}33;">
                            DOWNLOAD ALL FILES (ZIP)
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        openInfoModal: function (id, lat, lng, city) {
            this.openDetailsWindow(id, lat, lng, city, 1);
        },

        openSpecialStats: function (id, lat, lng, city, currentStage = 3) {
            let win = document.getElementById('drone-special-window');
            if (win) win.remove();

            const stage1Color = currentStage >= 1 ? COLORS.TEXT_DARK : '#ddd';
            const stage2Color = currentStage >= 2 ? COLORS.TEXT_DARK : '#ddd';
            const stage3Color = currentStage >= 3 ? COLORS.TEXT_DARK : '#ddd';
            const progressWidth = currentStage === 1 ? '10%' : (currentStage === 2 ? '50%' : '100%');

            win = document.createElement('div');
            win.id = 'drone-special-window';
            win.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 700px; background: #fff; border: 1px solid ${COLORS.BORDER}; border-radius: 12px;
                color: ${COLORS.TEXT_DARK}; z-index: 10005; display: flex; flex-direction: column;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2); font-family: 'Segoe UI', Inter, sans-serif; maxHeight: 90vh; overflow-y: auto;
            `;

            win.innerHTML = `
                <div style="padding: 15px 25px; border-bottom: 1px solid ${COLORS.BORDER}; display:flex; justify-content:space-between; align-items:center; background: ${COLORS.BG_LIGHT};">
                    <div style="font-weight:800; font-size:15px; color:${COLORS.TEXT_DARK}; letter-spacing:0.5px;">VERIFICATION ANALYSIS: ${city.toUpperCase()}</div>
                    <button onclick="document.getElementById('drone-special-window').remove()" style="background:none; border:none; color:${COLORS.TEXT_GRAY}; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding: 25px; background: #fff;">
                    <!-- Verification Roadmap -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; position:relative; padding: 0 40px;">
                        <div style="position:absolute; top:20px; left:60px; right:60px; height:4px; background:#f0f0f0; z-index:1;">
                            <div style="width:${progressWidth}; height:100%; background:${COLORS.TEXT_DARK}; transition: 0.5s;"></div>
                        </div>
                        
                        <div style="z-index:2; display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:${stage1Color}; color:#fff; display:flex; align-items:center; justify-content:center; transition: 0.3s;">
                                <span class="material-icons-round" style="font-size:20px;">satellite_alt</span>
                            </div>
                            <span style="font-size:9px; font-weight:800; color:${stage1Color};">SATELLITE</span>
                        </div>
                        
                        <div style="z-index:2; display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:${stage2Color}; color:#fff; display:flex; align-items:center; justify-content:center; transition: 0.3s;">
                                <span class="material-icons-round" style="font-size:20px;">air</span>
                            </div>
                            <span style="font-size:9px; font-weight:800; color:${stage2Color};">ATMOSPHERE</span>
                        </div>
                        
                        <div style="z-index:2; display:flex; flex-direction:column; align-items:center; gap:8px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:${stage3Color}; color:#fff; display:flex; align-items:center; justify-content:center; transition: 0.3s;">
                                <span class="material-icons-round" style="font-size:18px;">radar</span>
                            </div>
                            <span style="font-size:9px; font-weight:800; color:${stage3Color};">DRONE</span>
                        </div>
                    </div>

                    <div style="background:${COLORS.BG_LIGHT}; border-radius:8px; padding:15px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; border:1px solid ${COLORS.BORDER};">
                        <div>
                            <div style="font-size:10px; color:${COLORS.TEXT_GRAY}; font-weight:700;">CONFIDENCE</div>
                            <div style="font-size:18px; font-weight:800; color:${COLORS.RED};">98.4%</div>
                        </div>
                        <div>
                            <div style="font-size:10px; color:${COLORS.TEXT_GRAY}; font-weight:700;">MAX TEMP</div>
                            <div style="font-size:18px; font-weight:800; color:${COLORS.TEXT_DARK};">850°C</div>
                        </div>
                        <div>
                            <div style="font-size:10px; color:${COLORS.TEXT_GRAY}; font-weight:700;">AREA</div>
                            <div style="font-size:18px; font-weight:800; color:${COLORS.TEXT_DARK};">150 m²</div>
                        </div>
                    </div>

                    <!-- DRONE PATH VISUALIZATION -->
                    <div style="margin-bottom:25px; border:1px solid ${COLORS.BORDER}; border-radius:8px; overflow:hidden;">
                        <div style="background:${COLORS.BG_LIGHT}; padding:8px 15px; border-bottom:1px solid ${COLORS.BORDER}; font-size:11px; font-weight:700; color:${COLORS.TEXT_GRAY};">
                            FLIGHT PATH TRAJECTORY ANALYSIS
                        </div>
                        <div style="position:relative; height:200px; background:#111;">
                             <img src="../assets/img/drone_visual.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.6;">
                             <!-- Overlay SVG Path Simulation -->
                             <svg style="position:absolute; top:0; left:0; width:100%; height:100%;" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path d="M 10 90 Q 25 10 50 50 T 90 20" stroke="${COLORS.ORANGE}" stroke-width="2" fill="none" stroke-dasharray="5,5" />
                                <circle cx="10" cy="90" r="1.5" fill="#fff" />
                                <circle cx="90" cy="20" r="1.5" fill="${COLORS.RED}" />
                                <text x="92" y="20" fill="white" font-size="4" font-family="Arial" font-weight="bold">TARGET</text>
                             </svg>
                        </div>
                        <div style="padding:10px; font-size:11px; color:${COLORS.TEXT_GRAY}; background:#fff;">
                            Path calculated via Autonomy Engine v2.4. Trajectory optimized for thermal verification.
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <h4 style="margin:0 0 10px 0; font-size:12px; color:${COLORS.TEXT_GRAY}; text-transform:uppercase;">Historical Growth (5-Day Trend)</h4>
                        <div style="height:180px; position:relative;">
                            <canvas id="special-chart-${id}"></canvas>
                        </div>
                    </div>

                    <button onclick="window.DroneMap.animateInspection(${lat}, ${lng}); document.getElementById('drone-special-window').remove();" 
                            style="width:100%; padding:14px; background:${COLORS.TEXT_DARK}; border:none; color:#fff; font-weight:700; border-radius:8px; cursor:pointer; font-size:13px;">
                        INSPECT SITE ON MAP
                    </button>
                </div>
            `;
            document.body.appendChild(win);
            this.renderGraph(id, 1, `special-chart-${id}`, 'line');
        },

        openDetailsWindow: function (id, lat, lng, city, stage) {
            let win = document.getElementById('drone-stats-window');
            if (win) win.remove();

            const color = stage === 1 ? COLORS.ORANGE : COLORS.BLUE;

            win = document.createElement('div');
            win.id = 'drone-stats-window';
            win.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 650px; background: #fff; border: 1px solid ${color}; border-radius: 12px;
                color: ${COLORS.TEXT_DARK}; z-index: 10001; display: flex; flex-direction: column;
                box-shadow: 0 15px 50px rgba(0,0,0,0.15); font-family: 'Segoe UI', Inter, sans-serif;
            `;

            let headerContent = '';

            if (stage === 2) {
                // Dropdown for Stage 2
                headerContent = `
                    <select id="s2-metric-select" onchange="window.DroneAlert.updateStage2Chart('${id}')" 
                        style="padding:6px; border-radius:4px; border:1px solid ${COLORS.BORDER}; font-size:12px; outline:none; color:${COLORS.TEXT_DARK}; width: 140px;">
                        <option value="temp">Temp & Wind</option>
                        <option value="pm25">PM2.5 Levels</option>
                        <option value="co">CO Levels</option>
                        <option value="no2">NO2 Levels</option>
                        <option value="co2">CO2 Levels</option>
                        <option value="aod">AOD</option>
                    </select>
                `;
            } else {
                headerContent = `<span style="font-size:12px; color:${COLORS.TEXT_GRAY}; font-weight:600;">CONFIDENCE TREND</span>`;
            }

            win.innerHTML = `
                <div style="padding: 15px 25px; border-bottom: 1px solid ${COLORS.BORDER}; display:flex; justify-content:space-between; align-items:center; background: ${COLORS.BG_LIGHT};">
                    <div style="font-weight:700; font-size:15px; color:${COLORS.TEXT_DARK};">${city.toUpperCase()} - STATS</div>
                    <button onclick="document.getElementById('drone-stats-window').remove()" style="background:none; border:none; color:${COLORS.TEXT_GRAY}; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <div style="padding: 25px; display:flex; flex-direction:column; gap:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; font-size:12px; color:${COLORS.TEXT_GRAY}; text-transform:uppercase; letter-spacing:1px;">Historical Data (5 Days)</h4>
                        ${headerContent}
                    </div>
                    
                    <div style="height:280px; position:relative;">
                        <canvas id="details-chart-${id}"></canvas>
                    </div>

                    <div style="display:flex; gap:12px; margin-top:10px;">
                        <button onclick="window.DroneMap.animateInspection(${lat}, ${lng}); document.getElementById('drone-stats-window').remove(); document.getElementById('drone-alert-modal').remove();" 
                                style="flex:1; padding:14px; background:${color}; border:none; color:#fff; font-weight:700; border-radius:8px; cursor:pointer; font-size:13px; box-shadow:0 4px 12px ${color}33;">
                            VIEW LOCATION & INSPECT
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(win);

            if (stage === 2) {
                // Render initial default (Temp)
                this.updateStage2Chart(id);
            } else {
                this.renderGraph(id, stage, `details-chart-${id}`, 'bar');
            }
        },

        updateStage2Chart: function (id) {
            const select = document.getElementById('s2-metric-select');
            const val = select ? select.value : 'temp';

            // Data Mapping
            const map = {
                'temp': { data: [35, 36, 38, 41, 42.5], label: 'Temp (°C)' },
                'pm25': { data: [120, 130, 145, 160, 185], label: 'PM2.5 (µg/m³)' },
                'co': { data: [1800, 1900, 2100, 2300, 2450], label: 'CO (ppb)' },
                'no2': { data: [15, 16, 18, 20, 22], label: 'NO2 (ppb)' },
                'co2': { data: [400, 405, 408, 412, 415], label: 'CO2 (ppm)' },
                'aod': { data: [0.4, 0.45, 0.5, 0.55, 0.65], label: 'AOD' }
            };

            const d = map[val];
            this.renderGraph(id, 2, `details-chart-${id}`, 'line', d.data, d.label);
        },

        renderGraph: function (id, stage, canvasId, forcedType = null, forcedData = null, forcedLabel = null) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // Cleanup existing charts
            if (canvas.chart) canvas.chart.destroy();

            let type = forcedType || (stage === 1 ? 'bar' : 'bar');
            let data = forcedData ? forcedData : (stage === 1 ? [78, 82, 85, 89, 94.5] : [85, 92, 78, 45, 88, 72]); // Default data
            let labels = stage === 2 ? ['5d', '4d', '3d', '2d', 'Today'] : ['5d ago', '4d ago', '3d ago', '2d ago', 'Today'];
            let labelText = forcedLabel ? forcedLabel : 'Confidence %';

            const color = stage === 1 ? COLORS.ORANGE : COLORS.BLUE;

            canvas.chart = new Chart(ctx, {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        label: labelText,
                        data: data,
                        borderColor: color,
                        backgroundColor: type === 'line' ? color + '22' : color + 'CC',
                        fill: type === 'line',
                        tension: 0.4,
                        borderWidth: 2,
                        borderRadius: type === 'bar' ? 4 : 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } } },
                    scales: {
                        y: { grid: { color: '#f0f0f0' }, ticks: { color: COLORS.TEXT_GRAY, font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { color: COLORS.TEXT_GRAY, font: { size: 10 } } }
                    }
                }
            });
        }
    };
})();
