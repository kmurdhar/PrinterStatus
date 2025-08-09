export interface Printer {
  id: string;
  name: string;
  location: string;
  model: string;
  ipAddress: string;
  status: PrinterStatus;
  lastUpdated: Date;
  currentMessage?: string;
  currentErrorCode?: string;
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
  errorCode?: string;
}

export interface ErrorCode {
  code: string;
  description: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  resolved: boolean;
  solution?: string;
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

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  PAPER = 'paper',
  INK_TONER = 'ink_toner',
  MECHANICAL = 'mechanical',
  NETWORK = 'network',
  SYSTEM = 'system',
  USER_INTERVENTION = 'user_intervention'
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  priority: number;
}