import { Printer, PrinterStatus, StatusHistoryEntry } from '../types/printer';

const generateStatusHistory = (currentStatus: PrinterStatus): StatusHistoryEntry[] => {
  const history: StatusHistoryEntry[] = [];
  const now = new Date();
  
  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - (i * 30 * 60 * 1000)); // 30 minutes apart
    const statuses = Object.values(PrinterStatus);
    const randomStatus = i === 0 ? currentStatus : statuses[Math.floor(Math.random() * statuses.length)];
    
    history.push({
      timestamp,
      status: randomStatus,
      message: getStatusMessage(randomStatus)
    });
  }
  
  return history.reverse();
};

const getStatusMessage = (status: PrinterStatus): string => {
  const messages = {
    [PrinterStatus.READY]: 'Printer is ready for use',
    [PrinterStatus.PRINTING]: 'Processing print job #1234',
    [PrinterStatus.LOADING_PAPER]: 'Paper tray being refilled',
    [PrinterStatus.PAPER_JAM]: 'Paper jam detected in tray 2',
    [PrinterStatus.PAPER_OUT]: 'Paper tray is empty',
    [PrinterStatus.LOW_INK]: 'Black ink cartridge running low',
    [PrinterStatus.CARTRIDGE_ISSUE]: 'Cyan cartridge needs replacement',
    [PrinterStatus.OFFLINE]: 'Printer not responding to network requests',
    [PrinterStatus.ERROR]: 'General system error detected',
    [PrinterStatus.MAINTENANCE_REQUIRED]: 'Scheduled maintenance due'
  };
  
  return messages[status];
};

export const mockPrinters: Printer[] = [
  {
    id: '1',
    name: 'HP LaserJet Pro M404n',
    location: 'Office Floor 1 - Reception',
    model: 'HP LaserJet Pro M404n',
    ipAddress: '192.168.1.101',
    status: PrinterStatus.READY,
    inkLevels: { black: 85, cyan: 92, magenta: 78, yellow: 88 },
    paperLevel: 75,
    lastUpdated: new Date(),
    statusHistory: generateStatusHistory(PrinterStatus.READY)
  },
  {
    id: '2',
    name: 'Canon PIXMA TR8620',
    location: 'Office Floor 2 - Marketing',
    model: 'Canon PIXMA TR8620',
    ipAddress: '192.168.1.102',
    status: PrinterStatus.PRINTING,
    inkLevels: { black: 45, cyan: 67, magenta: 23, yellow: 56 },
    paperLevel: 60,
    lastUpdated: new Date(),
    statusHistory: generateStatusHistory(PrinterStatus.PRINTING)
  },
  {
    id: '3',
    name: 'Epson EcoTank ET-4760',
    location: 'Office Floor 1 - Accounting',
    model: 'Epson EcoTank ET-4760',
    ipAddress: '192.168.1.103',
    status: PrinterStatus.LOW_INK,
    inkLevels: { black: 15, cyan: 45, magenta: 67, yellow: 34 },
    paperLevel: 90,
    lastUpdated: new Date(),
    statusHistory: generateStatusHistory(PrinterStatus.LOW_INK)
  },
  {
    id: '4',
    name: 'Brother HL-L3270CDW',
    location: 'Office Floor 3 - Executive',
    model: 'Brother HL-L3270CDW',
    ipAddress: '192.168.1.104',
    status: PrinterStatus.PAPER_JAM,
    inkLevels: { black: 78, cyan: 82, magenta: 91, yellow: 76 },
    paperLevel: 40,
    lastUpdated: new Date(),
    statusHistory: generateStatusHistory(PrinterStatus.PAPER_JAM)
  },
  {
    id: '5',
    name: 'HP OfficeJet Pro 9015e',
    location: 'Office Floor 2 - HR Department',
    model: 'HP OfficeJet Pro 9015e',
    ipAddress: '192.168.1.105',
    status: PrinterStatus.PAPER_OUT,
    inkLevels: { black: 92, cyan: 88, magenta: 85, yellow: 90 },
    paperLevel: 0,
    lastUpdated: new Date(),
    statusHistory: generateStatusHistory(PrinterStatus.PAPER_OUT)
  },
  {
    id: '6',
    name: 'Xerox WorkCentre 6515',
    location: 'Office Floor 1 - IT Department',
    model: 'Xerox WorkCentre 6515',
    ipAddress: '192.168.1.106',
    status: PrinterStatus.OFFLINE,
    inkLevels: { black: 65, cyan: 72, magenta: 58, yellow: 69 },
    paperLevel: 85,
    lastUpdated: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    statusHistory: generateStatusHistory(PrinterStatus.OFFLINE)
  }
];