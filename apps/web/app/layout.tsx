import "../styles/globals.css";
import "../styles/eucorail.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { ReactNode } from "react";
import ReactQueryProvider from "./providers/query-client";
import ThemeToggle from "../components/ThemeToggle";
import { AppNav } from "../components/modern/AppNav";

export const metadata = {
  title: "Eucorail FleetOps Demo",
  description: "Simulierte Positions- und Zustandsdaten – keine operativen Informationen"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const isTest = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  return (
    <html lang="de">
      <body className={`${isTest ? 'no-anim' : ''} h-screen w-screen overflow-hidden bg-[#0B1F2A] text-white`}>
        <ReactQueryProvider>
          <div className="h-screen w-screen grid" style={{ gridTemplateColumns: '240px 1fr' }}>
            <AppNav />
            <div className="h-full overflow-hidden">
              {children}
            </div>
          </div>
          <ThemeToggle />
        </ReactQueryProvider>
      </body>
    </html>
  );
}

