import { NextResponse } from 'next/server';
import lines from '../../../data/lines-complete.json';

// Build 10–12 realistic line entries matching UI columns
function buildLineRows() {
  const rows: Array<{
    id: string;
    region: string;
    operator: string;
    total: number;
    active: number;
    standby: number;
    maintenance: number;
    overduePct: number;
  }> = [];
  const push = (id: string, region: 'bw' | 'by', total: number) => {
    const maintenance = Math.max(1, Math.round(total * 0.08));
    const standby = Math.max(0, Math.round(total * 0.06));
    const active = Math.max(0, total - maintenance - standby);
    const overduePct = Math.round((Math.random() * 6 + 2) * 10) / 10; // 2–8 %
    rows.push({
      id,
      region,
      operator: 'Eucorail',
      total,
      active,
      standby,
      maintenance,
      overduePct,
    });
  };
  const setBW = ['RE8', 'RE7', 'RE1', 'MEX16'];
  const setBY = ['RE9', 'RE80', 'MEX14', 'MEX15', 'S2', 'S6', 'ALEX', 'MEX12'];
  setBW.forEach((id) => push(id, 'bw', Math.floor(8 + Math.random() * 12)));
  setBY.slice(0, 8).forEach((id) => push(id, 'by', Math.floor(8 + Math.random() * 12)));
  return rows.slice(0, 12);
}

export async function GET() {
  const rows = buildLineRows();
  return NextResponse.json(rows, { headers: { 'cache-control': 'no-store' } });
}
