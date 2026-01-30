
// Mock Data for Drone System (Refactored for Unique Drones per Dock)

const DRONE_DB = {
    forests: {
        "tn_forest": {
            name: "Tamil Nadu Forest Dept",
            location: "Satyamangalam Tiger Reserve",
            acres: "346,000",
            coordinates: [
                [77.0000, 11.7000], [77.1500, 11.7000], [77.2500, 11.6000],
                [77.2000, 11.4500], [77.0500, 11.4000], [76.9000, 11.5000],
                [76.9500, 11.6000], [77.0000, 11.7000]
            ],
            center: [77.08, 11.55],
            hotspots: { total: 12, severity: { high: 2, medium: 4, low: 6 } },
            docks: [{ id: "TN-HQ", location: "Panagal Maaligai (HQ)" }, { id: "TN-RO", location: "Erode Forest Office" }]
        },
        "ka_forest": {
            name: "Karnataka Forest Dept",
            location: "Bandipur National Park",
            acres: "215,000",
            coordinates: [
                [76.2000, 11.8000], [76.4500, 11.8000], [76.5500, 11.6500],
                [76.5000, 11.5500], [76.3500, 11.5500], [76.2500, 11.6000],
                [76.1500, 11.7000], [76.2000, 11.8000]
            ],
            center: [76.35, 11.68],
            hotspots: { total: 8, severity: { high: 1, medium: 2, low: 5 } },
            docks: [{ id: "KA-HQ", location: "Aranya Bhavan BLR" }, { id: "KA-RO", location: "Mysore Tiger Office" }]
        },
        "tg_forest": {
            name: "Telangana Forest Dept (Amrabad)",
            location: "Amrabad Tiger Reserve",
            acres: "647,000",
            coordinates: [
                [78.40, 16.30], [78.85, 16.30], [78.90, 16.00],
                [78.70, 15.80], [78.30, 15.80], [78.20, 16.00],
                [78.40, 16.30]
            ],
            center: [78.60, 16.05],
            hotspots: { total: 18, severity: { high: 5, medium: 7, low: 6 } },
            docks: [{ id: "TG-AM-01", location: "Mannanur Base" }, { id: "TG-AM-02", location: "Domalapenta Outpost" }]
        },
        "ap_forest": {
            name: "Andhra Pradesh Forest (Nagarjun)",
            location: "Nagarjunsagar Srisailam",
            acres: "815,000",
            coordinates: [
                [79.05, 16.60], [79.60, 16.60], [79.70, 16.10],
                [79.40, 15.90], [79.10, 16.00], [79.05, 16.60]
            ],
            center: [79.35, 16.30],
            hotspots: { total: 22, severity: { high: 8, medium: 8, low: 6 } },
            docks: [{ id: "AP-NS-01", location: "Srisailam Dam View" }, { id: "AP-NS-02", location: "Sunnipenta Checkpost" }]
        },
        "tg_kawal": {
            name: "Kawal Tiger Reserve",
            location: "Jannaram, Telangana",
            acres: "221,000",
            coordinates: [
                [78.90, 19.30], [79.30, 19.30], [79.40, 19.10],
                [79.10, 18.90], [78.80, 19.10], [78.90, 19.30]
            ],
            center: [79.10, 19.10],
            hotspots: { total: 7, severity: { high: 1, medium: 3, low: 3 } },
            docks: [{ id: "TG-KW-01", location: "Jannaram Division" }]
        },
        "mp_forest": {
            name: "Madhya Pradesh Forest Dept",
            location: "Kanha Tiger Reserve",
            acres: "232,000",
            coordinates: [
                [80.5000, 22.4500], [80.7500, 22.4500], [80.9000, 22.3000],
                [80.8500, 22.1500], [80.6000, 22.1500], [80.4500, 22.2500],
                [80.5000, 22.4500]
            ],
            center: [80.65, 22.30],
            hotspots: { total: 15, severity: { high: 4, medium: 5, low: 6 } },
            docks: [{ id: "MP-HQ", location: "Satpura Bhawan Bhopal" }]
        },
        "mh_forest": {
            name: "Maharashtra Forest Dept",
            location: "Tadoba Andhari Reserve",
            acres: "154,000",
            coordinates: [
                [79.2000, 20.3500], [79.4000, 20.3500], [79.4500, 20.2000],
                [79.3500, 20.1000], [79.2500, 20.1500], [79.1500, 20.2500],
                [79.2000, 20.3500]
            ],
            center: [79.30, 20.22],
            hotspots: { total: 5, severity: { high: 0, medium: 2, low: 3 } },
            docks: [{ id: "MH-HQ", location: "Van Bhavan Nagpur" }]
        },
        "or_forest": {
            name: "Odisha Forest Dept",
            location: "Simlipal National Park",
            acres: "679,000",
            coordinates: [
                [86.2000, 22.1000], [86.5000, 22.1000], [86.6000, 21.9000],
                [86.5500, 21.7500], [86.3000, 21.7500], [86.1500, 21.9000],
                [86.2000, 22.1000]
            ],
            center: [86.35, 21.90],
            hotspots: { total: 18, severity: { high: 5, medium: 6, low: 7 } },
            docks: [{ id: "OR-HQ", location: "Aranya Bhavan BBSR" }]
        },
        "cg_forest": {
            name: "Chhattisgarh Forest Dept",
            location: "Indravati Tiger Reserve",
            acres: "691,000",
            coordinates: [
                [80.25, 19.10], [80.60, 19.10], [80.70, 18.90],
                [80.55, 18.75], [80.30, 18.75], [80.15, 18.90],
                [80.25, 19.10]
            ],
            center: [80.40, 18.90],
            hotspots: { total: 24, severity: { high: 8, medium: 10, low: 6 } },
            docks: [{ id: "CG-HQ", location: "Aranya Bhavan Raipur" }, { id: "CG-Z1", location: "Bijapur Zone Ops" }]
        },

        // --- NEW ADDITIONS (North, East, West, South) ---

        "as_kaziranga": {
            name: "Kaziranga National Park",
            location: "Golaghat, Assam",
            acres: "109,000",
            coordinates: [
                [93.0500, 26.5000], [93.4000, 26.5000], [93.6000, 26.6500],
                [93.6500, 26.8000], [93.3500, 26.8500], [93.1000, 26.7500],
                [92.9500, 26.6000], [93.0500, 26.5000]
            ],
            center: [93.17, 26.58],
            hotspots: { total: 4, severity: { high: 1, medium: 1, low: 2 } },
            docks: [{ id: "AS-KAZ-01", location: "Kohora Range Office" }, { id: "AS-KAZ-02", location: "Bagori Range" }]
        },

        "wb_sundarbans": {
            name: "Sundarbans National Park",
            location: "South 24 Parganas, West Bengal",
            acres: "328,000",
            coordinates: [
                [88.5000, 21.5000], [89.0000, 21.5000], [89.1000, 22.0000],
                [88.8500, 22.1500], [88.6000, 22.1000], [88.4000, 21.8000],
                [88.5000, 21.5000]
            ],
            center: [88.75, 21.85],
            hotspots: { total: 2, severity: { high: 0, medium: 1, low: 1 } },
            docks: [{ id: "WB-SUN-01", location: "Sajnekhali Watch Tower" }]
        },

        "kl_periyar": {
            name: "Periyar Tiger Reserve",
            location: "Thekkady, Kerala",
            acres: "228,000",
            coordinates: [
                [77.0000, 9.4000], [77.3500, 9.4000], [77.4000, 9.6000],
                [77.2500, 9.7500], [77.0500, 9.7000], [76.9500, 9.5500],
                [77.0000, 9.4000]
            ],
            center: [77.15, 9.46],
            hotspots: { total: 6, severity: { high: 0, medium: 2, low: 4 } },
            docks: [{ id: "KL-PER-01", location: "Thekkady Boat Landing" }]
        },

        "rj_ranthambore": {
            name: "Ranthambore National Park",
            location: "Sawai Madhopur, Rajasthan",
            acres: "328,000",
            coordinates: [
                [76.3000, 25.8500], [76.5500, 25.8500], [76.6500, 26.1000],
                [76.5000, 26.2500], [76.2500, 26.1500], [76.2000, 26.0000],
                [76.3000, 25.8500]
            ],
            center: [76.50, 26.01],
            hotspots: { total: 9, severity: { high: 2, medium: 3, low: 4 } },
            docks: [{ id: "RJ-RAN-01", location: "Jhoomar Baori Gate" }]
        },

        "gj_gir": {
            name: "Gir National Park",
            location: "Junagadh, Gujarat",
            acres: "350,000",
            coordinates: [
                [70.7500, 21.0000], [71.1500, 21.0000], [71.2500, 21.2500],
                [70.9000, 21.3500], [70.6500, 21.2000], [70.7500, 21.0000]
            ],
            center: [70.80, 21.12],
            hotspots: { total: 11, severity: { high: 3, medium: 5, low: 3 } },
            docks: [{ id: "GJ-GIR-01", location: "Sasan Gir HQ" }]
        },

        "ut_corbett": {
            name: "Jim Corbett National Park",
            location: "Nainital, Uttarakhand",
            acres: "128,000",
            coordinates: [
                [78.7000, 29.4000], [79.0500, 29.4000], [79.1500, 29.6500],
                [78.8500, 29.7500], [78.6000, 29.6000], [78.7000, 29.4000]
            ],
            center: [78.77, 29.53],
            hotspots: { total: 3, severity: { high: 0, medium: 1, low: 2 } },
            docks: [{ id: "UT-COR-01", location: "Dhikala Zone" }]
        },

        "mp_panna": {
            name: "Panna Tiger Reserve",
            location: "Panna, Madhya Pradesh",
            acres: "133,000",
            coordinates: [
                [79.8000, 24.5000], [80.1500, 24.5000], [80.2000, 24.7500],
                [79.9500, 24.8500], [79.7500, 24.7000], [79.8000, 24.5000]
            ],
            center: [80.05, 24.63],
            hotspots: { total: 5, severity: { high: 1, medium: 2, low: 2 } },
            docks: [{ id: "MP-PAN-01", location: "Madla Gate" }]
        },

        "ka_nagarhole": {
            name: "Nagarhole National Park",
            location: "Kodagu, Karnataka",
            acres: "159,000",
            coordinates: [
                [76.0000, 11.8500], [76.2500, 11.8500], [76.3000, 12.1500],
                [76.1000, 12.2000], [75.9000, 12.0500], [76.0000, 11.8500]
            ],
            center: [76.12, 12.03],
            hotspots: { total: 7, severity: { high: 1, medium: 3, low: 3 } },
            docks: [{ id: "KA-NAG-01", location: "Veeranahosahalli Gate" }]
        },

        "mh_pench": {
            name: "Pench Tiger Reserve",
            location: "Seoni, MP/Maharashtra",
            acres: "192,000",
            coordinates: [
                [79.1000, 21.5000], [79.3500, 21.5000], [79.4000, 21.8000],
                [79.2000, 21.9000], [79.0000, 21.7500], [79.1000, 21.5000]
            ],
            center: [79.25, 21.68],
            hotspots: { total: 4, severity: { high: 0, medium: 2, low: 2 } },
            docks: [{ id: "MH-PEN-01", location: "Turia Gate" }]
        },

        "tn_anamalai": {
            name: "Anamalai Tiger Reserve",
            location: "Coimbatore, Tamil Nadu",
            acres: "236,000",
            coordinates: [
                [76.8000, 10.3000], [77.2000, 10.3000], [77.2500, 10.6000],
                [76.9500, 10.6500], [76.7500, 10.5000], [76.8000, 10.3000]
            ],
            center: [76.97, 10.45],
            hotspots: { total: 8, severity: { high: 2, medium: 2, low: 4 } },
            docks: [{ id: "TN-ANA-01", location: "Top Slip Reception" }]
        }
    },

    // Dynamic Maps (populated below)
    docks: {},
    drones: {}
};

// IMPROVED generateDrones function using Turf.js for strict geospatial accuracy
const generateDrones = () => {
    Object.keys(DRONE_DB.forests).forEach(forestKey => {
        const forest = DRONE_DB.forests[forestKey];
        if (!forest.docks || forest.docks.length === 0) return;

        // Create a Turf Polygon from the forest coordinates
        // Ensure the polygon is closed (first and last points match)
        let polyCoords = [...forest.coordinates];
        if (polyCoords[0][0] !== polyCoords[polyCoords.length - 1][0] || polyCoords[0][1] !== polyCoords[polyCoords.length - 1][1]) {
            polyCoords.push(polyCoords[0]);
        }
        const forestPoly = turf.polygon([polyCoords]);

        // Get bounding box for the specific forest to limit random search
        const bbox = turf.bbox(forestPoly);

        forest.docks.forEach(dock => {
            const droneCount = Math.floor(Math.random() * 3) + 3; // 3-5 drones
            const dockDrones = [];

            // Parse IDs
            const parts = dock.id.split('-');
            const regionPrefix = parts[0] || "GEN";
            const dockSuffix = parts[1] || "DK";

            for (let i = 1; i <= droneCount; i++) {
                const droneId = `${regionPrefix}-${dockSuffix}-0${i}`;

                // 1. Generate Valid Start Point (Strictly inside Forest)
                // We try 10 times to find a point inside; fallback to center if fails
                let startPt = turf.point(forest.center);
                let foundStart = false;
                for (let k = 0; k < 10; k++) {
                    const randomPt = turf.randomPoint(1, { bbox: bbox }).features[0];
                    if (turf.booleanPointInPolygon(randomPt, forestPoly)) {
                        startPt = randomPt;
                        foundStart = true;
                        break;
                    }
                }
                const startLng = startPt.geometry.coordinates[0];
                const startLat = startPt.geometry.coordinates[1];

                // 2. Generate Valid End Point (Distance 5-12km, Inside Forest)
                let endPt = startPt;
                for (let k = 0; k < 15; k++) {
                    // Create a random bearing and distance (5-12km)
                    const dist = Math.random() * 7 + 5;
                    const bearing = Math.random() * 360 - 180;
                    const dest = turf.destination(startPt, dist, bearing, { units: 'kilometers' });

                    if (turf.booleanPointInPolygon(dest, forestPoly)) {
                        endPt = dest;
                        break;
                    }
                }
                const endLng = endPt.geometry.coordinates[0];
                const endLat = endPt.geometry.coordinates[1];

                // Telemetry Data
                const speed = Math.floor(Math.random() * 20) + 30; // 30-50 km/h
                const alt = Math.floor(Math.random() * 60) + 42;
                const batt = Math.floor(Math.random() * 60) + 40;
                const distVal = turf.distance(startPt, endPt, { units: 'kilometers' });
                const timeVal = (distVal / speed) * 60;

                const isHotspotFound = Math.random() > 0.8; // Lower probability for realism
                const temp = isHotspotFound ? (Math.floor(Math.random() * 200) + 400) + '°C' : (Math.floor(Math.random() * 10) + 25) + '°C';

                const droneData = {
                    id: droneId,
                    batt: batt,
                    status: batt < 20 ? "Returning" : "Active",
                    telemetry: {
                        speed: speed,
                        alt: alt,
                        lat: startLat.toFixed(4),
                        lng: startLng.toFixed(4),
                        temp: temp,
                        confirmed_fire: isHotspotFound
                    },
                    trip: {
                        start: `${startLat.toFixed(4)}, ${startLng.toFixed(4)}`,
                        end: `${endLat.toFixed(4)}, ${endLng.toFixed(4)}`,
                        startCoords: [startLng, startLat],
                        endCoords: [endLng, endLat],
                        distance: distVal.toFixed(1) + " km",
                        air_time: Math.round(timeVal) + " min",
                        coverage_poly: []
                    }
                };

                dockDrones.push(droneData);
                DRONE_DB.drones[droneId] = droneData;
            }
            DRONE_DB.docks[dock.id] = dockDrones;
        });
    });
};

generateDrones();

window.DRONE_DB = DRONE_DB;

generateDrones();

window.DRONE_DB = DRONE_DB;
