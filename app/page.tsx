export default function Home() {
  console.log("[v0] Home page rendered");
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0a0a0f" }}>
      <h1 className="text-4xl font-bold" style={{ color: "#e8e8ed" }}>V-mark - Satellite Telemetry Platform</h1>
    </div>
  );
}
