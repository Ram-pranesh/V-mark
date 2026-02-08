/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/config", destination: "/api/config" },
      { source: "/firms/area", destination: "/api/firms/area" },
      { source: "/firms/area/processed", destination: "/api/firms/area/processed" },
      { source: "/firms/wms", destination: "/api/firms/wms" },
      { source: "/firms/wms/", destination: "/api/firms/wms" },
    ]
  },
}

export default nextConfig
