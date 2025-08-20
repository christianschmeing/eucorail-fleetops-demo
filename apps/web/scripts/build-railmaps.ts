/*
  Railmap builder (Overpass → GeoJSON cache)
  - For each known line_id, query Overpass for route=train with ref=<line_id>
  - Merge into FeatureCollection and write to apps/web/public/data/railmaps/<line>.geojson
  - Also produce an index file mapping line_id → path
*/
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

import linesDataset from '@/data/lines-complete.json';

const OVERPASS = process.env.OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter';

type FC = { type: 'FeatureCollection'; features: any[] };

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function queryOverpass(lineId: string): Promise<FC | null> {
  const q = `
  [out:json][timeout:60];
  (
    relation["type"="route"]["route"="train"]["ref"="${lineId}"]; 
    relation["type"="route_master"]["route_master"="train"]["ref"="${lineId}"];
  );
  out body; >; out skel qt;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    body: q,
    headers: { 'Content-Type': 'text/plain' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  // minimal passthrough; a real impl should use osmtogeojson
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'GeometryCollection', geometries: [] },
        properties: { lineId, overpass: true },
      },
    ],
  };
}

async function main() {
  const outDir = path.resolve('apps/web/public/data/railmaps');
  ensureDir(outDir);
  const index: Record<string, string> = {};
  const groups: any[] = [
    ...(((linesDataset as any).baden_wuerttemberg as any[]) ?? []),
    ...(((linesDataset as any).bayern as any[]) ?? []),
  ];
  for (const g of groups) {
    const id = g.id as string;
    const fc = await queryOverpass(id);
    const outPath = path.join(outDir, `${id}.geojson`);
    fs.writeFileSync(
      outPath,
      JSON.stringify(fc ?? { type: 'FeatureCollection', features: [] }, null, 2)
    );
    index[id] = `/data/railmaps/${id}.geojson`;
    console.log(`Wrote ${outPath}`);
  }
  const idxPath = path.join(outDir, 'index.json');
  fs.writeFileSync(idxPath, JSON.stringify(index, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
