import { NextResponse } from 'next/server';

export async function GET() {
  // Generate realistic KPIs for 144 trains
  const kpis = {
    total_trains: 144,
    active_trains: 108,
    maintenance_trains: 24,
    reserve_trains: 12,
    
    // Availability & Reliability
    availability_pct: 94.8,
    reliability_pct: 89.2,
    punctuality_pct: 91.5,
    
    // Maintenance Metrics
    mtbf: 428, // Mean Time Between Failures (hours)
    mttr: 2.4, // Mean Time To Repair (hours)
    ecm_compliance: 92.3,
    preventive_ratio: 78, // % of preventive vs corrective maintenance
    
    // Fleet Distribution
    fleet_by_type: {
      flirt_3_160: 59,
      mireo_3_plus_h: 49,
      desiro_hc: 36
    },
    
    // Line Distribution
    lines_total: 17,
    lines_by_region: {
      BW: 5,
      BY: 12
    },
    
    // Depot Metrics
    depots: {
      Essingen: {
        capacity: 80,
        current_load: 59,
        utilization_pct: 73.8
      },
      Langweid: {
        capacity: 100,
        current_load: 85,
        utilization_pct: 85.0
      }
    },
    
    // Energy & Sustainability
    energy_efficiency_kwh_per_km: 12.4,
    co2_saved_tons_ytd: 8420,
    
    // Passenger Metrics
    passenger_capacity_total: 28800, // 144 trains * ~200 seats
    avg_occupancy_pct: 68,
    passenger_satisfaction: 4.2, // out of 5
    
    // Financial
    maintenance_cost_per_km: 3.85,
    fuel_cost_savings_pct: 42, // H2 vs diesel
    
    // Safety
    incidents_last_30d: 2,
    safety_score: 98.5,
    
    // Maintenance Backlog
    open_work_orders: 45,
    overdue_work_orders: 3,
    critical_work_orders: 2,
    
    // Timestamps
    last_updated: new Date().toISOString(),
    data_quality_score: 99.2
  };
  
  return NextResponse.json(kpis, {
    headers: {
      'cache-control': 'no-store',
      'x-fleet-size': '144'
    }
  });
}