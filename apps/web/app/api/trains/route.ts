import { NextResponse } from 'next/server';

// Provide 12 demo trains suitable for tables
function generateTableTrains() {
  const rows: any[] = [];
  const lines = ['RE9', 'RE8', 'MEX16', 'S6', 'S2', 'ALEX'];
  const statuses = ['active', 'maintenance', 'alert'];
  for (let i = 0; i < 12; i++) {
    const lineId = lines[i % lines.length];
    const status = statuses[i % statuses.length];
    rows.push({
      id: `${lineId}-${800 + i}`,
      slot: `SL-${i + 1}`,
      uic: `DE${100000 + i}`,
      manufacturer: i % 2 === 0 ? 'Stadler' : 'Siemens',
      series: i % 2 === 0 ? 'FLIRT3' : 'Desiro HC',
      lineId,
      status,
      depot: i % 2 === 0 ? 'Essingen' : 'Langweid',
      ecm: i % 4 === 0 ? 'OVERDUE' : i % 3 === 0 ? 'DUE_SOON' : 'OK',
      nextMeasure: i % 2 === 0 ? 'IS2' : 'IS1',
    });
  }
  return rows;
}

export async function GET() {
  return NextResponse.json(generateTableTrains(), { headers: { 'cache-control': 'no-store' } });
}
