import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const fleet = JSON.parse(readFileSync('data/fleet.json', 'utf-8')) as Array<{
  runId: string;
  line: string;
}>;

const clients = new Set<import('node:http').ServerResponse>();

// Realistische Schienenstrecken und Abstellpositionen für BY/BW
const railLines = {
  RE9: {
    // München - Nürnberg (BY)
    waypoints: [
      { lon: 11.5604, lat: 48.1408 }, // München Hbf
      { lon: 11.4619, lat: 48.1504 }, // München-Pasing
      { lon: 11.4214, lat: 48.1589 }, // München-Aubing
      { lon: 11.2547, lat: 48.1789 }, // Fürstenfeldbruck
      { lon: 11.0347, lat: 48.1189 }, // Geltendorf
      { lon: 10.8847, lat: 48.0489 }, // Landsberg (Lech)
      { lon: 10.8347, lat: 48.0889 }, // Kaufering
      { lon: 10.7247, lat: 48.0389 }, // Buchloe
      { lon: 10.6347, lat: 48.0589 }, // Türkheim (Bay)
      { lon: 10.1847, lat: 47.9889 }, // Memmingen
      { lon: 9.9847, lat: 48.3989 }, // Ulm Hbf
      { lon: 10.0847, lat: 48.8389 }, // Aalen
      { lon: 11.0847, lat: 49.4489 }, // Nürnberg Hbf
    ],
    depots: [
      { lon: 10.8569, lat: 48.4908, name: 'Depot Langweid' },
      { lon: 11.0847, lat: 49.4489, name: 'Abstellung Nürnberg' },
    ],
  },
  RE8: {
    // Stuttgart - Nürnberg (BW)
    waypoints: [
      { lon: 9.1833, lat: 48.7833 }, // Stuttgart Hbf
      { lon: 9.2167, lat: 48.8 }, // Stuttgart-Bad Cannstatt
      { lon: 9.3167, lat: 48.8333 }, // Waiblingen
      { lon: 9.5333, lat: 48.8167 }, // Schorndorf
      { lon: 9.8, lat: 48.8 }, // Schwäbisch Gmünd
      { lon: 10.0847, lat: 48.8389 }, // Aalen
      { lon: 10.1333, lat: 48.9667 }, // Ellwangen
      { lon: 10.0667, lat: 49.1333 }, // Crailsheim
      { lon: 10.5833, lat: 49.3 }, // Ansbach
      { lon: 11.0847, lat: 49.4489 }, // Nürnberg Hbf
    ],
    depots: [
      { lon: 9.3072, lat: 48.8089, name: 'Depot Essingen' },
      { lon: 11.0847, lat: 49.4489, name: 'Abstellung Nürnberg' },
    ],
  },
  MEX16: {
    // München - Mühldorf (BY)
    waypoints: [
      { lon: 11.5604, lat: 48.1408 }, // München Hbf
      { lon: 11.4, lat: 48.1 }, // München-Ost
      { lon: 11.0, lat: 48.05 }, // Grafing
      { lon: 10.5, lat: 48.0 }, // Wasserburg
      { lon: 10.0, lat: 47.95 }, // Mühldorf
    ],
    depots: [
      { lon: 10.8569, lat: 48.4908, name: 'Depot Langweid' },
      { lon: 10.0, lat: 47.95, name: 'Abstellung Mühldorf' },
    ],
  },
};

// Zugzustände mit realistischen Positionen
const trainStates = new Map<
  string,
  {
    isMoving: boolean;
    currentWaypointIndex: number;
    progress: number; // 0-1 zwischen Wegpunkten
    speed: number;
    lastUpdate: number;
    line: string;
    status: 'active' | 'maintenance' | 'stationary';
  }
>();

// Initialisiere Zugzustände
fleet.forEach((train, index) => {
  const line = railLines[train.line as keyof typeof railLines];
  if (!line) return;

  const isMoving = index < 7; // 7 Züge fahren, 3 stehen
  const status = index < 7 ? 'active' : index < 9 ? 'maintenance' : 'stationary';

  let currentWaypointIndex = 0;
  let progress = 0;

  if (!isMoving) {
    // Stationäre Züge in Depots oder Abstellungen
    const depotIndex = index % line.depots.length;
    const depot = line.depots[depotIndex];
    currentWaypointIndex = 0;
    progress = 0;
  }

  trainStates.set(train.runId, {
    isMoving,
    currentWaypointIndex,
    progress,
    speed: isMoving ? 80 + Math.random() * 40 : 0,
    lastUpdate: Date.now(),
    line: train.line,
    status,
  });
});

const server = createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  res.writeHead(200);
  res.end('OK');
});

server.listen(5001, () => console.log('Sim SSE on :5001'));

// Hilfsfunktion für lineare Interpolation zwischen Wegpunkten
function interpolatePosition(
  wp1: { lon: number; lat: number },
  wp2: { lon: number; lat: number },
  progress: number
) {
  return {
    lon: wp1.lon + (wp2.lon - wp1.lon) * progress,
    lat: wp1.lat + (wp2.lat - wp1.lat) * progress,
  };
}

setInterval(() => {
  const now = Date.now();

  for (const c of clients) {
    for (const t of fleet) {
      const state = trainStates.get(t.runId);
      if (!state) continue;

      const line = railLines[state.line as keyof typeof railLines];
      if (!line) continue;

      let lon, lat, speed;

      if (state.isMoving && state.status === 'active') {
        // Bewegende Züge entlang der Schienenstrecke
        const timeDiff = (now - state.lastUpdate) / 1000; // Sekunden
        const distance = (state.speed / 3600) * timeDiff * 0.01; // Konvertiere km/h zu Grad

        // Fortschritt zwischen Wegpunkten
        state.progress += distance / 0.1; // 0.1 Grad zwischen Wegpunkten

        if (state.progress >= 1) {
          // Nächster Wegpunkt erreicht
          state.currentWaypointIndex = (state.currentWaypointIndex + 1) % line.waypoints.length;
          state.progress = 0;
        }

        const wp1 = line.waypoints[state.currentWaypointIndex];
        const wp2 = line.waypoints[(state.currentWaypointIndex + 1) % line.waypoints.length];

        const pos = interpolatePosition(wp1, wp2, state.progress);
        lon = pos.lon;
        lat = pos.lat;

        // Realistische Geschwindigkeit (0-160 km/h)
        speed = Math.max(0, Math.min(160, 60 + Math.random() * 100));
        state.speed = speed;
      } else {
        // Stationäre Züge in Depots/Abstellungen
        const depotIndex = Math.floor(Math.random() * line.depots.length);
        const depot = line.depots[depotIndex];
        lon = depot.lon + (Math.random() - 0.5) * 0.01; // Kleine Abweichung
        lat = depot.lat + (Math.random() - 0.5) * 0.01;
        speed = 0;
      }

      state.lastUpdate = now;

      const payload = {
        type: 'location',
        runId: t.runId,
        line: t.line,
        ts: now,
        lon: Math.round(lon * 1000000) / 1000000,
        lat: Math.round(lat * 1000000) / 1000000,
        speed: Math.round(speed),
        status: state.status,
      };

      c.write(`event: location\n`);
      c.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }
}, 2000); // 2 Sekunden Intervall für gleichmäßigere Bewegung
