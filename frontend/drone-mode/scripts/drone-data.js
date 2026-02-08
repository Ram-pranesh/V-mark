// HIGH-FIDELITY DRONE DATASET - 16 INDIAN FOREST DIVISIONS
// STRICTLY RESTRICTED TO FOREST DEPARTMENT ADMINISTRATIVE BOUNDARIES

const DRONE_DB = {
    forests: {
        // --- SOUTH INDIA ---
        "tn_sathy": {
            name: "Tamil Nadu Forest Dept",
            location: "Satyamangalam Forest Division",
            state: "Tamil Nadu",
            terrain: "Hilly",
            acres: "346,000",
            center: [77.08, 11.55],
            coordinates: [
                [77.0000, 11.7000], [77.1500, 11.7000], [77.2500, 11.6000],
                [77.2000, 11.4500], [77.0500, 11.4000], [76.9000, 11.5000],
                [76.9500, 11.6000], [77.0000, 11.7000]
            ],
            // Focused sample set covering all severities (<10 inside region)
            hotspots: { total: 9, severity: { stage3: 1, stage2: 2, stage1: 1, medium: 3, low: 2 } },
            docks: [{ id: "TN-SAT-HR", location: "Hasanur Range Office" }, { id: "TN-SAT-TC", location: "Talamalai Checkpost" }]
        },
        "tn_nilgiris": {
            name: "Tamil Nadu Forest Dept",
            location: "Nilgiris North Forest Division",
            state: "Tamil Nadu",
            terrain: "Mountainous",
            acres: "185,000",
            center: [76.65, 11.50],
            coordinates: [
                [76.5000, 11.4000], [76.8000, 11.4000], [76.8500, 11.6000],
                [76.7000, 11.6500], [76.5500, 11.6000], [76.5000, 11.4000]
            ],
            hotspots: { total: 15, severity: { stage3: 1, stage2: 1, stage1: 2, medium: 4, low: 7 } },
            docks: [{ id: "TN-NIL-MR", location: "Mudumalai Reception (Range)" }]
        },
        "ka_bandipur": {
            name: "Karnataka Forest Dept",
            location: "Bandipur Forest Division",
            state: "Karnataka",
            terrain: "Dry Deciduous",
            acres: "215,000",
            center: [76.35, 11.68],
            coordinates: [
                [76.2000, 11.8000], [76.4500, 11.8000], [76.5500, 11.6500],
                [76.5000, 11.5500], [76.3500, 11.5500], [76.2500, 11.6000],
                [76.1500, 11.7000], [76.2000, 11.8000]
            ],
            hotspots: { total: 14, severity: { stage3: 0, stage2: 1, stage1: 3, medium: 4, low: 6 } },
            docks: [{ id: "KA-BAN-GR", location: "Gundlupet Range Office" }]
        },
        "ka_virajpet": {
            name: "Karnataka Forest Dept",
            location: "Virajpet Forest Division",
            state: "Karnataka",
            terrain: "Dense Rainforest",
            acres: "160,000",
            center: [75.80, 12.10],
            coordinates: [
                [75.7000, 12.0000], [75.9500, 12.0000], [76.0000, 12.2000],
                [75.8500, 12.3000], [75.6500, 12.1500], [75.7000, 12.0000]
            ],
            hotspots: { total: 12, severity: { stage3: 0, stage2: 1, stage1: 2, medium: 3, low: 6 } },
            docks: [{ id: "KA-VIR-TR", location: "Thithimathi Range" }]
        },
        "kl_vazhachal": {
            name: "Kerala Forest Dept",
            location: "Vazhachal Forest Division",
            state: "Kerala",
            terrain: "Evergreen",
            acres: "198,000",
            center: [76.55, 10.30],
            coordinates: [
                [76.4000, 10.2000], [76.7000, 10.2000], [76.7500, 10.4500],
                [76.5000, 10.5000], [76.3500, 10.3500], [76.4000, 10.2000]
            ],
            hotspots: { total: 16, severity: { stage3: 0, stage2: 2, stage1: 3, medium: 4, low: 7 } },
            docks: [{ id: "KL-VAZ-AR", location: "Athirapally Range Office" }]
        },
        "ap_nagarjun": {
            name: "Andhra Pradesh Forest Dept",
            location: "Nagarjunsagar Forest Division",
            state: "Andhra Pradesh",
            terrain: "Scrub Jungle",
            acres: "815,000",
            center: [79.35, 16.30],
            coordinates: [
                [79.05, 16.60], [79.60, 16.60], [79.70, 16.10],
                [79.40, 15.90], [79.10, 16.00], [79.05, 16.60]
            ],
            hotspots: { total: 17, severity: { stage3: 1, stage2: 2, stage1: 3, medium: 4, low: 7 } },
            docks: [{ id: "AP-NAG-MD", location: "Markapur Div. HQ" }]
        },
        "tg_amrabad": {
            name: "Telangana Forest Dept",
            location: "Amrabad Forest Division",
            state: "Telangana",
            terrain: "Plateau",
            acres: "647,000",
            center: [78.60, 16.05],
            coordinates: [
                [78.40, 16.30], [78.85, 16.30], [78.90, 16.00],
                [78.70, 15.80], [78.30, 15.80], [78.20, 16.00],
                [78.40, 16.30]
            ],
            hotspots: { total: 13, severity: { stage3: 0, stage2: 1, stage1: 2, medium: 4, low: 6 } },
            docks: [{ id: "TG-AMR-AR", location: "Achampet Range Office" }]
        },

        // --- CENTRAL & WEST INDIA ---
        "mh_tadoba": {
            name: "Maharashtra Forest Dept",
            location: "Tadoba Forest Division",
            state: "Maharashtra",
            terrain: "Dry Deciduous",
            acres: "154,000",
            center: [79.30, 20.22],
            coordinates: [
                [79.2000, 20.3500], [79.4000, 20.3500], [79.4500, 20.2000],
                [79.3500, 20.1000], [79.2500, 20.1500], [79.1500, 20.2500],
                [79.2000, 20.3500]
            ],
            hotspots: { total: 14, severity: { stage3: 0, stage2: 1, stage1: 3, medium: 4, low: 6 } },
            docks: [{ id: "MH-TAD-MR", location: "Moharli Range Office" }]
        },
        "mp_kanha": {
            name: "Madhya Pradesh Forest Dept",
            location: "Kanha Forest Division",
            state: "Madhya Pradesh",
            terrain: "Sal Forest",
            acres: "232,000",
            center: [80.65, 22.30],
            coordinates: [
                [80.5000, 22.4500], [80.7500, 22.4500], [80.9000, 22.3000],
                [80.8500, 22.1500], [80.6000, 22.1500], [80.4500, 22.2500],
                [80.5000, 22.4500]
            ],
            hotspots: { total: 18, severity: { stage3: 1, stage2: 2, stage1: 3, medium: 5, low: 7 } },
            docks: [{ id: "MP-KAN-MD", location: "Mandla Div. HQ" }]
        },
        "cg_indravati": {
            name: "Chhattisgarh Forest Dept",
            location: "Indravati Forest Division",
            state: "Chhattisgarh",
            terrain: "Dense Jungle",
            acres: "691,000",
            center: [80.40, 18.90],
            coordinates: [
                [80.25, 19.10], [80.60, 19.10], [80.70, 18.90],
                [80.55, 18.75], [80.30, 18.75], [80.15, 18.90],
                [80.25, 19.10]
            ],
            hotspots: { total: 16, severity: { stage3: 1, stage2: 2, stage1: 3, medium: 4, low: 6 } },
            docks: [{ id: "CG-IND-BD", location: "Bijapur Div. Office" }]
        },
        "gj_junagadh": {
            name: "Gujarat Forest Dept",
            location: "Junagadh Forest Division",
            state: "Gujarat",
            terrain: "Dry Scrub",
            acres: "350,000",
            center: [70.80, 21.12],
            coordinates: [
                [70.7500, 21.0000], [71.1500, 21.0000], [71.2500, 21.2500],
                [70.9000, 21.3500], [70.6500, 21.2000], [70.7500, 21.0000]
            ],
            hotspots: { total: 12, severity: { stage3: 0, stage2: 1, stage1: 2, medium: 3, low: 6 } },
            docks: [{ id: "GJ-JUN-SR", location: "Sasan Range Office" }]
        },
        "rj_sawaimadhopur": {
            name: "Rajasthan Forest Dept",
            location: "Sawai Madhopur Forest Division",
            state: "Rajasthan",
            terrain: "Arid/Rocky",
            acres: "328,000",
            center: [76.50, 26.01],
            coordinates: [
                [76.3000, 25.8500], [76.5500, 25.8500], [76.6500, 26.1000],
                [76.5000, 26.2500], [76.2500, 26.1500], [76.2000, 26.0000],
                [76.3000, 25.8500]
            ],
            hotspots: { total: 15, severity: { stage3: 1, stage2: 1, stage1: 2, medium: 4, low: 7 } },
            docks: [{ id: "RJ-SWM-RR", location: "Ranthambore Road Office" }]
        },

        // --- EAST & NORTH INDIA ---
        "or_simlipal": {
            name: "Odisha Forest Dept",
            location: "Simlipal Forest Division",
            state: "Odisha",
            terrain: "Plateau/Forest",
            acres: "679,000",
            center: [86.35, 21.90],
            coordinates: [
                [86.2000, 22.1000], [86.5000, 22.1000], [86.6000, 21.9000],
                [86.5500, 21.7500], [86.3000, 21.7500], [86.1500, 21.9000],
                [86.2000, 22.1000]
            ],
            hotspots: { total: 16, severity: { stage3: 1, stage2: 2, stage1: 3, medium: 4, low: 6 } },
            docks: [{ id: "OR-SIM-BD", location: "Baripada Div. HQ" }]
        },
        "wb_24parganas": {
            name: "West Bengal Forest Dept",
            location: "24 Parganas (South) Division",
            state: "West Bengal",
            terrain: "Mangrove Delta",
            acres: "328,000",
            center: [88.75, 21.85],
            coordinates: [
                [88.5000, 21.5000], [89.0000, 21.5000], [89.1000, 22.0000],
                [88.8500, 22.1500], [88.6000, 22.1000], [88.4000, 21.8000],
                [88.5000, 21.5000]
            ],
            hotspots: { total: 10, severity: { stage3: 0, stage2: 1, stage1: 1, medium: 3, low: 5 } },
            docks: [{ id: "WB-24P-CR", location: "Canning Range Office" }]
        },
        "as_golaghat": {
            name: "Assam Forest Dept",
            location: "Golaghat Forest Division",
            state: "Assam",
            terrain: "Grassland/Wetland",
            acres: "109,000",
            center: [93.35, 26.55],
            coordinates: [
                [93.1500, 26.4500], [93.5500, 26.4500], [93.6000, 26.6000],
                [93.4500, 26.6800], [93.2500, 26.6500], [93.1500, 26.4500]
            ],
            hotspots: { total: 14, severity: { stage3: 1, stage2: 1, stage1: 2, medium: 4, low: 6 } },
            docks: [{ id: "AS-GOL-BB", location: "Bokakhat Beat Office" }]
        },
        "ut_ramnagar": {
            name: "Uttarakhand Forest Dept",
            location: "Ramnagar Forest Division",
            state: "Uttarakhand",
            terrain: "Foothills",
            acres: "128,000",
            center: [79.10, 29.40],
            coordinates: [
                [78.9000, 29.3000], [79.2500, 29.3000], [79.3500, 29.5500],
                [79.1000, 29.6500], [78.8500, 29.5000], [78.9000, 29.3000]
            ],
            hotspots: { total: 11, severity: { stage3: 0, stage2: 1, stage1: 2, medium: 3, low: 5 } },
            docks: [{ id: "UT-RAM-RD", location: "Ramnagar Div. HQ" }]
        }
    },

    // Storage for Dynamic Generation
    docks: {},
    drones: {}
};


const generateHighFidelityDrones = () => {
    // Safety Check
    if (typeof turf === 'undefined') {
        console.error("CRITICAL: Turf.js not loaded. Drone paths will be inaccurate.");
        return;
    }

    Object.keys(DRONE_DB.forests).forEach(forestKey => {
        const forest = DRONE_DB.forests[forestKey];
        if (!forest.docks) return;

        // 1. Construct Turf Polygon for Validation
        let polyCoords = [...forest.coordinates];
        if (polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] || polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]) {
            polyCoords.push(polyCoords[0]);
        }
        const forestPoly = turf.polygon([polyCoords]);
        const bbox = turf.bbox(forestPoly); // Re-added for drone paths
        const centroid = turf.centroid(forestPoly);
        const centerCoords = centroid.geometry.coordinates;

        // --- Dock Distribution Logic ---
        const numDocks = forest.docks.length;
        // Radius for dock placement: ~20-30% from center to edge (rough estimate 0.05 degrees ~ 5km)
        const placementRadius = 0.04;

        forest.docks.forEach((dock, index) => {
            // Assign Coordinate if missing
            if (!dock.coordinates) {
                let dockPt;

                if (numDocks > 1) {
                    // Distribute evenly around center (e.g., 2 docks = 0 & 180 degrees)
                    const angle = (index * (360 / numDocks)) * (Math.PI / 180);
                    const dx = Math.cos(angle) * placementRadius;
                    const dy = Math.sin(angle) * placementRadius;

                    let candidate = turf.point([centerCoords[0] + dx, centerCoords[1] + dy]);

                    // Verify inside polygon
                    if (turf.booleanPointInPolygon(candidate, forestPoly)) {
                        dockPt = candidate;
                    } else {
                        // Fallback: Try closer to center
                        candidate = turf.point([centerCoords[0] + (dx * 0.5), centerCoords[1] + (dy * 0.5)]);
                        dockPt = turf.booleanPointInPolygon(candidate, forestPoly) ? candidate : centroid;
                    }
                } else {
                    // Single dock: Place at Centroid
                    dockPt = centroid;
                }

                dock.coordinates = dockPt.geometry.coordinates;
            }

            // Fixed number of drones per dock (5 drones)
            const droneCount = 5;
            const dockDrones = [];
            let chargingCount = 0;

            for (let i = 1; i <= droneCount; i++) {
                const droneId = `${dock.id}-${String(i).padStart(2, '0')}`;

                // Start/end fixed at dock
                const dockPoint = turf.point(dock.coordinates);

                // Build a looping path with two waypoints
                const makeLeg = (origin, minKm, maxKm) => {
                    for (let k = 0; k < 20; k++) {
                        const dist = Math.random() * (maxKm - minKm) + minKm;
                        const bearing = Math.random() * 360 - 180;
                        const dest = turf.destination(origin, dist, bearing, { units: 'kilometers' });
                        if (turf.booleanPointInPolygon(dest, forestPoly)) return dest;
                    }
                    return turf.point(forest.center);
                };

                const wp1 = makeLeg(dockPoint, 2, 5);
                const wp2 = makeLeg(wp1, 1.5, 4.5);

                const pathCoords = [
                    dockPoint.geometry.coordinates,
                    wp1.geometry.coordinates,
                    wp2.geometry.coordinates,
                    dockPoint.geometry.coordinates
                ];

                const pathLine = turf.lineString(pathCoords);
                const distKm = turf.length(pathLine, { units: 'kilometers' });
                const speed = Math.floor(Math.random() * 25) + 35;
                const airTimeMin = Math.round((distKm / speed) * 60);
                const batt = Math.floor(Math.random() * 50) + 40; // 40-90% battery

                // Fire Logic (15% chance)
                const fireDetected = Math.random() > 0.85;

                // --- STATE & VIDEO ---
                // 40% Chance of Charging, but strictly capped at 2 per dock
                let isCharging = false;
                if (chargingCount < 2) {
                    isCharging = Math.random() > 0.6;
                    if (droneId === 'TN-SAT-HR-03') isCharging = true; // User Request override behavior
                    if (isCharging) chargingCount++;
                }

                const status = isCharging ? "Charging" : (batt < 25 ? "Returning" : "Patrolling");

                // Assign Sequential Video (1-5) ensuring uniqueness per dock
                const vidId = ((i - 1) % 5) + 1;

                const dockCoords = dockPoint.geometry.coordinates;

                const droneObj = {
                    id: droneId,
                    batt: isCharging ? (Math.random() * 20 + 5) : batt,
                    status: status,
                    video_id: vidId,
                    telemetry: {
                        lat: dockCoords[1].toFixed(4),
                        lng: dockCoords[0].toFixed(4),
                        alt: isCharging ? "0" : (Math.random() * 40 + 80).toFixed(0),
                        speed: isCharging ? 0 : speed,
                        temp: fireDetected ? (400 + Math.random() * 100).toFixed(0) + "°C" : "32°C",
                        fire_event: isCharging ? false : fireDetected
                    },
                    trip: {
                        startCoords: dockCoords,
                        endCoords: dockCoords,
                        pathCoords,
                        distance: distKm.toFixed(2) + " km",
                        duration: airTimeMin + " min"
                    }
                };

                dockDrones.push(droneObj);
                DRONE_DB.drones[droneId] = droneObj;
            }
            DRONE_DB.docks[dock.id] = dockDrones;
        });
    });

    console.log("System Initialized: High-Fidelity Drone Paths Generated.");
};

// Execute
generateHighFidelityDrones();
window.DRONE_DB = DRONE_DB;
