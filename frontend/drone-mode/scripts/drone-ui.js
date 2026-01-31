// UI Controller for Drone Dashboard
// Includes Real-Time Telemetry Simulation & Interactive Markers

const UI = {
    state: {
        selectedForest: null,
        selectedDock: null,
        selectedDrone: null,
        pathVisible: false,
        coverageVisible: false,
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

        // A. Update Left Sidebar Stats
        const statsContainer = document.getElementById('sidebar-stats');
        if (statsContainer) {
            statsContainer.style.display = 'flex';

            if (document.getElementById('sb-area')) document.getElementById('sb-area').innerText = data.acres + ' acres';
            if (document.getElementById('sb-total-hotspots')) document.getElementById('sb-total-hotspots').innerText = `(${data.hotspots.total})`;

            const total = data.hotspots.total || 1;
            const setBar = (id, val) => {
                const bar = document.getElementById('bar-' + id);
                const txt = document.getElementById('val-' + id);
                if (bar) bar.style.width = ((val / total) * 100) + '%';
                if (txt) txt.innerText = val;
            };
            setBar('high', data.hotspots.severity.high);
            setBar('med', data.hotspots.severity.medium);
            setBar('low', data.hotspots.severity.low);
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
        }
    },

    // --- 2. Dock Selection ---
    handleDockSelect(dockId) {
        this.state.selectedDock = dockId;
        const bottomPanel = document.getElementById('bottom-panel');
        if (bottomPanel) bottomPanel.style.bottom = '0%';

        if (document.getElementById('bp-dock-name')) document.getElementById('bp-dock-name').innerText = dockId;

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

        const gallery = document.getElementById('hotspots-gallery');
        if (gallery) {
            gallery.innerHTML = '';
            const count = Math.floor(Math.random() * 5) + 2;
            for (let i = 0; i < count; i++) {
                const div = document.createElement('div');
                div.className = 'chip-btn';
                div.style.minWidth = '120px';
                div.innerHTML = `<span style="color:#ff4444;">●</span> Fire #${100 + i} <br><span style="font-size:0.7rem; color:#666;">${(Math.random() * 2 + 1).toFixed(1)}km away</span>`;
                gallery.appendChild(div);
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

            // 2. Show Charging Animation (fills the video container)
            this.toggleChargingMode(true);

        } else {
            // --- FLIGHT STATE ---
            // 1. Hide Charging Animation
            this.toggleChargingMode(false);

            // 2. Show Video & Live Overlay
            if (video) {
                video.style.display = 'block';
                if (overlay) overlay.style.display = 'block';

                const vidMap = {
                    1: 'drone-gif.mp4',
                    2: 'drone-video2.mp4',
                    3: 'drone-video3.mp4',
                    4: 'drrone-video4.mp4',
                    5: 'drone-video5.mp4'
                };
                const file = vidMap[dData.video_id] || 'drone-gif.mp4';
                video.src = `../assets/img/${file}`;
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

        const start = droneData.trip.startCoords;
        const end = droneData.trip.endCoords;
        const baseSpeed = droneData.telemetry.speed;
        const baseAlt = parseInt(droneData.telemetry.alt);

        this.state.simInterval = setInterval(() => {
            const step = (baseSpeed / 10000);
            this.state.simProgress += step;
            if (this.state.simProgress >= 1.0) this.state.simProgress = 0.0;

            const p = this.state.simProgress;
            const curLng = start[0] + (end[0] - start[0]) * p;
            const curLat = start[1] + (end[1] - start[1]) * p;

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
            const start = dData.trip.startCoords;
            const end = dData.trip.endCoords;

            const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: [start, end] } };

            if (map.getSource('drone-path')) {
                map.getSource('drone-path').setData(geojson);
            } else {
                map.addSource('drone-path', { type: 'geojson', data: geojson });
                map.addLayer({
                    id: 'drone-path-line', type: 'line', source: 'drone-path',
                    paint: { 'line-color': '#ff6b35', 'line-width': 3, 'line-dasharray': [2, 1] }
                });
            }
            this.addPathLabel(start, "Start");
            this.addPathLabel(end, "End");

            const bounds = new maplibregl.LngLatBounds(start, end);
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
            const c = dData.trip.startCoords;
            const d = 0.015;
            const poly = [[c[0] - d, c[1] - d], [c[0] + d, c[1] - d], [c[0] + d, c[1] + d], [c[0] - d, c[1] + d], [c[0] - d, c[1] - d]];

            const geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [poly] } };

            if (map.getSource('drone-cov')) {
                map.getSource('drone-cov').setData(geojson);
            } else {
                map.addSource('drone-cov', { type: 'geojson', data: geojson });
                map.addLayer({
                    id: 'drone-cov-fill', type: 'fill', source: 'drone-cov',
                    paint: { 'fill-color': '#00C851', 'fill-opacity': 0.1 }
                });
                map.addLayer({
                    id: 'drone-cov-line', type: 'line', source: 'drone-cov',
                    paint: { 'line-color': '#00C851', 'line-width': 1 }
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
        const m = document.getElementById('video-modal');
        if (m) {
            if (max) m.classList.add('active');
            else m.classList.remove('active');
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
            4: 'drrone-video4.mp4',
            5: 'drone-video5.mp4'
        };

        // Create grid items for each drone
        drones.forEach(drone => {
            const isCharging = drone.status === 'Charging';
            const videoFile = vidMap[drone.video_id] || 'drone-gif.mp4';

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
                    <span style="color: #ff6b35; font-weight: 600; font-size: 0.9rem;">${drone.id}</span>
                    <span style="color: ${isCharging ? '#00C851' : '#888'}; font-size: 0.75rem; text-transform: uppercase;">${drone.status}</span>
                </div>
                <div style="position: relative; width: 100%; height: 200px; background: #000;">
                    ${isCharging ?
                    `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#00C851; font-size:0.9rem;">⚡ CHARGING</div>` :
                    `<video src="../assets/img/${videoFile}" autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover;"></video>`
                }
                </div>
                <div style="padding: 8px; background: #111; display: flex; justify-content: space-between; font-size: 0.75rem;">
                    <span style="color: #888;">Battery: <span style="color: ${isCharging ? '#00C851' : '#fff'};">${isCharging ? 'Charging...' : Math.floor(drone.batt) + '%'}</span></span>
                    <span style="color: #888;">Speed: <span style="color: #fff;">${isCharging ? '--' : drone.telemetry.speed + ' km/h'}</span></span>
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
    }
};

window.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

window.DroneUI = UI;