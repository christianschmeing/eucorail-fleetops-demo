import { TcmsEvent } from './types';
import { TCMS_TAXONOMY } from './taxonomy';
import { FAILURE_RATES_PER_10K_KM } from '@/lib/maintenance/ecm-profiles';

type EmitOpts = {
  trainId: string;
  lineId?: string;
  mileageKm: number;
  nowISO: string;
};

const SYSTEM_RATE_SCALE: Record<string, number> = {
  DOOR: 1.0,
  TRACTION: 0.4,
  BRAKE: 0.2,
  HVAC: 0.3,
  PANTOGRAPH: 0.1,
  BATTERY: 0.15,
  NETWORK: 0.25,
  PIS: 0.1,
  CCTV: 0.1,
  WSP: 0.2,
  SANDER: 0.05,
};

const TAXO_KEYS = Object.keys(TCMS_TAXONOMY);

export function maybeEmitSyntheticEvent(o: EmitOpts): TcmsEvent | null {
  const baseCommonRates = (FAILURE_RATES_PER_10K_KM as any)?.common || {};
  const base = Object.values(baseCommonRates).reduce((a: number, b: any) => a + Number(b || 0), 0);
  const per10k = Math.max(0.2, base); // safety lower bound
  const kmFactor = Math.max(0.2, o.mileageKm / 100000);
  const p = (per10k / 10000) * kmFactor; // crude hazard scaling
  if (Math.random() > p) return null;

  const systems = Object.entries(SYSTEM_RATE_SCALE);
  const total = systems.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  let system: string = 'DOOR';
  for (const [sys, w] of systems) {
    r -= w;
    if (r <= 0) {
      system = sys;
      break;
    }
  }
  const candidates = TAXO_KEYS.filter((k) => TCMS_TAXONOMY[k].system === system);
  const key = candidates[Math.floor(Math.random() * candidates.length)];
  const def = TCMS_TAXONOMY[key];

  const repl = (s: string) =>
    s
      .replace('{temp}', '95')
      .replace('{bar}', '4.2')
      .replace('{kv}', '15')
      .replace('{phase}', 'L2')
      .replace('{amps}', '52')
      .replace('{events}', '8')
      .replace('{port}', 'eth1')
      .replace('{pct}', '20')
      .replace('{seg}', 'A');

  const ev: TcmsEvent = {
    id: `tcms-${Math.random().toString(36).slice(2, 10)}`,
    ts: o.nowISO,
    trainId: o.trainId,
    lineId: o.lineId,
    system: def.system,
    code: def.code,
    severity: def.defaultSeverity,
    status: 'RAISED',
    kmAtEvent: o.mileageKm,
    humanMessage: repl(def.humanTemplate),
    suggestedAction: def.suggestedActions[0],
  };
  return ev;
}
