import TrainDetailClient from './TrainDetailClient';
import { notFound } from 'next/navigation';
import { generateTrains } from '@/lib/generateTrains';
import arverioFleet from '@/data/arverio-fleet-real.json';
import linesData from '@/data/lines-complete.json';
import { ECM_PROFILES, INTERVENTION_MAPPING } from '@/lib/maintenance/ecm-profiles';

async function getTrain(id: string) {
  try {
    // Prefer Arverio vehicles; enrich with ECM info
    const real = (arverioFleet as any).vehicles as Array<any>;
    const fromReal = real
      ? real.map((v: any) => ({
          id: v.id,
          lineId: v.line || (v.depot === 'ESS' ? 'RE1' : 'RE9'),
          region: v.depot === 'ESS' ? 'BW' : 'BY',
          status:
            v.status === 'MAINTENANCE'
              ? 'maintenance'
              : v.status === 'DEPOT'
                ? 'standby'
                : 'active',
          depot: v.depot === 'ESS' ? 'Essingen' : 'Langweid',
          series: v.type,
          vehicleType: v.type,
          manufacturer: v.type?.includes('FLIRT') ? 'Stadler' : 'Siemens',
          mileageKm: 60000 + Math.floor(Math.random() * 80000),
          speedKmh: 0,
          delayMin: 0,
          healthScore: 80 + Math.floor(Math.random() * 20),
          maintenanceInfo: undefined as any,
        }))
      : [];

    const trainFromReal = fromReal.find((t: any) => t.id === id);
    let train = trainFromReal;
    if (!train) {
      const fallback = generateTrains();
      train = fallback.find((t: any) => t.id === id || t.trainId === id) as any;
    }
    // Last-resort: synthesize from ID so deep-links never 404
    if (!train) {
      const lineId = (id.split('-')[0] || 'RE9').toUpperCase();
      const isBW = ((linesData as any).baden_wuerttemberg || []).some((l: any) => l.id === lineId);
      const isBY = ((linesData as any).bayern || []).some((l: any) => l.id === lineId);
      const region = isBW ? 'BW' : isBY ? 'BY' : 'BY';
      const series = region === 'BW' ? 'FLIRT 3' : 'Mireo Plus H';
      train = {
        id,
        lineId,
        region,
        status: 'active',
        depot: region === 'BW' ? 'Essingen' : 'Langweid',
        series,
        vehicleType: series,
        manufacturer: series.includes('FLIRT') ? 'Stadler' : 'Siemens',
        mileageKm: 70000 + Math.floor(Math.random() * 30000),
        speedKmh: 0,
        delayMin: 0,
        healthScore: 85,
      } as any;
    }

    // attach ECM maintenance info using simple model
    const vt = String((train as any).series || (train as any).vehicleType || '').toUpperCase();
    const key = vt.includes('FLIRT')
      ? 'FLIRT3'
      : vt.includes('MIREO')
        ? 'MIREO'
        : vt.includes('DESIRO')
          ? 'DESIRO_HC'
          : 'FLIRT3';
    const p = (ECM_PROFILES as any)[key];
    if (p && train) {
      const now = Date.now();
      (train as any).maintenanceInfo = {
        IS1: {
          intervalKm: p.IS1.periodKm,
          intervalDays: p.IS1.periodDays,
          kmSinceLast: Math.floor((train.mileageKm || 0) % p.IS1.periodKm),
          daysSinceLast: Math.floor((now / 86400000) % p.IS1.periodDays),
          restKm: Math.max(0, p.IS1.periodKm - ((train.mileageKm || 0) % p.IS1.periodKm)),
          restDays: Math.max(0, p.IS1.periodDays - Math.floor((now / 86400000) % p.IS1.periodDays)),
          status: 'green',
          lastDate: new Date(
            now - 86400000 * Math.floor((now / 86400000) % p.IS1.periodDays)
          ).toISOString(),
          nextDate: new Date(
            now +
              86400000 *
                Math.max(0, p.IS1.periodDays - Math.floor((now / 86400000) % p.IS1.periodDays))
          ).toISOString(),
        },
        IS2: {
          intervalKm: p.IS2.periodKm,
          intervalDays: p.IS2.periodDays,
          kmSinceLast: Math.floor((train.mileageKm || 0) % p.IS2.periodKm),
          daysSinceLast: Math.floor((now / 86400000) % p.IS2.periodDays),
          restKm: Math.max(0, p.IS2.periodKm - ((train.mileageKm || 0) % p.IS2.periodKm)),
          restDays: Math.max(0, p.IS2.periodDays - Math.floor((now / 86400000) % p.IS2.periodDays)),
          status: 'green',
          lastDate: new Date(
            now - 86400000 * Math.floor((now / 86400000) % p.IS2.periodDays)
          ).toISOString(),
          nextDate: new Date(
            now +
              86400000 *
                Math.max(0, p.IS2.periodDays - Math.floor((now / 86400000) % p.IS2.periodDays))
          ).toISOString(),
        },
        IS3: {
          intervalKm: p.IS3.periodKm,
          intervalDays: p.IS3.periodDays,
          kmSinceLast: Math.floor((train.mileageKm || 0) % p.IS3.periodKm),
          daysSinceLast: Math.floor((now / 86400000) % p.IS3.periodDays),
          restKm: Math.max(0, p.IS3.periodKm - ((train.mileageKm || 0) % p.IS3.periodKm)),
          restDays: Math.max(0, p.IS3.periodDays - Math.floor((now / 86400000) % p.IS3.periodDays)),
          status: 'yellow',
          lastDate: new Date(
            now - 86400000 * Math.floor((now / 86400000) % p.IS3.periodDays)
          ).toISOString(),
          nextDate: new Date(
            now +
              86400000 *
                Math.max(0, p.IS3.periodDays - Math.floor((now / 86400000) % p.IS3.periodDays))
          ).toISOString(),
        },
        IS4: {
          intervalKm: p.IS4.periodKm,
          intervalDays: p.IS4.periodDays,
          kmSinceLast: Math.floor((train.mileageKm || 0) % p.IS4.periodKm),
          daysSinceLast: Math.floor((now / 86400000) % p.IS4.periodDays),
          restKm: Math.max(0, p.IS4.periodKm - ((train.mileageKm || 0) % p.IS4.periodKm)),
          restDays: Math.max(0, p.IS4.periodDays - Math.floor((now / 86400000) % p.IS4.periodDays)),
          status: 'green',
          lastDate: new Date(
            now - 86400000 * Math.floor((now / 86400000) % p.IS4.periodDays)
          ).toISOString(),
          nextDate: new Date(
            now +
              86400000 *
                Math.max(0, p.IS4.periodDays - Math.floor((now / 86400000) % p.IS4.periodDays))
          ).toISOString(),
        },
        Lathe: {
          intervalKm: p.WHEEL_LATHE.periodKm,
          intervalDays: p.WHEEL_LATHE.periodDays ?? 365,
          kmSinceLast: Math.floor((train.mileageKm || 0) % p.WHEEL_LATHE.periodKm),
          daysSinceLast: Math.floor((now / 86400000) % (p.WHEEL_LATHE.periodDays ?? 365)),
          restKm: Math.max(
            0,
            p.WHEEL_LATHE.periodKm - ((train.mileageKm || 0) % p.WHEEL_LATHE.periodKm)
          ),
          restDays: Math.max(
            0,
            (p.WHEEL_LATHE.periodDays ?? 365) -
              Math.floor((now / 86400000) % (p.WHEEL_LATHE.periodDays ?? 365))
          ),
          status: 'green',
          lastDate: new Date(
            now - 86400000 * Math.floor((now / 86400000) % (p.WHEEL_LATHE.periodDays ?? 365))
          ).toISOString(),
          nextDate: new Date(
            now +
              86400000 *
                Math.max(
                  0,
                  (p.WHEEL_LATHE.periodDays ?? 365) -
                    Math.floor((now / 86400000) % (p.WHEEL_LATHE.periodDays ?? 365))
                )
          ).toISOString(),
        },
      } as any;
      (train as any).interventionMapping = INTERVENTION_MAPPING;
    }
    return train as any;
  } catch (error) {
    console.error('Error getting train:', error);
    return null;
  }
}

// Generate static params for known train IDs (optional for dynamic routes)
export async function generateStaticParams() {
  return []; // Return empty array to allow all dynamic paths
}

export default async function TrainDetailPage({ params }: { params: { id: string } }) {
  const decodedId = decodeURIComponent(params.id);
  const train = await getTrain(decodedId);

  if (!train) {
    notFound();
  }

  return <TrainDetailClient train={train} />;
}
