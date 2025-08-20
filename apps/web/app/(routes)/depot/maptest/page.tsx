import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Depot Map Test',
  description: 'Simple working map test'
};

// Pure HTML server component - no client JS needed
export default function MapTestPage() {
  return (
    <div className="h-screen bg-gray-900 text-white">
      <div className="p-4 bg-gray-800">
        <h1 className="text-2xl font-bold">Depot Map Test - Pure HTML</h1>
      </div>
      
      <div className="p-4">
        <p className="mb-4">This is a simple test to verify deployment works.</p>
        
        <div className="bg-gray-800 p-4 rounded mb-4">
          <h2 className="text-xl mb-2">Depot Essingen</h2>
          <ul>
            <li>📍 Location: 48.7995, 10.0000</li>
            <li>🚂 Trains: 4</li>
            <li>📊 Tracks: 4</li>
          </ul>
        </div>
        
        <div className="w-full h-96 bg-gray-700 rounded overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            src="https://www.openstreetmap.org/export/embed.html?bbox=9.99,48.795,10.01,48.805&layer=mapnik"
            title="Depot Essingen Map"
          />
        </div>
      </div>
    </div>
  );
}
