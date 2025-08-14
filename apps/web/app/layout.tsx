import "../styles/globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { ReactNode } from "react";
import ReactQueryProvider from "./providers/query-client";

export const metadata = {
  title: "Eucorail FleetOps Demo",
  description: "Simulierte Positions- und Zustandsdaten – keine operativen Informationen"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body className="h-screen w-screen overflow-hidden bg-[#0B1F2A] text-white">
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}

