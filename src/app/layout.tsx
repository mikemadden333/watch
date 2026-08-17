import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import FirstRunNotice from "@/components/FirstRunNotice";

export const metadata: Metadata = {
  title: "Watch — Safety intelligence for K-12 school networks",
  description:
    "Real-time campus-safety intelligence. Decision support, not dispatch. Madden Education Advisory, LLC.",
};

export const viewport: Viewport = {
  themeColor: "#1b2331",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <FirstRunNotice />
      </body>
    </html>
  );
}
