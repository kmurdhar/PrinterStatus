import { PrinterStatus, StatusConfig } from '../types/printer';

export const statusConfigs: Record<PrinterStatus, StatusConfig> = {
  [PrinterStatus.READY]: {
    label: 'Ready',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: '✓',
    priority: 1
  },
  [PrinterStatus.PRINTING]: {
    label: 'Printing',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '⚡',
    priority: 2
  },
  [PrinterStatus.LOADING_PAPER]: {
    label: 'Loading Paper',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '📄',
    priority: 3
  },
  [PrinterStatus.LOW_INK]: {
    label: 'Low Ink',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: '⚠️',
    priority: 4
  },
  [PrinterStatus.PAPER_OUT]: {
    label: 'Paper Out',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: '📭',
    priority: 5
  },
  [PrinterStatus.PAPER_JAM]: {
    label: 'Paper Jam',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🚫',
    priority: 6
  },
  [PrinterStatus.CARTRIDGE_ISSUE]: {
    label: 'Cartridge Issue',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🔧',
    priority: 7
  },
  [PrinterStatus.MAINTENANCE_REQUIRED]: {
    label: 'Maintenance Required',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: '🔧',
    priority: 8
  },
  [PrinterStatus.ERROR]: {
    label: 'Error',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '❌',
    priority: 9
  },
  [PrinterStatus.OFFLINE]: {
    label: 'Offline',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '📡',
    priority: 10
  }
};

export const getStatusConfig = (status: PrinterStatus): StatusConfig => {
  return statusConfigs[status];
};

export const formatLastUpdated = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

export const getInkLevelColor = (level: number): string => {
  if (level >= 50) return 'bg-green-500';
  if (level >= 25) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const getPaperLevelColor = (level: number): string => {
  if (level >= 50) return 'bg-blue-500';
  if (level >= 25) return 'bg-yellow-500';
  return 'bg-red-500';
};