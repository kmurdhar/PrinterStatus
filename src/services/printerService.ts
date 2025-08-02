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
  }

  // Remove a printer from monitoring
  removePrinter(id: string): void {
    this.printers.delete(id);
    this.statusHistory.delete(id);
  }

  // Get all monitored printers
  getAllPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  // Get a specific printer by ID
  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  // Check printer status via SNMP or HTTP
  async checkPrinterStatus(printer: Printer): Promise<Printer> {
    try {
      // For web applications, we need to use HTTP requests to printer web interfaces
      // or proxy through a backend service that can handle SNMP
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
        return updatedPrinter;
      }
    } catch (error) {
      console.error(`Failed to check printer ${printer.name}:`, error);
      
      // Mark as offline if we can't reach it
      const offlinePrinter = {
        ...printer,
        status: PrinterStatus.OFFLINE,
        lastUpdated: new Date()
      };
      
      if (printer.status !== PrinterStatus.OFFLINE) {
        this.addStatusHistoryEntry(printer.id, PrinterStatus.OFFLINE, 'Connection lost');
      }
      
      this.printers.set(printer.id, offlinePrinter);
      return offlinePrinter;
    }

    return printer;
  }

  // Query printer via HTTP (most modern printers have web interfaces)
  private async queryPrinterHTTP(ipAddress: string): Promise<any> {
    try {
      // Try common printer web interface endpoints
      const endpoints = [
        `http://${ipAddress}/status.xml`,
        `http://${ipAddress}/api/status`,
        `http://${ipAddress}/cgi-bin/dynamic/printer/PrinterStatus.cgi`,
        `http://${ipAddress}/DevMgmt/ProductStatusDyn.xml`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            timeout: 5000,
            headers: {
              'Accept': 'application/xml, application/json, text/plain'
            }
          });

          if (response.ok) {
            const data = await response.text();
            return this.parsePrinterResponse(data, response.headers.get('content-type') || '');
          }
        } catch (endpointError) {
          // Try next endpoint
          continue;
        }
      }

      return null;
    } catch (error) {
      throw new Error(`HTTP query failed: ${error}`);
    }
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
      throw new Error(`Failed to parse printer response: ${error}`);
    }
  }

  // Parse JSON response from printer
  private parseJSONResponse(data: any): any {
    // This would need to be customized based on your printer's JSON format
    return {
      status: this.mapStatusFromResponse(data.status || data.state),
      inkLevels: {
        black: data.ink?.black || data.toner?.black || 0,
        cyan: data.ink?.cyan || data.toner?.cyan || 0,
        magenta: data.ink?.magenta || data.toner?.magenta || 0,
        yellow: data.ink?.yellow || data.toner?.yellow || 0
      },
      paperLevel: data.paper?.level || data.paperTray?.level || 0
    };
  }

  // Parse XML response from printer
  private parseXMLResponse(xmlString: string): any {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // This would need to be customized based on your printer's XML format
    const statusElement = xmlDoc.querySelector('Status, status, State, state');
    const inkElements = xmlDoc.querySelectorAll('Ink, ink, Toner, toner');
    const paperElement = xmlDoc.querySelector('Paper, paper, PaperTray, paperTray');

    return {
      status: this.mapStatusFromResponse(statusElement?.textContent),
      inkLevels: this.parseInkLevelsFromXML(inkElements),
      paperLevel: parseInt(paperElement?.textContent || '0')
    };
  }

  // Map printer response status to our enum
  private mapStatusFromResponse(statusString: string | null): PrinterStatus {
    if (!statusString) return PrinterStatus.OFFLINE;
    
    const status = statusString.toLowerCase();
    
    if (status.includes('ready') || status.includes('idle')) return PrinterStatus.READY;
    if (status.includes('printing') || status.includes('busy')) return PrinterStatus.PRINTING;
    if (status.includes('paper') && status.includes('jam')) return PrinterStatus.PAPER_JAM;
    if (status.includes('paper') && (status.includes('out') || status.includes('empty'))) return PrinterStatus.PAPER_OUT;
    if (status.includes('paper') && status.includes('load')) return PrinterStatus.LOADING_PAPER;
    if (status.includes('ink') || status.includes('toner')) {
      if (status.includes('low')) return PrinterStatus.LOW_INK;
      if (status.includes('empty') || status.includes('missing')) return PrinterStatus.CARTRIDGE_ISSUE;
    }
    if (status.includes('maintenance')) return PrinterStatus.MAINTENANCE_REQUIRED;
    if (status.includes('error')) return PrinterStatus.ERROR;
    if (status.includes('offline') || status.includes('disconnected')) return PrinterStatus.OFFLINE;
    
    return PrinterStatus.READY;
  }

  // Parse ink levels from XML elements
  private parseInkLevelsFromXML(inkElements: NodeListOf<Element>): any {
    const inkLevels = { black: 0, cyan: 0, magenta: 0, yellow: 0 };
    
    inkElements.forEach(element => {
      const color = element.getAttribute('color')?.toLowerCase() || 
                   element.querySelector('Color, color')?.textContent?.toLowerCase();
      const level = parseInt(element.getAttribute('level') || 
                           element.querySelector('Level, level')?.textContent || '0');
      
      if (color && color in inkLevels) {
        inkLevels[color as keyof typeof inkLevels] = level;
      }
    });
    
    return inkLevels;
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
    setInterval(async () => {
      await this.checkAllPrinters();
    }, intervalMs);
  }
}

export const printerService = new PrinterService();