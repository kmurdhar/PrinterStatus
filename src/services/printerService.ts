import { Printer, PrinterStatus, StatusHistoryEntry } from '../types/printer';

export interface PrinterConfig {
  id: string;
  name: string;
  ipAddress: string;
  location: string;
  model: string;
}

class PrinterService {
  private printers: Map<string, Printer> = new Map();
  private statusHistory: Map<string, StatusHistoryEntry[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // Save printers to localStorage
  private saveToStorage(): void {
    try {
      const printersArray = Array.from(this.printers.values());
      localStorage.setItem('printers', JSON.stringify(printersArray));
      
      const historyObj = Object.fromEntries(this.statusHistory);
      localStorage.setItem('printerHistory', JSON.stringify(historyObj));
    } catch (error) {
      console.error('Failed to save printers to storage:', error);
    }
  }

  // Load printers from localStorage
  private loadFromStorage(): void {
    try {
      const printersData = localStorage.getItem('printers');
      if (printersData) {
        const printersArray: Printer[] = JSON.parse(printersData);
        printersArray.forEach(printer => {
          // Convert date strings back to Date objects
          printer.lastUpdated = new Date(printer.lastUpdated);
          printer.statusHistory = printer.statusHistory.map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
          this.printers.set(printer.id, printer);
        });
      }

      const historyData = localStorage.getItem('printerHistory');
      if (historyData) {
        const historyObj = JSON.parse(historyData);
        Object.entries(historyObj).forEach(([id, history]) => {
          const convertedHistory = (history as any[]).map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
          this.statusHistory.set(id, convertedHistory);
        });
      }
    } catch (error) {
      console.error('Failed to load printers from storage:', error);
    }
  }

  // Add a printer to monitor
  addPrinter(config: PrinterConfig): void {
    const printer: Printer = {
      ...config,
      status: PrinterStatus.OFFLINE,
      inkLevels: { black: 0, cyan: 0, magenta: 0, yellow: 0 },
      paperLevel: 0,
      lastUpdated: new Date(),
      statusHistory: []
    };
    
    this.printers.set(config.id, printer);
    this.statusHistory.set(config.id, []);
    this.saveToStorage();
  }

  // Remove a printer from monitoring
  removePrinter(id: string): void {
    this.printers.delete(id);
    this.statusHistory.delete(id);
    this.saveToStorage();
  }

  // Get all monitored printers
  getAllPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  // Get a specific printer by ID
  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  // Simulate printer status checking with realistic behavior
  async checkPrinterStatus(printer: Printer): Promise<Printer> {
    try {
      // Simulate network connectivity check
      const isReachable = await this.checkNetworkConnectivity(printer.ipAddress);
      
      if (!isReachable) {
        return this.updatePrinterStatus(printer, PrinterStatus.OFFLINE, 'Network unreachable');
      }

      // Simulate getting printer status with realistic scenarios
      const statusData = await this.simulatePrinterQuery(printer);
      
      const updatedPrinter = {
        ...printer,
        status: statusData.status,
        inkLevels: statusData.inkLevels,
        paperLevel: statusData.paperLevel,
        lastUpdated: new Date()
      };

      // Add to status history if status changed
      if (printer.status !== statusData.status) {
        this.addStatusHistoryEntry(printer.id, statusData.status, statusData.message);
      }

      this.printers.set(printer.id, updatedPrinter);
      this.saveToStorage();
      return updatedPrinter;

    } catch (error) {
      console.error(`Failed to check printer ${printer.name}:`, error);
      return this.updatePrinterStatus(printer, PrinterStatus.ERROR, `Connection error: ${error}`);
    }
  }

  // Check basic network connectivity
  private async checkNetworkConnectivity(ipAddress: string): Promise<boolean> {
    try {
      // Use a simple image request as a connectivity test
      const img = new Image();
      const promise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 3000);

        img.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          // Even errors indicate the network is reachable
          resolve(true);
        };
      });

      // Try to load a tiny image from the printer IP (most printers serve some content)
      img.src = `http://${ipAddress}/favicon.ico?t=${Date.now()}`;
      
      return await promise;
    } catch (error) {
      return false;
    }
  }

  // Simulate realistic printer status scenarios
  private async simulatePrinterQuery(printer: Printer): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Get current time for realistic status changes
    const now = new Date();
    const hourOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Business hours logic (more activity during work hours)
    const isBusinessHours = hourOfDay >= 8 && hourOfDay <= 18 && dayOfWeek >= 1 && dayOfWeek <= 5;
    
    // Simulate different scenarios based on time and printer history
    const lastStatus = printer.status;
    const timeSinceLastUpdate = now.getTime() - printer.lastUpdated.getTime();
    const minutesSinceUpdate = timeSinceLastUpdate / (1000 * 60);

    // Realistic status transitions
    let newStatus = PrinterStatus.READY;
    let message = '';
    
    // Simulate realistic printer behavior
    if (isBusinessHours) {
      const random = Math.random();
      
      if (lastStatus === PrinterStatus.PRINTING && minutesSinceUpdate < 5) {
        // Continue printing for a while
        newStatus = PrinterStatus.PRINTING;
        message = 'Print job in progress';
      } else if (random < 0.05) {
        // 5% chance of printing during business hours
        newStatus = PrinterStatus.PRINTING;
        message = 'Processing print job';
      } else if (random < 0.08) {
        // 3% chance of paper issues
        newStatus = Math.random() < 0.5 ? PrinterStatus.PAPER_OUT : PrinterStatus.LOADING_PAPER;
        message = newStatus === PrinterStatus.PAPER_OUT ? 'Paper tray empty' : 'Refilling paper tray';
      } else if (random < 0.1) {
        // 2% chance of low ink
        newStatus = PrinterStatus.LOW_INK;
        message = 'Ink levels running low';
      } else if (random < 0.11) {
        // 1% chance of paper jam
        newStatus = PrinterStatus.PAPER_JAM;
        message = 'Paper jam detected';
      } else if (random < 0.115) {
        // 0.5% chance of error
        newStatus = PrinterStatus.ERROR;
        message = 'Printer error - check display';
      } else {
        // Most of the time, ready
        newStatus = PrinterStatus.READY;
        message = 'Ready to print';
      }
    } else {
      // Outside business hours - mostly ready or maintenance
      const random = Math.random();
      if (random < 0.02) {
        newStatus = PrinterStatus.MAINTENANCE_REQUIRED;
        message = 'Scheduled maintenance due';
      } else {
        newStatus = PrinterStatus.READY;
        message = 'Standby mode';
      }
    }

    // Generate realistic supply levels
    const inkLevels = this.generateRealisticInkLevels(printer.inkLevels, newStatus);
    const paperLevel = this.generateRealisticPaperLevel(printer.paperLevel, newStatus);

    return {
      status: newStatus,
      inkLevels,
      paperLevel,
      message
    };
  }

  // Generate realistic ink levels that change over time
  private generateRealisticInkLevels(currentLevels: any, status: PrinterStatus) {
    const newLevels = { ...currentLevels };
    
    // If printer is printing, consume some ink
    if (status === PrinterStatus.PRINTING) {
      Object.keys(newLevels).forEach(color => {
        newLevels[color] = Math.max(0, newLevels[color] - Math.random() * 2);
      });
    }
    
    // If levels are 0 (new printer), set realistic starting levels
    if (Object.values(newLevels).every(level => level === 0)) {
      newLevels.black = 45 + Math.random() * 50;
      newLevels.cyan = 50 + Math.random() * 45;
      newLevels.magenta = 40 + Math.random() * 55;
      newLevels.yellow = 55 + Math.random() * 40;
    }
    
    // Ensure low ink status matches ink levels
    if (status === PrinterStatus.LOW_INK) {
      const lowColor = Object.keys(newLevels)[Math.floor(Math.random() * 4)];
      newLevels[lowColor] = Math.min(newLevels[lowColor], 15 + Math.random() * 10);
    }
    
    return newLevels;
  }

  // Generate realistic paper levels
  private generateRealisticPaperLevel(currentLevel: number, status: PrinterStatus) {
    let newLevel = currentLevel;
    
    // If paper is out, set to 0
    if (status === PrinterStatus.PAPER_OUT) {
      return 0;
    }
    
    // If loading paper, set to high level
    if (status === PrinterStatus.LOADING_PAPER) {
      return 85 + Math.random() * 15;
    }
    
    // If printing, consume some paper
    if (status === PrinterStatus.PRINTING) {
      newLevel = Math.max(0, newLevel - Math.random() * 3);
    }
    
    // If level is 0 (new printer), set realistic starting level
    if (newLevel === 0 && status !== PrinterStatus.PAPER_OUT) {
      newLevel = 60 + Math.random() * 35;
    }
    
    return Math.round(newLevel);
  }

  // Update printer status and save
  private updatePrinterStatus(printer: Printer, status: PrinterStatus, message?: string): Printer {
    const updatedPrinter = {
      ...printer,
      status,
      lastUpdated: new Date()
    };
    
    if (printer.status !== status) {
      this.addStatusHistoryEntry(printer.id, status, message);
    }
    
    this.printers.set(printer.id, updatedPrinter);
    this.saveToStorage();
    return updatedPrinter;
  }

  // Add status history entry
  private addStatusHistoryEntry(printerId: string, status: PrinterStatus, message?: string): void {
    const history = this.statusHistory.get(printerId) || [];
    const entry: StatusHistoryEntry = {
      timestamp: new Date(),
      status,
      message
    };
    
    history.push(entry);
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.statusHistory.set(printerId, history);
    
    // Update printer's status history
    const printer = this.printers.get(printerId);
    if (printer) {
      printer.statusHistory = [...history];
      this.printers.set(printerId, printer);
    }
    
    this.saveToStorage();
  }

  // Check all printers
  async checkAllPrinters(): Promise<Printer[]> {
    const printers = Array.from(this.printers.values());
    const promises = printers.map(printer => this.checkPrinterStatus(printer));
    
    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error checking printers:', error);
      return printers;
    }
  }

  // Start monitoring (check printers periodically)
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      if (this.printers.size > 0) {
        await this.checkAllPrinters();
      }
    }, intervalMs);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export const printerService = new PrinterService();