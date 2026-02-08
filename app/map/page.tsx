import type { Metadata } from "next"
import MapView from "./map-view"

export const metadata: Metadata = {
  title: "V-mark | Satellite Dashboard",
  description: "Real-time satellite telemetry and fire detection dashboard.",
}

export default function MapPage() {
  return <MapView />
}
