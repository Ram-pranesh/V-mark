// High-fidelity drone dataset - 16 Indian forest divisions
export interface DroneForest {
  name: string;
  location: string;
  state: string;
  terrain: string;
  acres: string;
  center: [number, number];
  coordinates: number[][];
  hotspots: { total: number; severity: { high: number; medium: number; low: number } };
  docks: { id: string; location: string }[];
}

export interface DroneTelemetry {
  id: string;
  batt: number;
  status: "Patrolling" | "Charging" | "Returning";
  videoId: number;
  telemetry: {
    lat: string;
    lng: string;
    alt: string;
    speed: number;
    temp: string;
    fireEvent: boolean;
  };
  trip: {
    startCoords: [number, number];
    endCoords: [number, number];
    distance: string;
    duration: string;
  };
}

export const FORESTS: Record<string, DroneForest> = {
  tn_sathy: {
    name: "Tamil Nadu Forest Dept",
    location: "Satyamangalam Forest Division",
    state: "Tamil Nadu",
    terrain: "Hilly",
    acres: "346,000",
    center: [77.08, 11.55],
    coordinates: [
      [77.0, 11.7], [77.15, 11.7], [77.25, 11.6], [77.2, 11.45],
      [77.05, 11.4], [76.9, 11.5], [76.95, 11.6], [77.0, 11.7],
    ],
    hotspots: { total: 6, severity: { high: 1, medium: 2, low: 3 } },
    docks: [
      { id: "TN-SAT-HR", location: "Hasanur Range Office" },
      { id: "TN-SAT-TC", location: "Talamalai Checkpost" },
    ],
  },
  tn_nilgiris: {
    name: "Tamil Nadu Forest Dept",
    location: "Nilgiris North Forest Division",
    state: "Tamil Nadu",
    terrain: "Mountainous",
    acres: "185,000",
    center: [76.65, 11.5],
    coordinates: [
      [76.5, 11.4], [76.8, 11.4], [76.85, 11.6], [76.7, 11.65],
      [76.55, 11.6], [76.5, 11.4],
    ],
    hotspots: { total: 5, severity: { high: 1, medium: 1, low: 3 } },
    docks: [{ id: "TN-NIL-MR", location: "Mudumalai Reception (Range)" }],
  },
  ka_bandipur: {
    name: "Karnataka Forest Dept",
    location: "Bandipur Forest Division",
    state: "Karnataka",
    terrain: "Dry Deciduous",
    acres: "215,000",
    center: [76.35, 11.68],
    coordinates: [
      [76.2, 11.8], [76.45, 11.8], [76.55, 11.65], [76.5, 11.55],
      [76.35, 11.55], [76.25, 11.6], [76.15, 11.7], [76.2, 11.8],
    ],
    hotspots: { total: 5, severity: { high: 0, medium: 2, low: 3 } },
    docks: [{ id: "KA-BAN-GR", location: "Gundlupet Range Office" }],
  },
  ka_virajpet: {
    name: "Karnataka Forest Dept",
    location: "Virajpet Forest Division",
    state: "Karnataka",
    terrain: "Dense Rainforest",
    acres: "160,000",
    center: [75.8, 12.1],
    coordinates: [
      [75.7, 12.0], [75.95, 12.0], [76.0, 12.2], [75.85, 12.3],
      [75.65, 12.15], [75.7, 12.0],
    ],
    hotspots: { total: 4, severity: { high: 0, medium: 2, low: 2 } },
    docks: [{ id: "KA-VIR-TR", location: "Thithimathi Range" }],
  },
  kl_vazhachal: {
    name: "Kerala Forest Dept",
    location: "Vazhachal Forest Division",
    state: "Kerala",
    terrain: "Evergreen",
    acres: "198,000",
    center: [76.55, 10.3],
    coordinates: [
      [76.4, 10.2], [76.7, 10.2], [76.75, 10.45], [76.5, 10.5],
      [76.35, 10.35], [76.4, 10.2],
    ],
    hotspots: { total: 6, severity: { high: 0, medium: 3, low: 3 } },
    docks: [{ id: "KL-VAZ-AR", location: "Athirapally Range Office" }],
  },
  ap_nagarjun: {
    name: "Andhra Pradesh Forest Dept",
    location: "Nagarjunsagar Forest Division",
    state: "Andhra Pradesh",
    terrain: "Scrub Jungle",
    acres: "815,000",
    center: [79.35, 16.3],
    coordinates: [
      [79.05, 16.6], [79.6, 16.6], [79.7, 16.1], [79.4, 15.9],
      [79.1, 16.0], [79.05, 16.6],
    ],
    hotspots: { total: 6, severity: { high: 1, medium: 2, low: 3 } },
    docks: [{ id: "AP-NAG-MD", location: "Markapur Div. HQ" }],
  },
  tg_amrabad: {
    name: "Telangana Forest Dept",
    location: "Amrabad Forest Division",
    state: "Telangana",
    terrain: "Plateau",
    acres: "647,000",
    center: [78.6, 16.05],
    coordinates: [
      [78.4, 16.3], [78.85, 16.3], [78.9, 16.0], [78.7, 15.8],
      [78.3, 15.8], [78.2, 16.0], [78.4, 16.3],
    ],
    hotspots: { total: 4, severity: { high: 0, medium: 2, low: 2 } },
    docks: [{ id: "TG-AMR-AR", location: "Achampet Range Office" }],
  },
  mh_tadoba: {
    name: "Maharashtra Forest Dept",
    location: "Tadoba Forest Division",
    state: "Maharashtra",
    terrain: "Dry Deciduous",
    acres: "154,000",
    center: [79.3, 20.22],
    coordinates: [
      [79.2, 20.35], [79.4, 20.35], [79.45, 20.2], [79.35, 20.1],
      [79.25, 20.15], [79.15, 20.25], [79.2, 20.35],
    ],
    hotspots: { total: 5, severity: { high: 0, medium: 2, low: 3 } },
    docks: [{ id: "MH-TAD-MR", location: "Moharli Range Office" }],
  },
  mp_kanha: {
    name: "Madhya Pradesh Forest Dept",
    location: "Kanha Forest Division",
    state: "Madhya Pradesh",
    terrain: "Sal Forest",
    acres: "232,000",
    center: [80.65, 22.3],
    coordinates: [
      [80.5, 22.45], [80.75, 22.45], [80.9, 22.3], [80.85, 22.15],
      [80.6, 22.15], [80.45, 22.25], [80.5, 22.45],
    ],
    hotspots: { total: 6, severity: { high: 1, medium: 2, low: 3 } },
    docks: [{ id: "MP-KAN-MD", location: "Mandla Div. HQ" }],
  },
  cg_indravati: {
    name: "Chhattisgarh Forest Dept",
    location: "Indravati Forest Division",
    state: "Chhattisgarh",
    terrain: "Dense Jungle",
    acres: "691,000",
    center: [80.4, 18.9],
    coordinates: [
      [80.25, 19.1], [80.6, 19.1], [80.7, 18.9], [80.55, 18.75],
      [80.3, 18.75], [80.15, 18.9], [80.25, 19.1],
    ],
    hotspots: { total: 5, severity: { high: 1, medium: 2, low: 2 } },
    docks: [{ id: "CG-IND-BD", location: "Bijapur Div. Office" }],
  },
  gj_junagadh: {
    name: "Gujarat Forest Dept",
    location: "Junagadh Forest Division",
    state: "Gujarat",
    terrain: "Dry Scrub",
    acres: "350,000",
    center: [70.8, 21.12],
    coordinates: [
      [70.75, 21.0], [71.15, 21.0], [71.25, 21.25], [70.9, 21.35],
      [70.65, 21.2], [70.75, 21.0],
    ],
    hotspots: { total: 4, severity: { high: 0, medium: 2, low: 2 } },
    docks: [{ id: "GJ-JUN-SR", location: "Sasan Range Office" }],
  },
  rj_sawaimadhopur: {
    name: "Rajasthan Forest Dept",
    location: "Sawai Madhopur Forest Division",
    state: "Rajasthan",
    terrain: "Arid/Rocky",
    acres: "328,000",
    center: [76.5, 26.01],
    coordinates: [
      [76.3, 25.85], [76.55, 25.85], [76.65, 26.1], [76.5, 26.25],
      [76.25, 26.15], [76.2, 26.0], [76.3, 25.85],
    ],
    hotspots: { total: 4, severity: { high: 1, medium: 1, low: 2 } },
    docks: [{ id: "RJ-SWM-RR", location: "Ranthambore Road Office" }],
  },
  or_simlipal: {
    name: "Odisha Forest Dept",
    location: "Simlipal Forest Division",
    state: "Odisha",
    terrain: "Plateau/Forest",
    acres: "679,000",
    center: [86.35, 21.9],
    coordinates: [
      [86.2, 22.1], [86.5, 22.1], [86.6, 21.9], [86.55, 21.75],
      [86.3, 21.75], [86.15, 21.9], [86.2, 22.1],
    ],
    hotspots: { total: 5, severity: { high: 1, medium: 2, low: 2 } },
    docks: [{ id: "OR-SIM-BD", location: "Baripada Div. HQ" }],
  },
  wb_24parganas: {
    name: "West Bengal Forest Dept",
    location: "24 Parganas (South) Division",
    state: "West Bengal",
    terrain: "Mangrove Delta",
    acres: "328,000",
    center: [88.75, 21.85],
    coordinates: [
      [88.5, 21.5], [89.0, 21.5], [89.1, 22.0], [88.85, 22.15],
      [88.6, 22.1], [88.4, 21.8], [88.5, 21.5],
    ],
    hotspots: { total: 2, severity: { high: 0, medium: 1, low: 1 } },
    docks: [{ id: "WB-24P-CR", location: "Canning Range Office" }],
  },
  as_golaghat: {
    name: "Assam Forest Dept",
    location: "Golaghat Forest Division",
    state: "Assam",
    terrain: "Grassland/Wetland",
    acres: "109,000",
    center: [93.35, 26.55],
    coordinates: [
      [93.15, 26.45], [93.55, 26.45], [93.6, 26.6], [93.45, 26.68],
      [93.25, 26.65], [93.15, 26.45],
    ],
    hotspots: { total: 3, severity: { high: 1, medium: 1, low: 1 } },
    docks: [{ id: "AS-GOL-BB", location: "Bokakhat Beat Office" }],
  },
  ut_ramnagar: {
    name: "Uttarakhand Forest Dept",
    location: "Ramnagar Forest Division",
    state: "Uttarakhand",
    terrain: "Foothills",
    acres: "128,000",
    center: [79.1, 29.4],
    coordinates: [
      [78.9, 29.3], [79.25, 29.3], [79.35, 29.55], [79.1, 29.65],
      [78.85, 29.5], [78.9, 29.3],
    ],
    hotspots: { total: 3, severity: { high: 0, medium: 1, low: 2 } },
    docks: [{ id: "UT-RAM-RD", location: "Ramnagar Div. HQ" }],
  },
};

// Generate deterministic drone data for a dock
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateDronesForDock(
  dockId: string,
  forest: DroneForest
): DroneTelemetry[] {
  const drones: DroneTelemetry[] = [];
  const seed = dockId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);
  let chargingCount = 0;

  for (let i = 1; i <= 5; i++) {
    const droneId = `${dockId}-${String(i).padStart(2, "0")}`;
    const batt = Math.floor(rng() * 50 + 40);
    const speed = Math.floor(rng() * 25 + 35);
    const fireDetected = rng() > 0.85;

    let isCharging = false;
    if (chargingCount < 2 && rng() > 0.6) {
      isCharging = true;
      chargingCount++;
    }

    const status: DroneTelemetry["status"] = isCharging
      ? "Charging"
      : batt < 25
      ? "Returning"
      : "Patrolling";

    // Generate start/end coords within forest bounds
    const cx = forest.center[0];
    const cy = forest.center[1];
    const sLng = cx + (rng() - 0.5) * 0.1;
    const sLat = cy + (rng() - 0.5) * 0.1;
    const eLng = cx + (rng() - 0.5) * 0.15;
    const eLat = cy + (rng() - 0.5) * 0.15;
    const distKm = Math.sqrt(
      Math.pow((eLng - sLng) * 111, 2) + Math.pow((eLat - sLat) * 111, 2)
    );
    const airTimeMin = Math.round((distKm / speed) * 60);

    drones.push({
      id: droneId,
      batt: isCharging ? Math.floor(rng() * 20 + 5) : batt,
      status,
      videoId: ((i - 1) % 5) + 1,
      telemetry: {
        lat: sLat.toFixed(4),
        lng: sLng.toFixed(4),
        alt: isCharging ? "0" : String(Math.floor(rng() * 40 + 80)),
        speed: isCharging ? 0 : speed,
        temp: fireDetected
          ? `${(400 + rng() * 100).toFixed(0)}C`
          : "32C",
        fireEvent: isCharging ? false : fireDetected,
      },
      trip: {
        startCoords: [sLng, sLat],
        endCoords: [eLng, eLat],
        distance: `${distKm.toFixed(2)} km`,
        duration: `${airTimeMin} min`,
      },
    });
  }
  return drones;
}
