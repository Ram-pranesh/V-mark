import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "V-mark - Satellite Telemetry",
  description:
    "Satellite telemetry and fire detection system with drone operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
