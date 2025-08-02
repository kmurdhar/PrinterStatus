export interface Printer {
  id: string;
  name: string;
  location: string;
  model: string;
  ipAddress: string;
  status: PrinterStatus;
  inkLevels: InkLevels;
  paperLevel: number;
  lastUpdated: Date;
  statusHistory: StatusHistoryEntry[];
}

export interface InkLevels {
  black: number;
  cyan: number;
  magenta: number;
  yellow: number;
}

export interface StatusHistoryEntry {
  timestamp: Date;
  status: PrinterStatus;
  message?: string;
}

export enum PrinterStatus {
  READY = 'ready',
  PRINTING = 'printing',
  LOADING_PAPER = 'loading_paper',
  PAPER_JAM = 'paper_jam',
  PAPER_OUT = 'paper_out',
  LOW_INK = 'low_ink',
  CARTRIDGE_ISSUE = 'cartridge_issue',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE_REQUIRED = 'maintenance_required'
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  priority: number;
}