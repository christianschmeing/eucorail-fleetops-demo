export type TcmsSeverity = 'INFO' | 'WARN' | 'ALARM' | 'CRITICAL';
export type TcmsStatus = 'RAISED' | 'ACK' | 'CLEARED';

export type TcmsEvent = {
  id: string;
  ts: string; // ISO timestamp
  trainId: string;
  lineId?: string;
  system:
    | 'TRACTION'
    | 'BRAKE'
    | 'DOOR'
    | 'HVAC'
    | 'PANTOGRAPH'
    | 'BATTERY'
    | 'NETWORK'
    | 'PIS'
    | 'CCTV'
    | 'WSP'
    | 'SANDER';
  code: string; // taxonomy key
  vendorCode?: string; // optional raw code
  severity: TcmsSeverity;
  status: TcmsStatus;
  kmAtEvent?: number;
  dwellImpact?: boolean;
  humanMessage: string;
  suggestedAction?: string;
  meta?: Record<string, any>;
};

export type TcmsDefinition = {
  system: TcmsEvent['system'];
  code: string;
  title: string;
  defaultSeverity: TcmsSeverity;
  humanTemplate: string;
  typicalCauses: string[];
  suggestedActions: string[];
};
