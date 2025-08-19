import { NextResponse } from 'next/server';

export async function GET() {
  const depots = [
    {
      id: 'depot-essingen',
      name: 'Essingen',
      location: {
        lat: 48.6295,
        lng: 9.9574,
        address: 'Bahnhofstraße 1, 73457 Essingen'
      },
      region: 'BW',
      operator: 'EUCORAIL',
      capacity: {
        total_slots: 80,
        maintenance_bays: 12,
        cleaning_stations: 4,
        fueling_stations: 3
      },
      currentLoad: 59,
      utilizationPct: 73.8,
      fleet: {
        total: 59,
        active: 44,
        maintenance: 8,
        reserve: 7
      },
      vehicleTypes: ['flirt_3_160'],
      supportedLines: ['RE1', 'RE2', 'RE8', 'RB22', 'RB27'],
      facilities: {
        workshop: true,
        washPlant: true,
        wheelLathe: true,
        paintShop: false,
        heavyMaintenance: true
      },
      staff: {
        total: 120,
        technicians: 85,
        management: 15,
        support: 20
      },
      ecmLevel: 2,
      certifications: ['ISO 9001', 'IRIS', 'ECM'],
      operatingHours: '24/7',
      contact: {
        phone: '+49 7365 123456',
        email: 'essingen@eucorail.de'
      }
    },
    {
      id: 'depot-langweid',
      name: 'Langweid',
      location: {
        lat: 48.4894,
        lng: 10.8539,
        address: 'Industriestraße 5, 86462 Langweid am Lech'
      },
      region: 'BY',
      operator: 'EUCORAIL',
      capacity: {
        total_slots: 100,
        maintenance_bays: 16,
        cleaning_stations: 6,
        fueling_stations: 4
      },
      currentLoad: 85,
      utilizationPct: 85.0,
      fleet: {
        total: 85,
        active: 64,
        maintenance: 16,
        reserve: 5
      },
      vehicleTypes: ['mireo_3_plus_h', 'desiro_hc'],
      supportedLines: ['RE9', 'RE12', 'MEX16', 'MEX18', 'MEX12', 'RB32', 'RB54', 'S2', 'S3', 'S4', 'S6'],
      facilities: {
        workshop: true,
        washPlant: true,
        wheelLathe: true,
        paintShop: true,
        heavyMaintenance: true,
        hydrogenStation: true
      },
      staff: {
        total: 180,
        technicians: 130,
        management: 20,
        support: 30
      },
      ecmLevel: 2,
      certifications: ['ISO 9001', 'IRIS', 'ECM', 'H2-Ready'],
      operatingHours: '24/7',
      contact: {
        phone: '+49 8230 987654',
        email: 'langweid@eucorail.de'
      }
    }
  ];
  
  return NextResponse.json(depots, {
    headers: {
      'cache-control': 'no-store',
      'x-depot-count': '2'
    }
  });
}