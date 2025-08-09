import { Printer, PrinterStatus, StatusHistoryEntry } from '../types/printer';
import { ErrorCode, ErrorSeverity, ErrorCategory } from '../types/printer';
import { getErrorCodeInfo, parseErrorFromText } from '../utils/errorCodes';

export interface PrinterConfig {
  id: string;
  name: string;
  ipAddress: string;
  location: string;
  model: string;
}

// SNMP OIDs for printer status
const PRINTER_SNMP_OIDS = {
  DEVICE_STATUS: '1.3.6.1.2.1.25.3.2.1.5.1',
  PRINTER_STATUS: '1.3.6.1.2.1.25.3.5.1.1.1',
  SUPPLY_LEVEL: '1.3.6.1.2.1.43.11.1.1.9.1',
  SUPPLY_MAX: '1.3.6.1.2.1.43.11.1.1.8.1',
  PAPER_LEVEL: '1.3.6.1.2.1.43.8.2.1.10.1',
  ERROR_STATE: '1.3.6.1.2.1.43.18.1.1.8.1'
};

// Common printer HTTP endpoints
const PRINTER_HTTP_ENDPOINTS = {
  HP: ['/DevMgmt/ProductStatusDyn.xml', '/hp/device/this.LCDispatcher', '/hp/device/InternalPages/Index?id=ConfigurationPage'],
  CANON: ['/status.html', '/English/pages_MacUS/status_01.html'],
  EPSON: ['/PRESENTATION/HTML/TOP/PRTINFO.HTML', '/cgi-bin/ewebprint/OP_printer_status.cgi'],
  BROTHER: ['/general/status.html', '/etc/mnt_info.html'],
  XEROX: ['/status/status.php', '/properties/status.dhtml']
};

class PrinterService {
  private printers: Map<string, Printer> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private saveToStorage(): void {
    try {
      const printersArray = Array.from(this.printers.values());
      localStorage.setItem('printers', JSON.stringify(printersArray));
    } catch (error) {
      console.error('Failed to save printers to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const printersData = localStorage.getItem('printers');
      if (printersData) {
        const printersArray: Printer[] = JSON.parse(printersData);
        
        printersArray.forEach(printer => {
          printer.lastUpdated = new Date(printer.lastUpdated);
          this.printers.set(printer.id, printer);
        });
      }
    } catch (error) {
      console.error('Failed to load printers from storage:', error);
    }
  }

  addPrinter(config: PrinterConfig): void {
    const printer: Printer = {
      ...config,
      status: PrinterStatus.OFFLINE,
      lastUpdated: new Date(),
      currentMessage: undefined,
      currentErrorCode: undefined
    };
    
    this.printers.set(config.id, printer);
    this.saveToStorage();
  }

  removePrinter(id: string): void {
    this.printers.delete(id);
    this.saveToStorage();
  }

  getAllPrinters(): Printer[] {
    return Array.from(this.printers.values());
  }

  getPrinter(id: string): Printer | undefined {
    return this.printers.get(id);
  }

  // Real printer status detection
  async checkPrinterStatus(printer: Printer): Promise<Printer> {
    try {
      console.log(`Checking status for printer: ${printer.name} (${printer.ipAddress})`);
      
      // First, check basic network connectivity
      const isReachable = await this.pingPrinter(printer.ipAddress);
      
      if (!isReachable) {
        console.log(`Printer ${printer.name} is not reachable`);
        return this.updatePrinterStatus(printer, PrinterStatus.OFFLINE, 'Network unreachable');
      }

      // Try to get real printer status first
      let statusData = await this.tryHttpStatusDetection(printer);
      
      // If we can't get real status, assume printer is ready (since it's reachable)
      if (!statusData) {
        console.log(`No specific status detected for ${printer.name}, assuming ready`);
        statusData = {
          status: PrinterStatus.READY,
          message: 'Printer ready',
          inkLevels: { black: 75, cyan: 80, magenta: 70, yellow: 85 },
          paperLevel: 80,
          errorCode: undefined
        };
      }

      const updatedPrinter = {
        ...printer,
        status: statusData.status,
        lastUpdated: new Date(),
        currentMessage: statusData.message,
        currentErrorCode: statusData.errorCode
      };

      this.printers.set(printer.id, updatedPrinter);
      this.saveToStorage();
      return updatedPrinter;

    } catch (error) {
      console.error(`Failed to check printer ${printer.name}:`, error);
      const errorMessage = `Connection error: ${error}`;
      return this.updatePrinterStatus(printer, PrinterStatus.ERROR, errorMessage);
    }
  }

  // Network connectivity test using multiple methods
  private async pingPrinter(ipAddress: string): Promise<boolean> {
    const methods = [
      () => this.testHttpConnection(ipAddress),
      () => this.testImageLoad(ipAddress),
      () => this.testWebSocket(ipAddress)
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result) {
          console.log(`Printer ${ipAddress} is reachable`);
          return true;
        }
      } catch (error) {
        // Continue to next method
      }
    }

    console.log(`Printer ${ipAddress} is not reachable`);
    return false;
  }

  // Test HTTP connection
  private async testHttpConnection(ipAddress: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://${ipAddress}`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true; // If we get any response, the printer is reachable
    } catch (error) {
      return false;
    }
  }

  // Test using image load (works around CORS)
  private async testImageLoad(ipAddress: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(false), 3000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(true); // Error still means the IP is reachable
      };

      img.src = `http://${ipAddress}/favicon.ico?t=${Date.now()}`;
    });
  }

  // Test WebSocket connection
  private async testWebSocket(ipAddress: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://${ipAddress}:9100`); // Common printer port
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        resolve(false);
      }
    });
  }

  // Try HTTP-based status detection
  private async tryHttpStatusDetection(printer: Printer): Promise<any> {
    const endpoints = this.getEndpointsForPrinter(printer.model);
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying HTTP endpoint: http://${printer.ipAddress}${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`http://${printer.ipAddress}${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml,application/json,*/*',
            'User-Agent': 'PrinterMonitor/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          let data;

          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          const statusData = this.parseHttpResponse(data, contentType);
          if (statusData) {
            console.log(`Successfully parsed status from ${endpoint}:`, statusData);
            return statusData;
          }
        }
      } catch (error) {
        console.log(`Failed to fetch from ${endpoint}:`, error.message);
        continue;
      }
    }

    return null;
  }

  // Get appropriate endpoints based on printer model
  private getEndpointsForPrinter(model: string): string[] {
    const modelUpper = model.toUpperCase();
    
    if (modelUpper.includes('HP')) return PRINTER_HTTP_ENDPOINTS.HP;
    if (modelUpper.includes('CANON')) return PRINTER_HTTP_ENDPOINTS.CANON;
    if (modelUpper.includes('EPSON')) return PRINTER_HTTP_ENDPOINTS.EPSON;
    if (modelUpper.includes('BROTHER')) return PRINTER_HTTP_ENDPOINTS.BROTHER;
    if (modelUpper.includes('XEROX')) return PRINTER_HTTP_ENDPOINTS.XEROX;
    
    // Try common endpoints if model is unknown
    return ['/status.html', '/hp/device/this.LCDispatcher', '/general/status.html'];
  }

  // Parse HTTP response for status information
  private parseHttpResponse(data: any, contentType: string): any {
    try {
      if (contentType.includes('application/json')) {
        return this.parseJsonStatus(data);
      } else if (contentType.includes('xml')) {
        return this.parseXmlStatus(data);
      } else {
        return this.parseHtmlStatus(data);
      }
    } catch (error) {
      console.error('Failed to parse response:', error);
      return null;
    }
  }

  // Parse JSON status response
  private parseJsonStatus(data: any): any {
    // Common JSON patterns from different manufacturers
    const status = data.status || data.printerStatus || data.deviceStatus;
    const supplies = data.supplies || data.consumables || data.ink;
    const alerts = data.alerts || data.warnings || data.messages || [];
    
    if (status) {
      // Check for specific alert conditions
      let detectedStatus = this.mapStatusToEnum(status);
      
      // Override status based on alerts/warnings
      if (Array.isArray(alerts)) {
        for (const alert of alerts) {
          const alertText = (alert.message || alert.text || alert.description || '').toLowerCase();
          if (alertText.includes('paper jam') || alertText.includes('jam')) {
            detectedStatus = PrinterStatus.PAPER_JAM;
            break;
          }
          if (alertText.includes('load paper') || alertText.includes('paper loading')) {
            detectedStatus = PrinterStatus.LOADING_PAPER;
            break;
          }
          if (alertText.includes('cartridge') && (alertText.includes('error') || alertText.includes('missing'))) {
            detectedStatus = PrinterStatus.CARTRIDGE_ISSUE;
            break;
          }
        }
      }
      
      return {
        status: detectedStatus,
        inkLevels: this.extractInkLevels(supplies),
        paperLevel: this.extractPaperLevel(data),
        message: data.message || alerts[0]?.message || 'Status from JSON API'
      };
    }
    
    return null;
  }

  // Parse XML status response
  private parseXmlStatus(xmlString: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Look for common XML status elements
      const statusElements = [
        'PrinterStatus', 'DeviceStatus', 'Status',
        'dd:PrinterStatus', 'dd:DeviceStatus',
        'AlertDescription', 'Message', 'Warning'
      ];
      
      let statusText = '';
      let alertMessages = [];
      
      for (const element of statusElements) {
        const node = xmlDoc.querySelector(element);
        if (node) {
          statusText = node.textContent || '';
          break;
        }
      }
      
      // Check for alert/warning elements
      const alertElements = xmlDoc.querySelectorAll('Alert, Warning, Message, Error');
      alertElements.forEach(alert => {
        const alertText = alert.textContent || '';
        if (alertText) alertMessages.push(alertText);
      });
      
      if (statusText) {
        let detectedStatus = this.mapStatusToEnum(statusText);
        
        // Override based on alert messages
        for (const alert of alertMessages) {
          const alertLower = alert.toLowerCase();
          if (alertLower.includes('paper jam')) {
            detectedStatus = PrinterStatus.PAPER_JAM;
            break;
          }
          if (alertLower.includes('load paper') || alertLower.includes('paper loading')) {
            detectedStatus = PrinterStatus.LOADING_PAPER;
            break;
          }
          if (alertLower.includes('cartridge') && (alertLower.includes('error') || alertLower.includes('missing'))) {
            detectedStatus = PrinterStatus.CARTRIDGE_ISSUE;
            break;
          }
        }
        
        return {
          status: detectedStatus,
          errorCode: this.extractErrorCodeFromXml(xmlDoc)
          } catch (error) {
      console.error('XML parsing error:', error);
    }
    }
    
    return null;
  }

  // Parse HTML status response
  private parseHtmlStatus(html: string): any {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Look for common status indicators in HTML
      const statusKeywords = {
        cartridge_issue: ['install cartridge', 'install black cartridge', 'install ink cartridge', 'install toner cartridge', 'cartridge missing', 'cartridge not detected', 'replace cartridge', 'cartridge error', 'cartridge problem'],
        error: ['door open', 'cover open', 'door is open', 'cover is open', 'close door', 'close cover', 'access door', 'front door', 'rear door', 'top cover', 'scanner cover', 'maintenance door', 'door ajar'],
        printing: ['printing', 'busy', 'processing'],
        loading_paper: ['loading paper', 'paper loading', 'load paper', 'insert paper', 'paper tray', 'refilling'],
        paper_jam: ['paper jam', 'jam', 'paper stuck', 'paper feed', 'feed error', 'paper path'],
        paper_out: ['paper out', 'no paper', 'paper empty', 'out of paper', 'paper low'],
        low_ink: ['low ink', 'low toner', 'ink low', 'toner low', 'replace ink', 'replace toner'],
        ready: ['ready', 'idle', 'online', 'standby', 'waiting', 'available'],
        offline: ['offline', 'disconnected', 'not available']
      };
      
      const bodyText = doc.body?.textContent?.toLowerCase() || '';
      
      // Check for specific status keywords with priority (errors first, then ready)
      for (const [status, keywords] of Object.entries(statusKeywords)) {
        if (keywords.some(keyword => bodyText.includes(keyword))) {
          const matchedKeyword = keywords.find(k => bodyText.includes(k));
          let errorCode = this.extractErrorCodeFromHtml(bodyText);
          
          // Set specific error codes based on detected condition
          if (status === 'cartridge_issue') {
            errorCode = errorCode || '10.00'; // Default cartridge error code
          } else if (status === 'error' && matchedKeyword?.includes('door')) {
            errorCode = errorCode || '30.01'; // Door open error code
          }
          
          return {
            status: this.mapStatusToEnum(status),
            message: `${matchedKeyword}`,
            errorCode: this.extractErrorCodeFromHtml(bodyText)
          };
        }
      }
      
      // If we got a response but couldn't parse any error, assume ready
      return {
        status: PrinterStatus.READY,
        message: 'Printer ready',
        errorCode: undefined
      };
    } catch (error) {
      console.error('HTML parsing error:', error);
    }
    
    return null;
  }

  // Try SNMP-based status detection (limited in browsers)
  private async trySnmpStatusDetection(printer: Printer): Promise<any> {
    // SNMP is not directly available in browsers due to security restrictions
    // This would require a backend service or browser extension
    console.log('SNMP detection not available in browser environment');
    return null;
  }

  // Map various status strings to our enum
  private mapStatusToEnum(statusString: string): PrinterStatus {
    const status = statusString.toLowerCase();
    
    if (status.includes('ready') || status.includes('idle')) return PrinterStatus.READY;
    if (status.includes('printing') || status.includes('busy')) return PrinterStatus.PRINTING;
    if (status.includes('paper') && status.includes('jam')) return PrinterStatus.PAPER_JAM;
    if (status.includes('paper') && (status.includes('out') || status.includes('empty'))) return PrinterStatus.PAPER_OUT;
    if (status.includes('paper') && status.includes('load')) return PrinterStatus.LOADING_PAPER;
    if (status.includes('ink') || status.includes('toner')) return PrinterStatus.LOW_INK;
    if (status.includes('cartridge')) return PrinterStatus.CARTRIDGE_ISSUE;
    if (status.includes('maintenance')) return PrinterStatus.MAINTENANCE_REQUIRED;
    if (status.includes('offline') || status.includes('disconnected')) return PrinterStatus.OFFLINE;
    if (status.includes('error') || status.includes('fault')) return PrinterStatus.ERROR;
    
    return PrinterStatus.READY;
  }

  // Extract error codes from various response formats
  private extractErrorCodeFromXml(xmlDoc: Document): string | undefined {
    const errorElements = xmlDoc.querySelectorAll('ErrorCode, Error, Code, AlertCode');
    if (errorElements.length > 0) {
      return errorElements[0].textContent || undefined;
    }
    
    // Parse from text content
    const bodyText = xmlDoc.body?.textContent || xmlDoc.documentElement?.textContent || '';
    const codes = parseErrorFromText(bodyText);
    return codes.length > 0 ? codes[0] : undefined;
  }

  private extractErrorCodeFromHtml(text: string): string | undefined {
    return this.extractErrorCodeFromText(text);
  }

  private extractErrorCodeFromText(text: string): string | undefined {
    // Simple error code extraction patterns
    const patterns = [
      /\b(\d{2}\.\d{2})\b/,           // XX.XX format
      /\b(\d{2}\.\d{2}\.\d{2})\b/,   // XX.XX.XX format
      /\b([EW]-\d{2})\b/,            // E-XX or W-XX format
      /\b(E\d{2})\b/,                // EXX format
      /\bError\s+(\d+)\b/i,          // Error XXX format
      /\bCode\s+([A-Z0-9\-\.]+)\b/i  // Code XXX format
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    
    return undefined;
  }

  private extractInkLevels(supplies: any): any {
    // Removed - no longer needed
    return null;
  }

  private extractPaperLevel(data: any): number {
    // Removed - no longer needed
    return 0;
  }

  private extractInkLevels(supplies: any): any {
    if (!supplies) return { black: 75, cyan: 80, magenta: 70, yellow: 85 };
    
    // Try to extract ink levels from supplies data
    const levels = {};
    if (Array.isArray(supplies)) {
      supplies.forEach(supply => {
        const name = (supply.name || supply.color || '').toLowerCase();
        const level = supply.level || supply.percentage || 50;
        if (name.includes('black')) levels.black = level;
        if (name.includes('cyan')) levels.cyan = level;
        if (name.includes('magenta')) levels.magenta = level;
        if (name.includes('yellow')) levels.yellow = level;
      });
    }
    
    return { black: 75, cyan: 80, magenta: 70, yellow: 85, ...levels };
  }

  private extractPaperLevel(data: any): number {
    if (data && data.paperLevel) return data.paperLevel;
    if (data && data.paper_level) return data.paper_level;
    return 80; // Default paper level
  }

  // Enhanced simulation that focuses on cartridge issues
  private getEnhancedSimulation(printer: Printer): any {
    console.log(`Using enhanced simulation for printer: ${printer.name}`);
    
    // Create scenarios with higher probability for cartridge issues
    const scenarios = [
      // Cartridge issues (40% probability)
      {
        status: PrinterStatus.CARTRIDGE_ISSUE,
        message: 'Install black cartridge',
        errorCode: '10.00',
        weight: 4
      },
      {
        status: PrinterStatus.CARTRIDGE_ISSUE,
        message: 'Install cyan cartridge',
        errorCode: '10.01',
        weight: 4
      },
      {
        status: PrinterStatus.CARTRIDGE_ISSUE,
        message: 'Install magenta cartridge',
        errorCode: '10.02',
        weight: 4
      },
      // Door open (15% probability)
      {
        status: PrinterStatus.ERROR,
        message: 'Close printer door',
        errorCode: '30.01',
        weight: 3
      },
      // Paper issues (20% probability)
      {
        status: PrinterStatus.PAPER_JAM,
        message: 'Paper jam in input tray',
        errorCode: '13.01',
        weight: 2
      },
      {
        status: PrinterStatus.PAPER_OUT,
        message: 'Load paper in tray 1',
        errorCode: '41.01',
        weight: 2
      },
      // Ready state (25% probability)
      {
        status: PrinterStatus.READY,
        message: 'Printer ready',
        errorCode: undefined,
        weight: 5
      }
    ];
    
    // Create weighted array
    const weightedScenarios = [];
    scenarios.forEach(scenario => {
      for (let i = 0; i < scenario.weight; i++) {
        weightedScenarios.push(scenario);
      }
    });
    
    // Use printer ID and current time to create deterministic but changing selection
    const seed = printer.id.charCodeAt(0) + Math.floor(Date.now() / (5 * 60 * 1000)); // Changes every 5 minutes
    const selectedScenario = weightedScenarios[seed % weightedScenarios.length];
    
    console.log(`Selected scenario for ${printer.name}: ${selectedScenario.message}`);
    
    return selectedScenario;
  }

  private updatePrinterStatus(printer: Printer, status: PrinterStatus, message?: string): Printer {
    const updatedPrinter = {
      ...printer,
      status,
      currentMessage: message,
      lastUpdated: new Date()
    };
    
    this.printers.set(printer.id, updatedPrinter);
    this.saveToStorage();
    return updatedPrinter;
  }

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

  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      if (this.printers.size > 0) {
        console.log('Checking all printers...');
        await this.checkAllPrinters();
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export const printerService = new PrinterService();