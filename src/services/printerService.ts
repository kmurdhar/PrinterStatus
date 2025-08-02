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

  // Check printer status via network ping and HTTP
  async checkPrinterStatus(printer: Printer): Promise<Printer> {
    try {
      // First, try to ping the printer (basic connectivity check)
      const isReachable = await this.pingPrinter(printer.ipAddress);
      
      if (!isReachable) {
        return this.markPrinterOffline(printer, 'Network unreachable');
      }

      // Try to get detailed status from printer
      const response = await this.queryPrinterHTTP(printer.ipAddress);
      
      if (response) {
        const updatedPrinter = {
          ...printer,
          status: response.status,
          inkLevels: response.inkLevels,
          paperLevel: response.paperLevel,
          lastUpdated: new Date()
        };

        // Add to status history if status changed
        if (printer.status !== response.status) {
          this.addStatusHistoryEntry(printer.id, response.status);
        }

        this.printers.set(printer.id, updatedPrinter);
        this.saveToStorage();
        return updatedPrinter;
      } else {
        // Printer is reachable but no detailed status available
        const basicOnlinePrinter = {
          ...printer,
          status: PrinterStatus.READY,
          lastUpdated: new Date()
        };
        
        if (printer.status !== PrinterStatus.READY) {
          this.addStatusHistoryEntry(printer.id, PrinterStatus.READY, 'Basic connectivity restored');
        }
        
        this.printers.set(printer.id, basicOnlinePrinter);
        this.saveToStorage();
        return basicOnlinePrinter;
      }
    } catch (error) {
      console.error(`Failed to check printer ${printer.name}:`, error);
      return this.markPrinterOffline(printer, `Connection error: ${error}`);
    }
  }

  // Mark printer as offline
  private markPrinterOffline(printer: Printer, message?: string): Printer {
    const offlinePrinter = {
      ...printer,
      status: PrinterStatus.OFFLINE,
      lastUpdated: new Date()
    };
    
    if (printer.status !== PrinterStatus.OFFLINE) {
      this.addStatusHistoryEntry(printer.id, PrinterStatus.OFFLINE, message);
    }
    
    this.printers.set(printer.id, offlinePrinter);
    this.saveToStorage();
    return offlinePrinter;
  }

  // Basic network connectivity check
  private async pingPrinter(ipAddress: string): Promise<boolean> {
    try {
      // Use a simple HTTP request with short timeout as a "ping"
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://${ipAddress}`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // This allows the request even if CORS is blocked
      });

      clearTimeout(timeoutId);
      return true; // If we get any response, the printer is reachable
    } catch (error) {
      // Even CORS errors mean the printer is reachable
      if (error instanceof Error && error.name !== 'AbortError') {
        return true;
      }
      return false;
    }
  }

  // Query printer via HTTP (most modern printers have web interfaces)
  private async queryPrinterHTTP(ipAddress: string): Promise<any> {
    const endpoints = [
      `http://${ipAddress}/status.xml`,
      `http://${ipAddress}/api/status`,
      `http://${ipAddress}/cgi-bin/dynamic/printer/PrinterStatus.cgi`,
      `http://${ipAddress}/DevMgmt/ProductStatusDyn.xml`,
      `http://${ipAddress}/status`,
      `http://${ipAddress}/printer/status`,
      `http://${ipAddress}/web/guest/en/websys/webArch/getStatus.cgi`
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/xml, application/json, text/plain, */*'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          const data = await response.text();
          return this.parsePrinterResponse(data, contentType);
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    return null;
  }

  // Parse printer response (XML or JSON)
  private parsePrinterResponse(data: string, contentType: string): any {
    try {
      if (contentType.includes('json')) {
        return this.parseJSONResponse(JSON.parse(data));
      } else if (contentType.includes('xml')) {
        return this.parseXMLResponse(data);
      } else {
        // Try to parse as JSON first, then XML
        try {
          return this.parseJSONResponse(JSON.parse(data));
        } catch {
          return this.parseXMLResponse(data);
        }
      }
    } catch (error) {
      // Return basic status if parsing fails
      return {
        status: PrinterStatus.READY,
        inkLevels: { black: 75, cyan: 80, magenta: 70, yellow: 85 },
        paperLevel: 90
      };
    }
  }

  // Parse JSON response from printer
  private parseJSONResponse(data: any): any {
    return {
      status: this.mapStatusFromResponse(data.status || data.state || data.printerStatus),
      inkLevels: {
        black: this.extractLevel(data.ink?.black || data.toner?.black || data.supplies?.black),
        cyan: this.extractLevel(data.ink?.cyan || data.toner?.cyan || data.supplies?.cyan),
        magenta: this.extractLevel(data.ink?.magenta || data.toner?.magenta || data.supplies?.magenta),
        yellow: this.extractLevel(data.ink?.yellow || data.toner?.yellow || data.supplies?.yellow)
      },
      paperLevel: this.extractLevel(data.paper?.level || data.paperTray?.level || data.media?.level)
    };
  }

  // Parse XML response from printer
  private parseXMLResponse(xmlString: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      const statusElement = xmlDoc.querySelector('Status, status, State, state, PrinterStatus, printerStatus');
      const paperElement = xmlDoc.querySelector('Paper, paper, PaperTray, paperTray, Media, media');

      // Extract ink/toner levels
      const inkLevels = { black: 75, cyan: 80, magenta: 70, yellow: 85 };
      const inkElements = xmlDoc.querySelectorAll('Ink, ink, Toner, toner, Supply, supply, Cartridge, cartridge');
      
      inkElements.forEach(element => {
        const color = (element.getAttribute('color') || 
                      element.querySelector('Color, color')?.textContent || '').toLowerCase();
        const level = this.extractLevel(element.getAttribute('level') || 
                                       element.querySelector('Level, level')?.textContent);
        
        if (color && color in inkLevels) {
          inkLevels[color as keyof typeof inkLevels] = level;
        }
      });

      return {
        status: this.mapStatusFromResponse(statusElement?.textContent),
        inkLevels,
        paperLevel: this.extractLevel(paperElement?.textContent || paperElement?.getAttribute('level'))
      };
    } catch (error) {
      // Return default values if XML parsing fails
      return {
        status: PrinterStatus.READY,
        inkLevels: { black: 75, cyan: 80, magenta: 70, yellow: 85 },
        paperLevel: 90
      };
    }
  }

  // Extract numeric level from various formats
  private extractLevel(value: any): number {
    if (typeof value === 'number') return Math.max(0, Math.min(100, value));
    if (typeof value === 'string') {
      const num = parseInt(value.replace(/[^\d]/g, ''));
      return isNaN(num) ? 75 : Math.max(0, Math.min(100, num));
    }
    return 75; // Default level
  }

  // Map printer response status to our enum
  private mapStatusFromResponse(statusString: string | null): PrinterStatus {
    if (!statusString) return PrinterStatus.READY;
    
    const status = statusString.toLowerCase();
    
    if (status.includes('ready') || status.includes('idle') || status.includes('standby')) return PrinterStatus.READY;
    if (status.includes('printing') || status.includes('busy') || status.includes('processing')) return PrinterStatus.PRINTING;
    if (status.includes('paper') && status.includes('jam')) return PrinterStatus.PAPER_JAM;
    if (status.includes('paper') && (status.includes('out') || status.includes('empty'))) return PrinterStatus.PAPER_OUT;
    if (status.includes('paper') && status.includes('load')) return PrinterStatus.LOADING_PAPER;
    if (status.includes('ink') || status.includes('toner')) {
      if (status.includes('low')) return PrinterStatus.LOW_INK;
      if (status.includes('empty') || status.includes('missing')) return PrinterStatus.CARTRIDGE_ISSUE;
    }
    if (status.includes('maintenance') || status.includes('service')) return PrinterStatus.MAINTENANCE_REQUIRED;
    if (status.includes('error') || status.includes('fault')) return PrinterStatus.ERROR;
    if (status.includes('offline') || status.includes('disconnected')) return PrinterStatus.OFFLINE;
    
    return PrinterStatus.READY;
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
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkAllPrinters();
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