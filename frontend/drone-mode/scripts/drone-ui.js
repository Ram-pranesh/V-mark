
// UI Controller for Drone Dashboard

const UI = {
    state: {
        selectedForest: null,
        selectedDock: null,
        selectedDrone: null,
        pathVisible: false
    },

    init() {
        // Listeners for UI interaction
        const dockSelect = document.getElementById('dock-select'); // legacy safe
        if (dockSelect) dockSelect.addEventListener('change', (e) => this.handleDockSelect(e.target.value));

        const pathToggle = document.getElementById('path-toggle');
        if (pathToggle) pathToggle.addEventListener('change', (e) => this.togglePath(e.target.checked));

        const covToggle = document.getElementById('coverage-toggle');
        if (covToggle) covToggle.addEventListener('change', (e) => this.toggleCoverage(e.target.checked));

        // Forest Selection Button & Modal Logic
        const forestBtn = document.getElementById('forest-select-btn');
        const modal = document.getElementById('forest-modal');
        const closeModal = document.getElementById('close-forest-modal');
        const searchInput = document.getElementById('forest-search');
        const listContainer = document.getElementById('forest-list-container');
        const label = document.getElementById('forest-select-label');

        if (forestBtn && modal) {
            forestBtn.onclick = () => {
                modal.style.display = 'flex';
                this.renderForestList(); // Populate list on open
            };
        }

        if (closeModal) {
            closeModal.onclick = () => { modal.style.display = 'none'; };
        }

        if (searchInput) {
            searchInput.oninput = (e) => this.renderForestList(e.target.value);
        }

        // Close on click outside
        window.onclick = (e) => {
            if (e.target == modal) modal.style.display = 'none';
        }

        // Mouse Hover Lat/Lng -> URL Hash
        if (window.map) {
            window.map.on('mousemove', (e) => {
                window.location.hash = `${e.lngLat.lat.toFixed(4)},${e.lngLat.lng.toFixed(4)}`;
            });
        } else {
            // Retry if map not ready
            setTimeout(() => {
                if (window.map) {
                    window.map.on('mousemove', (e) => {
                        window.location.hash = `${e.lngLat.lat.toFixed(4)},${e.lngLat.lng.toFixed(4)}`;
                    });
                }
            }, 2000);
        }
    },

    // Called when a Forest matches from Sidebar Dropdown
    openForestPanel(forestKey) {
        const data = window.DRONE_DB.forests[forestKey];
        if (!data) return;

        this.state.selectedForest = forestKey;
        this.closeBottomPanel(); // Reset bottom panel

        // Update Button Label
        const label = document.getElementById('forest-select-label');
        if (label) label.innerText = data.name;

        // Reset Video to Loader State
        const loader = document.getElementById('video-loader');
        const video = document.getElementById('live-video-player');
        const overlay = document.getElementById('video-overlay');
        if (loader) loader.style.display = 'flex';
        if (video) { video.style.display = 'none'; video.pause(); }
        if (overlay) overlay.style.display = 'none';

        // Populate Left Sidebar Stats
        const statsContainer = document.getElementById('sidebar-stats');
        if (statsContainer) {
            statsContainer.style.display = 'flex';

            // Area
            const areaEl = document.getElementById('sb-area');
            if (areaEl) areaEl.innerText = data.acres + ' acres';

            // Hotspots Header
            const hTotal = document.getElementById('sb-total-hotspots');
            if (hTotal) hTotal.innerText = `(${data.hotspots.total})`;

            // Bars
            const total = data.hotspots.total || 1; // avoid div by 0

            const highP = (data.hotspots.severity.high / total) * 100;
            const medP = (data.hotspots.severity.medium / total) * 100;
            const lowP = (data.hotspots.severity.low / total) * 100;

            const barHigh = document.getElementById('bar-high');
            if (barHigh) barHigh.style.width = highP + '%';
            const valHigh = document.getElementById('val-high');
            if (valHigh) valHigh.innerText = data.hotspots.severity.high;

            const barMed = document.getElementById('bar-med');
            if (barMed) barMed.style.width = medP + '%';
            const valMed = document.getElementById('val-med');
            if (valMed) valMed.innerText = data.hotspots.severity.medium;

            const barLow = document.getElementById('bar-low');
            if (barLow) barLow.style.width = lowP + '%';
            const valLow = document.getElementById('val-low');
            if (valLow) valLow.innerText = data.hotspots.severity.low;
        }

        // Populate SIDEBAR Dock List
        const dockList = document.getElementById('sidebar-docks-list');
        if (dockList) {
            dockList.innerHTML = '';
            // If docks exist
            if (data.docks && data.docks.length > 0) {
                data.docks.forEach((dock, index) => {
                    const btn = document.createElement('div');
                    // Styled like a control item but clickable block
                    btn.className = 'dock-item-btn'; // New class in CSS
                    btn.style.cssText = "padding:8px; background:#1a1a1a; border:1px solid #333; border-radius:4px; cursor:pointer; color:#ccc; font-size:0.9rem; transition:all 0.2s;";
                    btn.innerText = dock.location;

                    btn.onclick = () => {
                        // Visual active state
                        Array.from(dockList.children).forEach(c => {
                            c.style.borderColor = '#333';
                            c.style.color = '#ccc';
                        });
                        btn.style.borderColor = '#ff6b35';
                        btn.style.color = '#fff';

                        this.handleDockSelect(dock.id);
                    };
                    dockList.appendChild(btn);
                });
            } else {
                dockList.innerHTML = '<span style="font-size:0.8rem; color:#666;">No docks available.</span>';
            }
        }

        // Populate Center Header
        const nameEl = document.getElementById('bp-forest-name');
        if (nameEl) nameEl.innerText = data.name;

        // Populate Dock Buttons (Chips) - This section is removed as per instruction
        // The new instruction replaces this with populating 'sidebar-docks-list'

        // Fly to Forest
        if (window.map && data.coordinates) {
            const bounds = new maplibregl.LngLatBounds();
            data.coordinates.forEach(c => bounds.extend(c));
            window.map.fitBounds(bounds, { padding: 40, pitch: 0 }); // Top down
        }
    },

    handleDockSelect(dockId) {
        if (!dockId) return;
        this.state.selectedDock = dockId;

        // Open Bottom Panel (Rise Up)
        const bottomPanel = document.getElementById('bottom-panel');
        if (bottomPanel) {
            bottomPanel.style.bottom = '0%'; // Slide up
        }

        // Update Panel Header
        const dockNameEl = document.getElementById('bp-dock-name');
        if (dockNameEl) dockNameEl.innerText = dockId;

        const drones = window.DRONE_DB.docks[dockId] || window.DRONE_DB.docks['default'];

        // Populate Drone Select Dropdown (Right Sidebar Header)
        const droneDropdown = document.getElementById('drone-detail-select');
        if (droneDropdown) {
            droneDropdown.innerHTML = ''; // Clear previous
            drones.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = d.id; // Just ID for compact view
                droneDropdown.appendChild(opt);
            });

            // Add listener for drone change
            droneDropdown.onchange = (e) => {
                const selected = drones.find(d => d.id === e.target.value);
                if (selected) this.handleDroneSelect(selected);
            };

            // Auto select first drone
            if (drones.length > 0) {
                droneDropdown.value = drones[0].id;
                this.handleDroneSelect(drones[0]);
            }
        }
    },

    handleDroneSelect(drone) {
        this.state.selectedDrone = drone.id;
        const dData = window.DRONE_DB.drones[drone.id];

        // 0. Handle Video State
        const loader = document.getElementById('video-loader');
        const video = document.getElementById('live-video-player');
        const overlay = document.getElementById('video-overlay');

        if (loader) loader.style.display = 'none';
        if (video) {
            video.style.display = 'block';
            video.play().catch(e => console.log('Autoplay prevented perms'));
        }
        if (overlay) overlay.style.display = 'block';

        // 1. Update Video Header (Batt)
        const battEl = document.getElementById('drone-batt');
        const battIcon = document.getElementById('batt-icon');
        if (battEl) battEl.innerText = dData.batt + '%';
        if (battIcon) {
            if (dData.batt > 60) battIcon.style.color = '#00C851';
            else if (dData.batt > 30) battIcon.style.color = '#ffbb33';
            else battIcon.style.color = '#ff4444';
        }

        // 2. Update Telemetry
        const t = dData.telemetry || {};
        if (document.getElementById('drone-speed')) document.getElementById('drone-speed').innerText = t.speed + ' km/h';
        if (document.getElementById('drone-alt')) document.getElementById('drone-alt').innerText = t.alt + ' m';
        if (document.getElementById('drone-lat')) document.getElementById('drone-lat').innerText = t.lat;
        if (document.getElementById('drone-lng')) document.getElementById('drone-lng').innerText = t.lng;

        // 3. Status Banner - REMOVED text as requested "I dont want that option in flight status that it says about the fire confirmed"
        // We will just keep the banner simple or hidden, or just show generic status
        const sbText = document.getElementById('sb-text');
        const sbIcon = document.getElementById('sb-icon');
        const banner = document.getElementById('status-banner');

        if (banner) banner.style.display = 'none'; // Completely hiding per request "Remove that option completely"

        // 4. Update Trip Info
        this.updateRightSidebar(dData);

        // 5. Reset Toggles
        const pathTog = document.getElementById('path-toggle');
        const covTog = document.getElementById('coverage-toggle');

        this.clearMapLayers();

        if (pathTog && pathTog.checked) this.togglePath(true);
        if (covTog) {
            covTog.checked = false;
            covTog.onclick = (e) => this.toggleCoverage(e.target.checked);
        }
    },

    // Helper: Render Forest List in Modal
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

    updateRightSidebar(drone) {
        // Trip Info
        const info = (window.DRONE_DB.drones[drone.id] && window.DRONE_DB.drones[drone.id].trip) || {
            start: '--', end: '--', distance: '--', air_time: '--', startCoords: null, endCoords: null
        };

        const startEl = document.getElementById('trip-start');
        if (startEl) {
            startEl.innerText = `[${info.start}]`;
            startEl.style.cursor = 'pointer';
            startEl.style.color = '#4aa8ff';
            startEl.onclick = () => {
                if (info.startCoords && window.map) {
                    window.map.flyTo({ center: info.startCoords, zoom: 16, pitch: 0 });
                }
            };
        }

        const endEl = document.getElementById('trip-end');
        if (endEl) {
            endEl.innerText = `[${info.end}]`;
            endEl.style.cursor = 'pointer';
            endEl.style.color = '#4aa8ff';
            endEl.onclick = () => {
                if (info.endCoords && window.map) {
                    window.map.flyTo({ center: info.endCoords, zoom: 16, pitch: 0 });
                }
            };
        }

        const distEl = document.getElementById('trip-dist');
        if (distEl) distEl.innerText = info.distance;

        const tAirEl = document.getElementById('trip-air');
        if (tAirEl) tAirEl.innerText = info.air_time; // Fix reading from trip
    },

    clearMapLayers() {
        const map = window.map;
        if (!map) return;

        // Path
        if (map.getLayer('drone-path-line')) map.setLayoutProperty('drone-path-line', 'visibility', 'none');
        if (map.getLayer('drone-path-pts')) map.setLayoutProperty('drone-path-pts', 'visibility', 'none');

        // Coverage
        if (map.getLayer('drone-coverage-fill')) map.removeLayer('drone-coverage-fill');
        if (map.getLayer('drone-coverage-line')) map.removeLayer('drone-coverage-line');
        if (map.getSource('drone-coverage')) map.removeSource('drone-coverage');
    },

    toggleCoverage(show) {
        const map = window.map;
        if (!map || !this.state.selectedDrone) return;

        if (show) {
            const dData = window.DRONE_DB.drones[this.state.selectedDrone];
            // Safety check
            if (!dData || !dData.trip || !dData.trip.startCoords) return;

            // Use Drone's Start Coordinates for Coverage Center
            const c = dData.trip.startCoords; // [lng, lat]
            const d = 0.02; // Roughly 2km box

            const poly = [
                [c[0] - d, c[1] - d], [c[0] + d, c[1] - d],
                [c[0] + d, c[1] + d], [c[0] - d, c[1] + d],
                [c[0] - d, c[1] - d]
            ];

            const geojson = {
                type: 'Feature', geometry: { type: 'Polygon', coordinates: [poly] }
            };

            // Remove existing if any (clean state)
            if (map.getSource('drone-coverage')) {
                map.getSource('drone-coverage').setData(geojson);
            } else {
                map.addSource('drone-coverage', { type: 'geojson', data: geojson });
            }
            map.addLayer({
                id: 'drone-coverage-fill', type: 'fill', source: 'drone-coverage',
                paint: { 'fill-color': '#00C851', 'fill-opacity': 0.15 }
            });
            map.addLayer({
                id: 'drone-coverage-line', type: 'line', source: 'drone-coverage',
                paint: { 'line-color': '#00C851', 'line-width': 1, 'line-dasharray': [2, 2] }
            });

        } else {
            if (map.getLayer('drone-coverage-fill')) map.removeLayer('drone-coverage-fill');
            if (map.getLayer('drone-coverage-line')) map.removeLayer('drone-coverage-line');
            if (map.getSource('drone-coverage')) map.removeSource('drone-coverage');
        }
    },

    togglePath(show) {
        this.state.pathVisible = show;
        const map = window.map;
        if (!map) return;

        if (show && this.state.selectedDrone) {
            const dData = window.DRONE_DB.drones[this.state.selectedDrone];
            if (!dData || !dData.trip || !dData.trip.startCoords) return;

            const start = dData.trip.startCoords; // [lng, lat]
            const end = dData.trip.endCoords;     // [lng, lat]

            // Generate a curved path
            const mid = [(start[0] + end[0]) / 2 + 0.002, (start[1] + end[1]) / 2 + 0.002]; // Slight curve

            const geojson = {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [start, mid, end]
                }
            };

            // ... (rest of layer adding logic) ...
            if (map.getSource('drone-path')) {
                map.getSource('drone-path').setData(geojson);
            } else {
                map.addSource('drone-path', { type: 'geojson', data: geojson });
                map.addLayer({
                    id: 'drone-path-line', type: 'line', source: 'drone-path',
                    paint: { 'line-color': '#ff6b35', 'line-width': 4, 'line-opacity': 0.8 }
                });
                map.addLayer({
                    id: 'drone-path-pts', type: 'circle', source: 'drone-path',
                    paint: { 'circle-radius': 6, 'circle-color': '#fff' }
                });
            }
            if (map.getLayer('drone-path-line')) map.setLayoutProperty('drone-path-line', 'visibility', 'visible');
            if (map.getLayer('drone-path-pts')) map.setLayoutProperty('drone-path-pts', 'visibility', 'visible');

            // Fly to path
            const bounds = new maplibregl.LngLatBounds();
            geojson.geometry.coordinates.forEach(c => bounds.extend(c));
            map.fitBounds(bounds, { padding: 40 });

            // Add Hover Boxes (Popups) for Start/End
            if (!this.state.pathMarkers) this.state.pathMarkers = [];
            // Clear old ones first
            this.state.pathMarkers.forEach(m => m.remove());
            this.state.pathMarkers = [];

            const p1 = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'path-label-popup' })
                .setLngLat(start)
                .setHTML('<div style="background:#0f0f0f; color:#4aa8ff; padding:4px 8px; border-radius:4px; font-weight:bold; border:1px solid #3e86c9ff;">Start</div>')
                .addTo(map);

            const p2 = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'path-label-popup' })
                .setLngLat(end)
                .setHTML('<div style="background:#0f0f0f; color:#ff6b35; padding:4px 8px; border-radius:4px; font-weight:bold; border:1px solid #b54720e4;">End</div>')
                .addTo(map);

            this.state.pathMarkers.push(p1, p2);

        } else {
            // Remove Popups
            if (this.state.pathMarkers) {
                this.state.pathMarkers.forEach(m => m.remove());
                this.state.pathMarkers = [];
            }

            if (map.getLayer('drone-path-line')) {
                map.setLayoutProperty('drone-path-line', 'visibility', 'none');
                map.setLayoutProperty('drone-path-pts', 'visibility', 'none');
            }
        }
    },

    closeBottomPanel() {
        const bottomPanel = document.getElementById('bottom-panel');
        if (bottomPanel) {
            bottomPanel.style.bottom = '-100%'; // Slide down
        }
    },

    // Toggle Modal
    toggleVideoSize(maximize) {
        const modal = document.getElementById('video-modal');
        if (modal) {
            if (maximize) modal.classList.add('active');
            else modal.classList.remove('active');
        }
    },


};

window.DroneUI = UI;

// Init on load
window.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
