import "../styles/globals.css";
import "../styles/eucorail.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { ReactNode } from "react";
import ReactQueryProvider from "./providers/query-client";
import ThemeToggle from "../components/ThemeToggle";

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
          {children}
          <ThemeToggle />
        </ReactQueryProvider>
      </body>
    </html>
  );
}

