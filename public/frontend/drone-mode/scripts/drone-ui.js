// UI Controller for Drone Dashboard
// Includes Real-Time Telemetry Simulation & Interactive Markers

const UI = {
    state: {
        selectedForest: null,
        selectedDock: null,
        selectedDrone: null,
        pathVisible: false,
        coverageVisible: false,
        commLinksVisible: false,
        commCoverageVisible: false,
        // Simulation State
        simInterval: null,
        simProgress: 0,
        // Marker State
        tempMarkers: []
    },

    init() {
        // --- Event Listeners ---
        // (Path and coverage toggles are now handled by button clicks)

        // --- Move Charging HUD into Video Container ---
        // This ensures the animation matches the video dimensions exactly
        const hud = document.getElementById('charging-hud');
        const vidContainer = document.querySelector('.vid-body');
        if (hud && vidContainer && hud.parentNode !== vidContainer) {
            vidContainer.appendChild(hud);
            // Enforce filling the parent container
            hud.style.position = 'absolute';
            hud.style.top = '0';
            hud.style.left = '0';
            hud.style.width = '100%';
            hud.style.height = '100%';
            hud.style.zIndex = '10'; // Sit on top of video
        }

        // --- Populate Forest Dropdown ---
        const forestSelect = document.getElementById('forest-select');
        if (forestSelect && window.DRONE_DB) {
            forestSelect.innerHTML = '<option value="">Select Region...</option>';
            Object.keys(window.DRONE_DB.forests).forEach(key => {
                const f = window.DRONE_DB.forests[key];
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = f.name;
                forestSelect.appendChild(opt);
            });

            forestSelect.onchange = (e) => {
                if (e.target.value) this.openForestPanel(e.target.value);
            };
        }

        // Manual Forest Button (Sidebar)
        const forestBtn = document.getElementById('forest-select-btn');
        const modal = document.getElementById('forest-modal');
        const closeModal = document.getElementById('close-forest-modal');
        const searchInput = document.getElementById('forest-search');

        if (forestBtn && modal) {
            forestBtn.onclick = () => {
                modal.style.display = 'flex';
                this.renderForestList();
            };
        }
        if (closeModal) closeModal.onclick = () => { modal.style.display = 'none'; };
        if (searchInput) searchInput.oninput = (e) => this.renderForestList(e.target.value);
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

        // --- Map Interaction ---
        if (window.map) {
            window.map.on('mousemove', (e) => {
                // window.location.hash = `${e.lngLat.lat.toFixed(4)},${e.lngLat.lng.toFixed(4)}`;
            });
        }
    },

    // --- 1. Forest Selection ---
    openForestPanel(forestKey) {
        const data = window.DRONE_DB.forests[forestKey];
        if (!data) return;

        this.state.selectedForest = forestKey;
        this.closeBottomPanel();

        // Update Label
        const label = document.getElementById('forest-select-label');
        if (label) label.innerText = data.name;

        // A. Update Left Sidebar Area
        const statsContainer = document.getElementById('sidebar-stats');
        if (statsContainer) {
            statsContainer.style.display = 'flex';
            if (document.getElementById('sb-area')) document.getElementById('sb-area').innerText = data.acres + ' acres';
        }

        // B. Populate Dock List (Sidebar)
        const dockList = document.getElementById('sidebar-docks-list');
        if (dockList) {
            dockList.innerHTML = '';
            if (data.docks && data.docks.length > 0) {
                data.docks.forEach(dock => {
                    const btn = document.createElement('div');
                    btn.className = 'dock-item-btn';
                    btn.style.cssText = "padding:10px; background:#1a1a1a; border:1px solid #333; border-radius:4px; cursor:pointer; color:#ccc; font-size:0.85rem; transition:all 0.2s; margin-bottom:5px;";
                    btn.innerText = dock.location;

                    btn.onclick = () => {
                        Array.from(dockList.children).forEach(c => {
                            c.style.borderColor = '#333'; c.style.color = '#ccc'; c.style.background = '#1a1a1a';
                        });
                        btn.style.borderColor = '#ff6b35';
                        btn.style.color = '#fff';
                        btn.style.background = 'rgba(255, 107, 53, 0.1)';

                        this.handleDockSelect(dock.id);
                    };
                    dockList.appendChild(btn);
                });
            } else {
                dockList.innerHTML = '<div style="color:#666; font-size:0.8rem; padding:10px;">No docks active in this division.</div>';
            }
        }

        // C. Fly Map to Location
        if (window.map && data.center) {
            window.map.flyTo({ center: data.center, zoom: 10, pitch: 0 });

            // Show Docks ONLY for this Forest
            if (window.map.getLayer('dock-stations-layer')) {
                window.map.setLayoutProperty('dock-stations-layer', 'visibility', 'visible');
                window.map.setFilter('dock-stations-layer', ['==', 'forestKey', forestKey]);
            }

            // Hide any previous nodes/links
            if (window.COMM_NODES_SYSTEM) {
                window.COMM_NODES_SYSTEM.toggleLinks(window.map, false);
            }
        }
    },

    // --- 2. Dock Selection ---
    handleDockSelect(dockId) {
        this.state.selectedDock = dockId;

        // Close any existing dock panel
        this.closeDockPanel();

        // Get dock's forest key
        let dockForestKey = null;
        Object.entries(window.DRONE_DB.forests).forEach(([key, forest]) => {
            if (forest.docks && forest.docks.some(d => d.id === dockId)) {
                dockForestKey = key;
            }
        });

        if (!dockForestKey) return;

        // Ensure proper map context (Show Docks for this forest)
        if (window.map && window.map.getLayer('dock-stations-layer')) {
            window.map.setLayoutProperty('dock-stations-layer', 'visibility', 'visible');
            window.map.setFilter('dock-stations-layer', ['==', 'forestKey', dockForestKey]);
        }

        const forest = window.DRONE_DB.forests[dockForestKey];

        // Calculate threat statistics for this region
        const stats = this.calculateThreatStats(dockForestKey);

        // Create/update bottom slide-up panel
        let panel = document.getElementById('dock-panel-bottom');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'dock-panel-bottom';
            panel.style.cssText = `
                position: fixed;
                bottom: -100%;
                left: 280px;
                right: 320px;
                background: rgba(10, 10, 10, 0.98);
                border-top: 1px solid #2a2a2a;
                border-left: 1px solid #2a2a2a;
                border-right: 1px solid #2a2a2a;
                border-radius: 8px 8px 0 0;
                padding: 20px 30px;
                z-index: 1000;
                transition: bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
            `;
            document.body.appendChild(panel);
        }

        panel.innerHTML = `
                <div style="max-width: 1400px; margin: 0 auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="color: #ff6b35; font-size: 1.2rem; font-weight: 700; letter-spacing: 0.5px;">
                                Dock: ${dockId}
                            </div>
                            
                            <!-- Legends -->
                            <div style="display: flex; gap: 16px; align-items: center; margin-left: 20px; border-left: 1px solid #333; padding-left: 20px;">
                                 <div style="display: flex; align-items: center; gap: 6px; color: #4aa8ff; font-size: 0.75rem; font-weight: 600; opacity: 0.8;">
                                      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#4aa8ff"><path d="M480-360q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM480-160q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Zm0-320Zm141.5 141.5Q680-397 680-480t-58.5-141.5Q563-680 480-680t-141.5 58.5Q280-563 280-480t58.5 141.5Q397-280 480-280t141.5-58.5Z"/></svg>
                                      LORA node
                                 </div>
                                 <div style="display: flex; align-items: center; gap: 6px; color: #ff6b35; font-size: 0.75rem; font-weight: 600; opacity: 0.8;">
                                      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#ff6b35"><path d="M120-120v-80l170-49 62-520q4-30 26-50.5t53-20.5h98q31 0 53 20.5t26 50.5l62 520 170 49v80H120Zm320-120h80v-480q0-17-11.5-28.5T480-760q-17 0-28.5 11.5T440-720v480Z"/></svg>
                                      DOCK station
                                 </div>
                            </div>
                        </div>

                        <div style="display: flex; gap: 20px; align-items: center;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ccc; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                                <input type="checkbox" id="dock-coverage-check" style="width: 16px; height: 16px; cursor: pointer; accent-color: #4aa8ff;">
                                <span>COVERAGE</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #ccc; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
                                <input type="checkbox" id="dock-linking-check" style="width: 16px; height: 16px; cursor: pointer; accent-color: #4aa8ff;">
                                <span>LINKING</span>
                            </label>
                            <button onclick="DroneUI.closeDockPanel()" style="background: none; border: none; color: #888; cursor: pointer; font-size: 1.5rem; padding: 0; margin-left: 10px;">✕</button>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #2a2a2a; padding-top: 18px;">
                        <div style="color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px; font-weight: 600;">
                            ACTIVE THREATS & NETWORK STATUS
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;">
                            <div style="background: #1a1a1a; padding: 16px; border-radius: 6px; text-align: center;">
                                <div style="color: #888; font-size: 0.7rem; margin-bottom: 8px; letter-spacing: 1px;">TOTAL</div>
                                <div style="color: #fff; font-size: 1.8rem; font-weight: 700;">${stats.total}</div>
                            </div>
                            <div style="background: rgba(122, 184, 122, 0.12); padding: 16px; border-radius: 6px; text-align: center; border: 1px solid rgba(122, 184, 122, 0.3);">
                                <div style="color: #7AB87A; font-size: 0.7rem; margin-bottom: 8px; letter-spacing: 1px;">LOW</div>
                                <div style="color: #7AB87A; font-size: 1.8rem; font-weight: 700;">${stats.low}</div>
                            </div>
                            <div style="background: rgba(217, 199, 102, 0.12); padding: 16px; border-radius: 6px; text-align: center; border: 1px solid rgba(217, 199, 102, 0.3);">
                                <div style="color: #D9C766; font-size: 0.7rem; margin-bottom: 8px; letter-spacing: 1px;">MEDIUM</div>
                                <div style="color: #D9C766; font-size: 1.8rem; font-weight: 700;">${stats.medium}</div>
                            </div>
                            <div style="background: rgba(217, 160, 102, 0.12); padding: 16px; border-radius: 6px; text-align: center; border: 1px solid rgba(217, 160, 102, 0.3);">
                                <div style="color: #D9A066; font-size: 0.7rem; margin-bottom: 8px; letter-spacing: 1px;">STAGE 1</div>
                                <div style="color: #D9A066; font-size: 1.8rem; font-weight: 700;">${stats.stage1}</div>
                            </div>
                            <div style="background: rgba(107, 142, 201, 0.12); padding: 16px; border-radius: 6px; text-align: center; border: 1px solid rgba(107, 142, 201, 0.3);">
                                <div style="color: #6B8EC9; font-size: 0.7rem; margin-bottom: 8px; letter-spacing: 1px;">STAGE 2</div>
                                <div style="color: #6B8EC9; font-size: 1.8rem; font-weight: 700;">${stats.stage2}</div>
                            </div>
                            <div style="background: rgba(201, 74, 74, 0.12); padding: 16px; border-radius: 6px; text-align: center; border: 1px solid rgba(201, 74, 74, 0.3);">
                                <div style="color: #C94A4A; font-size: 0.7rem; margin-bottom: 8px; letter-spacing: 1px;">STAGE 3</div>
                                <div style="color: #C94A4A; font-size: 1.8rem; font-weight: 700;">${stats.stage3}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        // Slide up the panel
        setTimeout(() => {
            panel.style.bottom = '0';
        }, 50);

        // Initialize Nodes (Visible) & Links (Hidden) specific to this forest
        if (window.COMM_NODES_SYSTEM && window.map) {
            COMM_NODES_SYSTEM.initializeForestNodes(window.map, dockForestKey);
        }

        // Store forest key for node toggling
        panel.dataset.forestKey = dockForestKey;

        // Add event listeners for checkboxes
        setTimeout(() => {
            const coverageCheck = document.getElementById('dock-coverage-check');
            const linkingCheck = document.getElementById('dock-linking-check');

            if (coverageCheck) {
                coverageCheck.checked = false; // Default: Unchecked
                this.toggleDockCoverage(dockForestKey, false); // Default: Hidden

                coverageCheck.addEventListener('change', (e) => {
                    this.toggleDockCoverage(dockForestKey, e.target.checked);
                });
            }

            if (linkingCheck) {
                linkingCheck.checked = true; // Show mesh links by default when dock opens
                this.toggleDockLinking(dockForestKey, true);

                linkingCheck.addEventListener('change', (e) => {
                    this.toggleDockLinking(dockForestKey, e.target.checked);
                });
            }
        }, 100);

        // Update drone dropdown
        const drones = window.DRONE_DB.docks[dockId] || [];
        const droneDropdown = document.getElementById('drone-detail-select');

        if (droneDropdown) {
            droneDropdown.innerHTML = '';
            drones.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = `${d.id}`;
                droneDropdown.appendChild(opt);
            });

            droneDropdown.onchange = (e) => {
                const selected = drones.find(d => d.id === e.target.value);
                if (selected) this.handleDroneSelect(selected);
            };

            if (drones.length > 0) {
                droneDropdown.value = drones[0].id;
                this.handleDroneSelect(drones[0]);
            }
        }
    },

    // --- 3. Drone Selection (Updated for Charging & Dimensions) ---
    handleDroneSelect(drone) {
        this.state.selectedDrone = drone.id;
        const dData = window.DRONE_DB.drones[drone.id];
        const isCharging = dData.status === 'Charging';

        const video = document.getElementById('live-video-player');
        const loader = document.getElementById('video-loader');
        const overlay = document.getElementById('video-overlay'); // 'LIVE' tag

        if (loader) loader.style.display = 'none';

        if (isCharging) {
            // --- CHARGING STATE ---
            // 1. Hide Video & Live Overlay
            if (video) video.style.display = 'none';
            if (overlay) overlay.style.display = 'none';
            const maxBtn = document.getElementById('max-btn');
            if (maxBtn) maxBtn.style.display = 'none';

            // 2. Show Charging Animation (fills the video container)
            this.toggleChargingMode(true);

        } else {
            // --- FLIGHT STATE ---
            // 1. Hide Charging Animation
            this.toggleChargingMode(false);

            // 2. Show Video & Live Overlay
            if (video) {
                video.style.display = 'block';
                const overlay = document.getElementById('video-overlay');
                if (overlay) overlay.style.display = 'block';

                const maxBtn = document.getElementById('max-btn');
                if (maxBtn) maxBtn.style.display = 'block';

                const vidMap = {
                    1: 'drone-gif.mp4',
                    2: 'drone-video2.mp4',
                    3: 'drone-video3.mp4',
                    4: 'drone-video4.mp4',
                    5: 'drone-video5.mp4'
                };
                const file = vidMap[dData.video_id] || 'drone-gif.mp4';
                video.src = `../assets/img/${file}`;

                // Uniqueness: Random start time & specific filter per drone ID
                const filters = [
                    'none',
                    'contrast(1.15) saturate(1.1)',
                    'brightness(1.05) hue-rotate(15deg)',
                    'sepia(0.2) contrast(1.1)',
                    'brightness(0.95) hue-rotate(-10deg) saturate(1.2)'
                ];
                video.style.filter = filters[(dData.video_id - 1) % filters.length] || 'none';

                video.onloadedmetadata = () => {
                    video.currentTime = (dData.video_id * 15) % video.duration; // Deterministic offset
                };

                video.play().catch(e => { console.error("Video play failed", e); });
            }
        }

        // B. Update Trip Data (Distance & Air Time only)
        if (document.getElementById('trip-dist')) document.getElementById('trip-dist').innerText = dData.trip.distance;
        if (document.getElementById('trip-air')) document.getElementById('trip-air').innerText = dData.trip.duration;

        // C. Update Map Layers (restore previous state if any)
        this.clearMapLayers();
        if (this.state.pathVisible) this.togglePath(true);
        if (this.state.coverageVisible) this.toggleCoverage(true);

        // D. Start Telemetry Simulation
        this.startSimulation(dData);
    },

    // --- 4. Simulation Core ---
    startSimulation(droneData) {
        if (this.state.simInterval) clearInterval(this.state.simInterval);

        const isCharging = droneData.status === 'Charging';
        this.state.simBatt = parseFloat(droneData.batt);

        if (isCharging) {
            // Charging Mode: Static placeholders
            const elLat = document.getElementById('drone-lat');
            const elLng = document.getElementById('drone-lng');
            const elSpeed = document.getElementById('drone-speed');
            const elAlt = document.getElementById('drone-alt');

            if (elLat) elLat.innerText = "--";
            if (elLng) elLng.innerText = "--";
            if (elSpeed) elSpeed.innerText = "--";
            if (elAlt) elAlt.innerText = "--";

            // Battery charging loop
            this.state.simInterval = setInterval(() => {
                this.state.simBatt += 0.2;
                if (this.state.simBatt > 100) this.state.simBatt = 100;

                const elBatt = document.getElementById('drone-batt');
                const iconBatt = document.getElementById('batt-icon');

                if (elBatt) elBatt.innerText = "Charging...";
                if (iconBatt) iconBatt.style.color = '#00C851';
            }, 1000);

            return;
        }

        // Flying Mode: Normal telemetry
        this.state.simProgress = Math.random() * 0.6 + 0.2;

        const pathCoords = Array.isArray(droneData.trip.pathCoords) && droneData.trip.pathCoords.length >= 2
            ? droneData.trip.pathCoords
            : [droneData.trip.startCoords, droneData.trip.endCoords];

        const start = pathCoords[0];
        const end = pathCoords[pathCoords.length - 1];
        const baseSpeed = droneData.telemetry.speed;
        const baseAlt = parseInt(droneData.telemetry.alt);

        // Precompute path segment lengths for smooth interpolation
        const segments = [];
        let totalLen = 0;
        for (let i = 0; i < pathCoords.length - 1; i++) {
            const a = pathCoords[i];
            const b = pathCoords[i + 1];
            const len = turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' });
            totalLen += len;
            segments.push({ a, b, len, acc: totalLen });
        }
        this.state._pathSegments = segments;

        this.state.simInterval = setInterval(() => {
            const step = (baseSpeed / 10000);
            this.state.simProgress += step;
            if (this.state.simProgress >= 1.0) this.state.simProgress = 0.0;

            const p = this.state.simProgress;
            const targetDist = p * totalLen;
            let curLng = start[0];
            let curLat = start[1];
            for (let s = 0; s < segments.length; s++) {
                const seg = segments[s];
                const prevAcc = s === 0 ? 0 : segments[s - 1].acc;
                if (targetDist <= seg.acc) {
                    const segT = seg.len === 0 ? 0 : (targetDist - prevAcc) / seg.len;
                    curLng = seg.a[0] + (seg.b[0] - seg.a[0]) * segT;
                    curLat = seg.a[1] + (seg.b[1] - seg.a[1]) * segT;
                    break;
                }
            }

            let curSpeed = (baseSpeed + (Math.random() * 10 - 5));
            curSpeed = Math.max(0, curSpeed).toFixed(1);

            let curAlt = Math.floor(baseAlt + (Math.random() * 4 - 2));
            curAlt = Math.max(0, curAlt);

            this.state.simBatt -= 0.05;
            if (this.state.simBatt <= 0) this.state.simBatt = 100;
            const curBatt = this.state.simBatt.toFixed(1);

            const elLat = document.getElementById('drone-lat');
            const elLng = document.getElementById('drone-lng');
            const elSpeed = document.getElementById('drone-speed');
            const elAlt = document.getElementById('drone-alt');
            const elBatt = document.getElementById('drone-batt');
            const iconBatt = document.getElementById('batt-icon');

            if (elLat) elLat.innerText = curLat.toFixed(5);
            if (elLng) elLng.innerText = curLng.toFixed(5);
            if (elSpeed) elSpeed.innerText = curSpeed + ' km/h';
            if (elAlt) elAlt.innerText = curAlt + ' m';

            if (elBatt) elBatt.innerText = Math.floor(curBatt) + '%';
            if (iconBatt) {
                if (curBatt > 60) iconBatt.style.color = '#00C851';
                else if (curBatt > 30) iconBatt.style.color = '#ffbb33';
                else iconBatt.style.color = '#ff4444';
            }
        }, 1000);
    },

    // --- 5. Map Helpers ---
    togglePath(show) {
        const map = window.map;
        if (!map || !this.state.selectedDrone) return;

        if (show) {
            this.clearTempMarkers();
            const dData = window.DRONE_DB.drones[this.state.selectedDrone];
            const coords = Array.isArray(dData.trip.pathCoords) ? dData.trip.pathCoords : [dData.trip.startCoords, dData.trip.endCoords];

            const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };

            if (map.getSource('drone-path')) {
                map.getSource('drone-path').setData(geojson);
            } else {
                map.addSource('drone-path', { type: 'geojson', data: geojson });
                map.addLayer({
                    id: 'drone-path-line', type: 'line', source: 'drone-path',
                    paint: { 'line-color': '#ff6b35', 'line-width': 3, 'line-dasharray': [2, 1] }
                });
            }
            this.addPathLabel(coords[0], "Dock");
            this.addPathLabel(coords[coords.length - 1], "Dock");

            const bounds = new maplibregl.LngLatBounds();
            coords.forEach(c => bounds.extend(c));
            map.fitBounds(bounds, { padding: 50 });
        } else {
            if (map.getLayer('drone-path-line')) map.removeLayer('drone-path-line');
            if (map.getSource('drone-path')) map.removeSource('drone-path');
            const labels = document.getElementsByClassName('path-permanent-label');
            while (labels.length > 0) { labels[0].parentNode.removeChild(labels[0]); }
        }
    },

    toggleCoverage(show) {
        const map = window.map;
        if (!map || !this.state.selectedDrone) return;

        if (show) {
            const dData = window.DRONE_DB.drones[this.state.selectedDrone];
            const coords = Array.isArray(dData.trip.pathCoords) ? dData.trip.pathCoords : [dData.trip.startCoords, dData.trip.endCoords];
            const line = turf.lineString(coords);
            const buffered = turf.buffer(line, 0.35, { units: 'kilometers' });
            const geojson = buffered || line;

            if (map.getSource('drone-cov')) {
                map.getSource('drone-cov').setData(geojson);
            } else {
                map.addSource('drone-cov', { type: 'geojson', data: geojson });
                map.addLayer({
                    id: 'drone-cov-fill', type: 'fill', source: 'drone-cov',
                    paint: { 'fill-color': '#3fb36a', 'fill-opacity': 0.25 }
                });
                map.addLayer({
                    id: 'drone-cov-line', type: 'line', source: 'drone-cov',
                    paint: { 'line-color': '#2d8b52', 'line-width': 1.2 }
                });
            }
        } else {
            if (map.getLayer('drone-cov-fill')) map.removeLayer('drone-cov-fill');
            if (map.getLayer('drone-cov-line')) map.removeLayer('drone-cov-line');
            if (map.getSource('drone-cov')) map.removeSource('drone-cov');
        }
    },

    clearMapLayers() {
        this.togglePath(false);
        this.toggleCoverage(false);
        this.clearTempMarkers();
    },

    showPointMarker(coords, label, color) {
        this.clearTempMarkers();
        const pathTog = document.getElementById('path-toggle');
        if (pathTog && pathTog.checked) return;

        const p = new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: 'temp-marker-popup' })
            .setLngLat(coords)
            .setHTML(`<div style="background:#0f0f0f; color:${color}; padding:4px 8px; border-radius:4px; font-weight:bold; border:1px solid ${color};">${label}</div>`)
            .addTo(window.map);

        this.state.tempMarkers.push(p);

        if (window.map) {
            window.map.flyTo({ center: coords, zoom: 16, pitch: 0 });
        }
    },

    clearTempMarkers() {
        if (this.state.tempMarkers) {
            this.state.tempMarkers.forEach(m => m.remove());
            this.state.tempMarkers = [];
        }
    },

    addPathLabel(coords, text) {
        const el = document.createElement('div');
        el.className = 'path-permanent-label';
        el.innerHTML = `<div style="background:#000; color:#fff; padding:2px 6px; font-size:0.7rem; border-radius:3px; border:1px solid #444;">${text}</div>`;

        new maplibregl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(window.map);
    },

    renderForestList(filter = "") {
        const container = document.getElementById('forest-list-container');
        if (!container) return;
        container.innerHTML = '';

        const term = filter.toLowerCase();
        Object.keys(window.DRONE_DB.forests).forEach(key => {
            const f = window.DRONE_DB.forests[key];
            if (f.name.toLowerCase().includes(term) || f.location.toLowerCase().includes(term)) {

                const item = document.createElement('div');
                item.style.cssText = "padding:12px; background:#222; border-bottom:1px solid #333; cursor:pointer; color:#ccc; display:flex; flex-direction:column; gap:4px; border-radius:4px; margin-bottom:4px;";
                item.onmouseover = () => { item.style.background = '#333'; item.style.color = '#fff'; };
                item.onmouseout = () => { item.style.background = '#222'; item.style.color = '#ccc'; };

                item.innerHTML = `
                <div style="font-size:0.95rem; font-weight:600;">${f.name}</div>
                <div style="font-size:0.8rem; color:#888;">${f.location}</div>
        `;

                item.onclick = () => {
                    this.openForestPanel(key);
                    document.getElementById('forest-modal').style.display = 'none';
                };
                container.appendChild(item);
            }
        });
    },

    closeBottomPanel() {
        const bottomPanel = document.getElementById('bottom-panel');
        if (bottomPanel) bottomPanel.style.bottom = '-100%';
        if (this.state.simInterval) clearInterval(this.state.simInterval);
    },

    toggleChargingMode(active) {
        const hud = document.getElementById('charging-hud');
        if (!hud) return;

        if (active) {
            hud.classList.add('active');

            let pct = 0;
            const txt = document.getElementById('charge-percent');
            const liquid = document.getElementById('charge-liquid');

            if (this.chargeInterval) clearInterval(this.chargeInterval);

            this.chargeInterval = setInterval(() => {
                pct++;
                if (pct > 100) pct = 0;

                if (txt) txt.innerText = pct + '%';

                if (liquid) {
                    liquid.style.height = pct + '%';
                    if (pct < 30) liquid.style.background = 'linear-gradient(0deg, #4d0000, #ff0000)';
                    else if (pct < 60) liquid.style.background = 'linear-gradient(0deg, #4d4d00, #ffff00)';
                    else liquid.style.background = 'linear-gradient(0deg, #004d00, #00ff00)';
                }
            }, 100);

        } else {
            hud.classList.remove('active');
            if (this.chargeInterval) clearInterval(this.chargeInterval);
        }
    },

    toggleVideoSize(max) {
        if (!this.state.selectedDock) {
            alert('Please select a docking station first');
            return;
        }

        const m = document.getElementById('video-modal');
        if (m) {
            if (max) {
                m.classList.add('active');

                // Sync video source to the selected drone
                const vid = m.querySelector('video');
                if (vid && this.state.selectedDrone) {
                    const dData = window.DRONE_DB.drones[this.state.selectedDrone];
                    if (dData && dData.status !== 'Charging') {
                        const vidMap = {
                            1: 'drone-gif.mp4',
                            2: 'drone-video2.mp4',
                            3: 'drone-video3.mp4',
                            4: 'drone-video4.mp4',
                            5: 'drone-video5.mp4'
                        };
                        const file = vidMap[dData.video_id] || 'drone-gif.mp4';
                        vid.src = `../assets/img/${file}`;
                        vid.play().catch(e => console.error("Modal video play failed", e));
                    }
                }
            } else {
                m.classList.remove('active');
                // Optional: Pause video when closed to save resources
                const vid = m.querySelector('video');
                if (vid) vid.pause();
            }
        }
    },

    showAllDrones() {
        if (!this.state.selectedDock) {
            alert('Please select a docking station first');
            return;
        }

        const modal = document.getElementById('all-drones-modal');
        const grid = document.getElementById('all-drones-grid');

        if (!modal || !grid) return;

        const drones = window.DRONE_DB.docks[this.state.selectedDock] || [];

        // Clear existing content
        grid.innerHTML = '';

        // Video mapping
        const vidMap = {
            1: 'drone-gif.mp4',
            2: 'drone-video2.mp4',
            3: 'drone-video3.mp4',
            4: 'drone-video4.mp4',
            5: 'drone-video5.mp4'
        };

        // Create grid items for each drone
        drones.forEach(drone => {
            // Get full drone data from database
            const dData = window.DRONE_DB.drones[drone.id];
            const isCharging = dData.status === 'Charging';
            const videoFile = vidMap[dData.video_id] || 'drone-gif.mp4';

            // Uniqueness Filters
            const filters = [
                'none',
                'contrast(1.15) saturate(1.1)',
                'brightness(1.05) hue-rotate(15deg)',
                'sepia(0.2) contrast(1.1)',
                'brightness(0.95) hue-rotate(-10deg) saturate(1.2)'
            ];
            const filter = filters[(dData.video_id - 1) % filters.length] || 'none';

            const gridItem = document.createElement('div');
            gridItem.style.cssText = `
                background: #141414;
                border: 1px solid #1f1f1f;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            `;

            gridItem.innerHTML = `
                <div style="padding: 10px; background: #111; border-bottom: 1px solid #1f1f1f; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #ff6b35; font-weight: 600; font-size: 0.9rem;">${dData.id}</span>
                    <span style="color: ${isCharging ? '#00C851' : '#888'}; font-size: 0.75rem; text-transform: uppercase;">${dData.status}</span>
                </div>
                <div style="position: relative; width: 100%; height: 200px; background: #000;">
                    ${isCharging ?
                    `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#00C851; font-size:0.9rem;">⚡ CHARGING</div>` :
                    `<video src="../assets/img/${videoFile}" autoplay loop muted playsinline 
                        style="width:100%; height:100%; object-fit:cover; filter:${filter};"
                        onloadedmetadata="this.currentTime = (${dData.video_id} * 15) % this.duration"
                     ></video>`
                }
                </div>
                <div style="padding: 8px; background: #111; display: flex; justify-content: space-between; font-size: 0.75rem;">
                    <span style="color: #888;">Battery: <span style="color: ${isCharging ? '#00C851' : '#fff'};">${isCharging ? 'Charging...' : Math.floor(dData.batt) + '%'}</span></span>
                    <span style="color: #888;">Speed: <span style="color: #fff;">${isCharging ? '--' : dData.telemetry.speed + ' km/h'}</span></span>
                </div>
            `;
            grid.appendChild(gridItem);
        });

        modal.classList.add('active');
    },

    closeAllDrones() {
        const modal = document.getElementById('all-drones-modal');
        if (modal) modal.classList.remove('active');
    },

    togglePathButton() {
        this.state.pathVisible = !this.state.pathVisible;
        const btn = document.getElementById('path-toggle-btn');

        if (this.state.pathVisible) {
            // Active state
            if (btn) {
                btn.style.background = 'rgba(255,107,53,0.2)';
                btn.style.borderColor = '#ff6b35';
                btn.style.color = '#ff6b35';
            }
            this.togglePath(true);
        } else {
            // Inactive state
            if (btn) {
                btn.style.background = '#1a1a1a';
                btn.style.borderColor = '#333';
                btn.style.color = '#ccc';
            }
            this.togglePath(false);
        }
    },

    toggleCoverageButton() {
        this.state.coverageVisible = !this.state.coverageVisible;
        const btn = document.getElementById('coverage-toggle-btn');

        if (this.state.coverageVisible) {
            // Active state
            if (btn) {
                btn.style.background = 'rgba(255,107,53,0.2)';
                btn.style.borderColor = '#ff6b35';
                btn.style.color = '#ff6b35';
            }
            this.toggleCoverage(true);
        } else {
            // Inactive state
            if (btn) {
                btn.style.background = '#1a1a1a';
                btn.style.borderColor = '#333';
                btn.style.color = '#ccc';
            }
            this.toggleCoverage(false);
        }
    },

    calculateThreatStats(forestKey) {
        const baseStats = { total: 0, low: 0, medium: 0, stage1: 0, stage2: 0, stage3: 0 };

        // Prefer live fire data so stats mirror the map exactly
        const fireData = window.DroneMap && window.DroneMap.fireData;
        if (fireData && Array.isArray(fireData.features)) {
            const stats = { ...baseStats };
            fireData.features.forEach(f => {
                const p = f.properties || {};
                if (p.forestKey !== forestKey || !p.insideForest) return;

                stats.total += 1;
                const sev = (p.severity_label || '').toLowerCase();
                if (sev.includes('low')) stats.low += 1;
                else if (sev.includes('medium')) stats.medium += 1;
                else if (sev.includes('stage 1')) stats.stage1 += 1;
                else if (sev.includes('stage 2')) stats.stage2 += 1;
                else if (sev.includes('stage 3')) stats.stage3 += 1;
            });
            return stats;
        }

        // Fallback to configured counts
        const forest = window.DRONE_DB.forests[forestKey];
        if (!forest || !forest.hotspots) return baseStats;

        const severity = forest.hotspots.severity;
        return {
            total: forest.hotspots.total,
            low: severity.low || 0,
            medium: severity.medium || 0,
            stage1: severity.stage1 || 0,
            stage2: severity.stage2 || 0,
            stage3: severity.stage3 || 0
        };
    },

    closeDockPanel() {
        const panel = document.getElementById('dock-panel-bottom');
        if (panel) {
            // Slide down first
            panel.style.bottom = '-100%';

            // Remove after animation
            setTimeout(() => {
                panel.remove();
            }, 400);
        }

        // Hide all nodes when panel is closed
        if (window.COMM_NODES_SYSTEM && window.map) {
            COMM_NODES_SYSTEM.toggleLinks(window.map, false);
            COMM_NODES_SYSTEM.toggleCoverage(window.map, false);
        }
    },

    toggleDockCoverage(forestKey, show) {
        if (!window.COMM_NODES_SYSTEM || !window.map) return;

        if (show) {
            // Show only nodes for this forest
            COMM_NODES_SYSTEM.toggleCoverageForForest(window.map, forestKey, true);
        } else {
            COMM_NODES_SYSTEM.toggleCoverage(window.map, false);
        }
    },

    toggleDockLinking(forestKey, show) {
        if (!window.COMM_NODES_SYSTEM || !window.map) return;
        COMM_NODES_SYSTEM.toggleLinkLayer(window.map, show);
    },

    viewLoraNode() {
        alert('LoRa Node details coming soon...');
    },

    viewDockStation() {
        alert('Dock Station details coming soon...');
    },

    toggleCommLinksButton() {
        this.state.commLinksVisible = !this.state.commLinksVisible;

        if (window.COMM_NODES_SYSTEM && window.map) {
            COMM_NODES_SYSTEM.toggleLinks(window.map, this.state.commLinksVisible);
        }
    },

    toggleCommCoverageButton() {
        this.state.commCoverageVisible = !this.state.commCoverageVisible;

        if (window.COMM_NODES_SYSTEM && window.map) {
            COMM_NODES_SYSTEM.toggleCoverage(window.map, this.state.commCoverageVisible);
        }
    },

    flyToLocation(lat, lon) {
        if (window.map) {
            window.map.flyTo({
                center: [lon, lat],
                zoom: 14,
                pitch: 45,
                duration: 2000
            });

            // Add a temporary highlight marker
            this.showPointMarker([lon, lat], "Alert Site", "#ff6b35");
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

window.DroneUI = UI;
