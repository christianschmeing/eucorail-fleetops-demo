'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ECM_PROFILES } from '@/lib/maintenance/ecm-profiles';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Info,
  Maximize2,
  TrendingUp,
  Zap,
  ZoomIn,
  ZoomOut,
  Settings,
} from 'lucide-react';

const FACILITIES = {
  GAB: {
    id: 'GAB',
    name: 'Langweid am Lech',
    tracks: [
      {
        no: 51,
        segment: 'boundary_to_overpass',
        lengthM: 108,
        oleM: 99,
        slopePpm: 4.7,
        speedLimit: 25,
        clearance: { side: 'L', at: 'OL-Mast T28', m: 1.68 },
      },
      {
        no: 51,
        segment: 'overpass_to_buffer',
        lengthM: 69,
        oleM: 0,
        slopePpm: 0.0,
        speedLimit: 5,
        clearance: null,
      },
      {
        no: 52,
        lengthM: 105,
        oleM: 95,
        slopePpm: 4.7,
        speedLimit: 25,
        clearance: { side: 'L', at: 'OL-Mast T27', m: 1.76 },
      },
      {
        no: 53,
        lengthM: 82,
        oleM: 72,
        slopePpm: 4.7,
        speedLimit: 25,
        clearance: { side: 'L', at: 'OL-Mast T26', m: 1.83 },
      },
      {
        no: 54,
        lengthM: 82,
        oleM: 77,
        slopePpm: 4.7,
        speedLimit: 25,
        clearance: { side: 'L', at: 'OL-Mast T25', m: 1.84 },
      },
      {
        no: 55,
        lengthM: 133,
        oleM: 124,
        slopePpm: 4.7,
        speedLimit: 25,
        clearance: { side: 'L', at: 'OL-Mast T24', m: 1.67 },
      },
      {
        no: 56,
        lengthM: 72,
        oleM: 63,
        slopePpm: 4.7,
        speedLimit: 25,
        clearance: { side: 'L', at: 'OL-Mast T23', m: 1.72 },
      },
      {
        no: 57,
        lengthM: 206,
        oleM: 206,
        slopePpm: 0.0,
        speedLimit: 5,
        clearance: { side: 'R', at: 'OL-Mast T29/T30', m: 2.02 },
      },
      {
        no: 58,
        lengthM: 206,
        oleM: 206,
        slopePpm: 0.0,
        speedLimit: 5,
        clearance: { side: 'L', at: 'OL-Mast T29/T30', m: 2.17 },
      },
    ],
    equipment: {
      elevatedTracks: { count: 2, lengthM: 190 },
      pitTracks: [
        { purpose: 'heavy_maintenance', lengthM: 160, jackSystem: '28x25t' },
        { purpose: 'heavy_maintenance', lengthM: 95, jackSystem: '16x35t' },
      ],
      underfloorLathe: { type: 'tandem', trackLengthM: 120 },
      bridgeCranes: { count: 5, maxTons: 16 },
    },
  },
  ESS: {
    id: 'ESS',
    name: 'Essingen',
    tracks: [
      { no: '201A', use: 'Zuführungsgleis', lengthM: 137, speedLimit: 15 },
      { no: '201B', use: 'Außenreinigungsanlage', lengthM: 120, speedLimit: 3 },
      { no: '202A', use: 'Innenreinigung', lengthM: 120, speedLimit: 3 },
      { no: '202B', use: 'Montagegrube', lengthM: 120, speedLimit: 15 },
      { no: '203A', use: 'Innenreinigung', lengthM: 120, speedLimit: 3 },
      { no: '203B', use: 'Arbeitsgrubengleis', lengthM: 137, speedLimit: 15 },
      { no: '204', use: 'Abstellung', lengthM: 216, speedLimit: 15 },
    ],
    gradients: [
      { area: 'Tracks 202-204', ppm: 4.9, dir: 'towards ARA' },
      { area: 'Track 201A', ppm: 4.9, dir: 'towards ARA' },
      { area: 'Between W9-W30', ppm: 8.0, dir: 'towards ARA' },
    ],
  },
} as const;

// duration will be treated as a minimum; UI width will reflect ECM_PROFILES duration if available
const WORK_ORDERS = [
  { id: 'WO-001', vehicleId: '66012', type: 'IS2', duration: 10, priority: 'high', depot: 'ESS' },
  {
    id: 'WO-002',
    vehicleId: '78034',
    type: 'IS1',
    duration: 1.5,
    priority: 'medium',
    depot: 'GAB',
  },
  { id: 'WO-003', vehicleId: '66045', type: 'IS3', duration: 20, priority: 'low', depot: 'ESS' },
  { id: 'WO-004', vehicleId: '78012', type: 'LATHE', duration: 6, priority: 'high', depot: 'GAB' },
  {
    id: 'WO-005',
    vehicleId: '78056',
    type: 'IS2',
    duration: 4.5,
    priority: 'medium',
    depot: 'GAB',
  },
  { id: 'WO-006', vehicleId: '66008', type: 'IS1', duration: 1.5, priority: 'high', depot: 'ESS' },
  { id: 'WO-007', vehicleId: '78023', type: 'IS4', duration: 50, priority: 'low', depot: 'GAB' },
] as const;

interface DepotSlot {
  id: string;
  workOrderId: string;
  trackNo: string | number;
  startTime: Date;
  endTime: Date;
  conflicts: string[];
  vehicleLength?: number;
  requiresOLE?: boolean;
}

export default function DepotPlanningPage() {
  const [selectedDepot, setSelectedDepot] = useState<'GAB' | 'ESS'>('GAB');
  const [slots, setSlots] = useState<DepotSlot[]>([]);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [timeRange, setTimeRange] = useState({ start: 0, end: 168 });
  const [draggedSlot, setDraggedSlot] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const ganttRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialSlots: DepotSlot[] = (WORK_ORDERS as any)
      .filter((wo: any) => wo.depot === selectedDepot)
      .map((wo: any, index: number) => {
        const track = (FACILITIES as any)[selectedDepot].tracks[
          index % (FACILITIES as any)[selectedDepot].tracks.length
        ];
        return {
          id: `slot-${wo.id}`,
          workOrderId: wo.id,
          trackNo: track.no,
          startTime: new Date(Date.now() + index * 8 * 3600000),
          endTime: new Date(Date.now() + (index * 8 + wo.duration) * 3600000),
          conflicts: [],
          vehicleLength: wo.type === 'IS4' ? 116 : wo.type === 'IS3' ? 97 : 68,
          requiresOLE: wo.type === 'LATHE' || wo.type === 'IS3' || wo.type === 'IS4',
        } as DepotSlot;
      });
    setSlots(initialSlots);
    checkConflicts(initialSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepot]);

  const checkConflicts = (currentSlots: DepotSlot[]) => {
    const foundConflicts: string[] = [];

    currentSlots.forEach((slot1, i) => {
      currentSlots.forEach((slot2, j) => {
        if (i !== j && slot1.trackNo === slot2.trackNo) {
          if (
            (slot1.startTime >= slot2.startTime && slot1.startTime < slot2.endTime) ||
            (slot1.endTime > slot2.startTime && slot1.endTime <= slot2.endTime)
          ) {
            foundConflicts.push(`${slot1.id}-${slot2.id}`);
          }
        }
      });

      const facility: any = (FACILITIES as any)[selectedDepot];
      const track = facility.tracks.find((t: any) => t.no === slot1.trackNo);
      if (track) {
        if (slot1.vehicleLength && track.lengthM < slot1.vehicleLength) {
          foundConflicts.push(`${slot1.id}-length`);
        }
        if (slot1.requiresOLE && track.oleM !== undefined && track.oleM < 50) {
          foundConflicts.push(`${slot1.id}-ole`);
        }
      }
    });

    setConflicts(foundConflicts);
  };

  const autoResolve = () => {
    const resolvedSlots = [...slots];

    resolvedSlots.sort((a, b) => {
      const woA: any = (WORK_ORDERS as any).find((wo: any) => wo.id === a.workOrderId);
      const woB: any = (WORK_ORDERS as any).find((wo: any) => wo.id === b.workOrderId);
      const priorityOrder: any = { high: 0, medium: 1, low: 2 };
      return priorityOrder[woA?.priority || 'low'] - priorityOrder[woB?.priority || 'low'];
    });

    const assignedTracks = new Map<string | number, Date>();

    resolvedSlots.forEach((slot) => {
      const wo: any = (WORK_ORDERS as any).find((w: any) => w.id === slot.workOrderId);
      const facility: any = (FACILITIES as any)[selectedDepot];
      const suitableTrack = facility.tracks.find((track: any) => {
        const trackNo = track.no;
        assignedTracks.get(trackNo);
        if (slot.vehicleLength && track.lengthM < slot.vehicleLength) return false;
        if (slot.requiresOLE && track.oleM !== undefined && track.oleM < 50) return false;
        return true;
      });

      if (suitableTrack) {
        const trackNo = suitableTrack.no;
        const lastEnd = assignedTracks.get(trackNo) || new Date();
        slot.trackNo = trackNo;
        slot.startTime = new Date(Math.max(lastEnd.getTime(), Date.now()));
        slot.endTime = new Date(slot.startTime.getTime() + (wo?.duration || 4) * 3600000);
        slot.conflicts = [];
        assignedTracks.set(trackNo, slot.endTime);
      }
    });

    setSlots(resolvedSlots);
    setConflicts([]);
  };

  const handleDragStart = (slotId: string) => {
    setDraggedSlot(slotId);
  };

  const handleDrop = (trackNo: string | number, hourOffset: number) => {
    if (!draggedSlot) return;
    const updatedSlots = slots.map((slot) => {
      if (slot.id === draggedSlot) {
        const wo: any = (WORK_ORDERS as any).find((w: any) => w.id === slot.workOrderId);
        const newStart = new Date(Date.now() + hourOffset * 3600000);
        return {
          ...slot,
          trackNo,
          startTime: newStart,
          endTime: new Date(newStart.getTime() + (wo?.duration || 4) * 3600000),
        };
      }
      return slot;
    });
    setSlots(updatedSlots);
    checkConflicts(updatedSlots);
    setDraggedSlot(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Depot Planning</h1>
            <p className="text-sm text-gray-600">
              Gantt-basierte Wartungsplanung mit Constraint-Prüfung
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant={selectedDepot === 'GAB' ? 'primary' : 'secondary'}
                onClick={() => setSelectedDepot('GAB')}
              >
                Langweid (GAB)
              </Button>
              <Button
                variant={selectedDepot === 'ESS' ? 'primary' : 'secondary'}
                onClick={() => setSelectedDepot('ESS')}
              >
                Essingen (ESS)
              </Button>
            </div>
            {conflicts.length > 0 && (
              <Alert className="w-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {conflicts.length} Konflikte erkannt
                  <Button className="ml-2" size="sm" onClick={autoResolve}>
                    <Settings className="w-4 h-4 mr-1" />
                    Auto-Resolve
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">Gleis-Constraints</h3>
          {(FACILITIES as any)[selectedDepot].tracks.map((track: any) => {
            const trackNo = track.no;
            const hasSlot = slots.some((s) => s.trackNo === trackNo);
            const hasConflict = conflicts.some((c) => c.includes(`-${trackNo}`));
            return (
              <div
                key={`${track.no}-${track.segment || ''}`}
                className={`mb-3 p-3 rounded border ${hasConflict ? 'border-red-300 bg-red-50' : hasSlot ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Gleis {trackNo}</span>
                  {track.segment && <Badge className="text-xs">{track.segment}</Badge>}
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span>Länge:</span>
                    <span className="font-medium">{track.lengthM}m</span>
                  </div>
                  {track.oleM !== undefined && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>OLE:</span>
                      <span className="font-medium">{track.oleM}m</span>
                    </div>
                  )}
                  {track.slopePpm !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Neigung:</span>
                      <span className="font-medium">{track.slopePpm}‰</span>
                    </div>
                  )}
                  {track.speedLimit !== undefined && (
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      <span>v_max:</span>
                      <span className="font-medium">{track.speedLimit} km/h</span>
                    </div>
                  )}
                  {track.clearance && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-yellow-600" />
                      <span>Engstelle:</span>
                      <span className="font-medium">{track.clearance.m}m</span>
                    </div>
                  )}
                  {track.use && (
                    <div className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>{track.use}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {(FACILITIES as any)[selectedDepot].equipment && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold mb-3">Ausstattung</h4>
              <div className="space-y-2 text-xs">
                {(FACILITIES as any)[selectedDepot].equipment.underfloorLathe && (
                  <Badge className="block">
                    Unterflurdrehbank (
                    {(FACILITIES as any)[selectedDepot].equipment.underfloorLathe.trackLengthM}m)
                  </Badge>
                )}
                {(FACILITIES as any)[selectedDepot].equipment.bridgeCranes && (
                  <Badge className="block">
                    {(FACILITIES as any)[selectedDepot].equipment.bridgeCranes.count} Kräne (max{' '}
                    {(FACILITIES as any)[selectedDepot].equipment.bridgeCranes.maxTons}t)
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{zoomLevel}%</span>
              <Button
                variant="secondary"
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="secondary" onClick={() => setZoomLevel(100)}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  setTimeRange({
                    start: Math.max(0, timeRange.start - 24),
                    end: timeRange.end - 24,
                  })
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">Woche {Math.floor(timeRange.start / 168) + 1}</span>
              <Button
                variant="secondary"
                onClick={() =>
                  setTimeRange({ start: timeRange.start + 24, end: timeRange.end + 24 })
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div
            ref={ganttRef}
            className="flex-1 overflow-auto bg-white p-4"
            style={{ zoom: zoomLevel / 100 }}
          >
            <div className="flex border-b pb-2 mb-4">
              <div className="w-20" />
              {Array.from({ length: 7 }).map((_, day) => (
                <div key={`day-${day}`} className="flex-1 text-center">
                  <div className="font-semibold text-sm">Tag {day + 1}</div>
                  <div className="flex">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div
                        key={`hour-${day}-${hour}`}
                        className="flex-1 text-xs text-gray-400 border-l"
                        style={{ minWidth: '20px' }}
                      >
                        {hour === 0 && '00'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {((FACILITIES as any)[selectedDepot]?.tracks || []).map((track: any, idx: number) => {
              const trackNo = track.no;
              const trackSlots = slots.filter((s) => s.trackNo === trackNo);
              return (
                <div
                  key={`${track.no}-${track.segment || ''}-${idx}`}
                  className="flex mb-2 relative"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left - 80;
                    const hourOffset = Math.floor(x / 20);
                    handleDrop(trackNo, hourOffset);
                  }}
                >
                  <div className="w-20 py-2 pr-2 text-sm font-medium">Gleis {trackNo}</div>
                  <div className="flex-1 relative h-12 bg-gray-50 border rounded">
                    {Array.from({ length: 168 }).map((_, hour) => (
                      <div
                        key={`grid-${trackNo}-${hour}`}
                        className="absolute top-0 bottom-0 border-l border-gray-200"
                        style={{ left: `${(hour / 168) * 100}%` }}
                      />
                    ))}
                    {trackSlots.map((slot) => {
                      const wo: any = (WORK_ORDERS as any).find(
                        (w: any) => w.id === slot.workOrderId
                      );
                      const startHour = (slot.startTime.getTime() - Date.now()) / 3600000;
                      // try to pick realistic duration from ECM_PROFILES by vehicle family inference
                      let duration = wo?.duration || 4;
                      const vehPrefix = String(wo?.vehicleId || '');
                      let family: 'FLIRT3' | 'MIREO' | 'DESIRO_HC' | null = null;
                      if (vehPrefix.startsWith('660')) family = 'FLIRT3';
                      if (vehPrefix.startsWith('780')) {
                        // split roughly by allocation
                        const suffix = Number(vehPrefix.slice(3));
                        family =
                          suffix % 3 === 0 ? 'DESIRO_HC' : suffix % 2 === 0 ? 'MIREO' : 'FLIRT3';
                      }
                      const stage = String(wo?.type || '').toUpperCase();
                      if (
                        family &&
                        (ECM_PROFILES as any)[family] &&
                        (ECM_PROFILES as any)[family][stage]
                      ) {
                        duration = Math.max(
                          duration,
                          (ECM_PROFILES as any)[family][stage].durationHours || duration
                        );
                      }
                      const hasConflict = conflicts.some((c) => c.includes(slot.id));
                      return (
                        <div
                          key={slot.id}
                          draggable
                          onDragStart={() => handleDragStart(slot.id)}
                          className={`absolute top-1 bottom-1 rounded cursor-move flex items-center px-2 ${hasConflict ? 'bg-red-500 text-white' : wo?.priority === 'high' ? 'bg-orange-500 text-white' : wo?.priority === 'medium' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}
                          style={{
                            left: `${(Math.max(0, startHour) / 168) * 100}%`,
                            width: `${(duration / 168) * 100}%`,
                            minWidth: '40px',
                          }}
                        >
                          <div className="text-xs font-medium truncate">
                            {wo?.vehicleId} - {wo?.type}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-64 bg-white border-l p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">Wartungsaufträge</h3>
          <div className="space-y-2">
            {(WORK_ORDERS as any)
              .filter((wo: any) => wo.depot === selectedDepot)
              .map((wo: any) => {
                const slot = slots.find((s) => s.workOrderId === wo.id);
                const hasConflict = slot && conflicts.some((c) => c.includes(slot.id));
                return (
                  <Card key={wo.id} className={hasConflict ? 'border-red-300' : ''}>
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{wo.vehicleId}</span>
                        <Badge
                          className={
                            wo.priority === 'high'
                              ? 'bg-red-600 text-white'
                              : wo.priority === 'medium'
                                ? 'bg-blue-600 text-white'
                                : ''
                          }
                        >
                          {wo.priority}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Typ:</span>
                          <span className="font-medium">{wo.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dauer:</span>
                          <span className="font-medium">{wo.duration}h</span>
                        </div>
                        {slot && (
                          <div className="flex justify-between">
                            <span>Gleis:</span>
                            <span className="font-medium">{String(slot.trackNo)}</span>
                          </div>
                        )}
                      </div>
                      {hasConflict && (
                        <div className="mt-2 text-xs text-red-600 font-medium">
                          ⚠ Konflikt erkannt
                        </div>
                      )}
                    </CardBody>
                  </Card>
                );
              })}
          </div>
          <Button className="w-full mt-4" onClick={autoResolve} disabled={conflicts.length === 0}>
            <Settings className="w-4 h-4 mr-2" />
            Auto-Resolve Konflikte
          </Button>
        </div>
      </div>
    </div>
  );
}
