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
  private statusHistory: Map<string, StatusHistoryEntry[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromStorage();
  }

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

  private loadFromStorage(): void {
    try {
      const printersData = localStorage.getItem('printers');
      if (printersData) {
        const printersArray: Printer[] = JSON.parse(printersData);
        printersArray.forEach(printer => {
          printer.lastUpdated = new Date(printer.lastUpdated);
          printer.statusHistory = printer.statusHistory.map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
          // Ensure errorCodes array exists and convert timestamps
          printer.errorCodes = (printer.errorCodes || []).map(error => ({
            ...error,
            timestamp: new Date(error.timestamp)
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

  addPrinter(config: PrinterConfig): void {
    const printer: Printer = {
      ...config,
      status: PrinterStatus.OFFLINE,
      inkLevels: { black: 0, cyan: 0, magenta: 0, yellow: 0 },
      paperLevel: 0,
      lastUpdated: new Date(),
      statusHistory: [],
      errorCodes: [],
      lastErrorCode: undefined
    };
    
    this.printers.set(config.id, printer);
    this.statusHistory.set(config.id, []);
    this.saveToStorage();
  }

  removePrinter(id: string): void {
    this.printers.delete(id);
    this.statusHistory.delete(id);
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

      // Try different methods to get printer status
      let statusData = await this.tryHttpStatusDetection(printer);
      
      if (!statusData) {
        statusData = await this.trySnmpStatusDetection(printer);
      }

      if (!statusData) {
        // If we can reach the printer but can't get status, assume it's ready
        statusData = {
          status: PrinterStatus.READY,
          inkLevels: printer.inkLevels.black > 0 ? printer.inkLevels : { black: 75, cyan: 80, magenta: 70, yellow: 85 },
          paperLevel: printer.paperLevel > 0 ? printer.paperLevel : 80,
          message: 'Status detection limited - assuming ready'
        };
      }

      const updatedPrinter = {
        ...printer,
        status: statusData.status,
        inkLevels: statusData.inkLevels,
        paperLevel: statusData.paperLevel,
        lastUpdated: new Date()
      };

      if (printer.status !== statusData.status) {
        this.addStatusHistoryEntry(printer.id, statusData.status, statusData.message, statusData.errorCode);
      }
      
      // Process any error codes found in the status message
      if (statusData.message) {
        this.processErrorCodes(printer.id, statusData.message, printer.model);
      }

      this.printers.set(printer.id, updatedPrinter);
      this.saveToStorage();
      return updatedPrinter;

    } catch (error) {
      console.error(`Failed to check printer ${printer.name}:`, error);
      const errorMessage = `Connection error: ${error}`;
      this.processErrorCodes(printer.id, errorMessage, printer.model);
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
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    
    // Try all endpoints if model is unknown
    return [
      ...PRINTER_HTTP_ENDPOINTS.HP,
      ...PRINTER_HTTP_ENDPOINTS.CANON,
      ...PRINTER_HTTP_ENDPOINTS.EPSON,
      ...PRINTER_HTTP_ENDPOINTS.BROTHER,
      ...PRINTER_HTTP_ENDPOINTS.XEROX
    ];
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
          inkLevels: this.extractInkLevelsFromXml(xmlDoc),
          paperLevel: this.extractPaperLevelFromXml(xmlDoc),
          message: alertMessages[0] || 'Status from XML API',
          errorCode: this.extractErrorCodeFromXml(xmlDoc)
        };
      }
    } catch (error) {
      console.error('XML parsing error:', error);
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
        ready: ['ready', 'idle', 'online'],
        printing: ['printing', 'busy', 'processing'],
        loading_paper: ['loading paper', 'paper loading', 'load paper', 'insert paper', 'paper tray', 'refilling'],
        paper_jam: ['paper jam', 'jam', 'paper stuck', 'paper feed', 'feed error', 'paper path'],
        paper_out: ['paper out', 'no paper', 'paper empty', 'out of paper', 'paper low'],
        cartridge_issue: ['cartridge', 'ink cartridge', 'toner cartridge', 'replace cartridge', 'cartridge error', 'cartridge missing', 'install cartridge'],
        low_ink: ['low ink', 'low toner', 'ink low', 'toner low', 'replace ink', 'replace toner'],
        error: ['error', 'jam', 'problem', 'fault'],
        offline: ['offline', 'disconnected', 'not available']
      };
      
      const bodyText = doc.body?.textContent?.toLowerCase() || '';
      
      // Check for specific status keywords with priority
      for (const [status, keywords] of Object.entries(statusKeywords)) {
        if (keywords.some(keyword => bodyText.includes(keyword))) {
          return {
            status: this.mapStatusToEnum(status),
            inkLevels: this.getDefaultInkLevels(status),
            paperLevel: this.getDefaultPaperLevel(status),
            message: `Status detected: ${keywords.find(k => bodyText.includes(k))}`,
            errorCode: this.extractErrorCodeFromHtml(bodyText)
            errorCode: this.extractErrorCode(data, alerts)
          };
        }
      }
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

  // Extract ink levels from various data formats
  private extractInkLevels(supplies: any): any {
    if (!supplies) return { black: 50, cyan: 50, magenta: 50, yellow: 50 };
    
    if (Array.isArray(supplies)) {
      const levels = { black: 50, cyan: 50, magenta: 50, yellow: 50 };
      supplies.forEach(supply => {
        const color = (supply.color || supply.name || '').toLowerCase();
        const level = supply.level || supply.percentage || 50;
        
        if (color.includes('black') || color.includes('bk')) levels.black = level;
        if (color.includes('cyan') || color.includes('c')) levels.cyan = level;
        if (color.includes('magenta') || color.includes('m')) levels.magenta = level;
        if (color.includes('yellow') || color.includes('y')) levels.yellow = level;
      });
      return levels;
    }
    
    return supplies.inkLevels || { black: 50, cyan: 50, magenta: 50, yellow: 50 };
  }

  // Extract ink levels from XML
  private extractInkLevelsFromXml(xmlDoc: Document): any {
    const levels = { black: 50, cyan: 50, magenta: 50, yellow: 50 };
    
    // Look for supply level elements
    const supplyElements = xmlDoc.querySelectorAll('Supply, Consumable, Ink');
    supplyElements.forEach(element => {
      const color = (element.getAttribute('color') || element.textContent || '').toLowerCase();
      const level = parseInt(element.getAttribute('level') || '50');
      
      if (color.includes('black')) levels.black = level;
      if (color.includes('cyan')) levels.cyan = level;
      if (color.includes('magenta')) levels.magenta = level;
      if (color.includes('yellow')) levels.yellow = level;
    });
    
    return levels;
  }

  // Get default ink levels based on status
  private getDefaultInkLevels(status: string): any {
    switch (status) {
      case 'low_ink':
        return { black: 15, cyan: 20, magenta: 18, yellow: 12 };
      case 'cartridge_issue':
        return { black: 0, cyan: 45, magenta: 50, yellow: 40 };
      default:
        return { black: 75, cyan: 80, magenta: 70, yellow: 85 };
    }
  }

  // Get default paper level based on status
  private getDefaultPaperLevel(status: string): number {
    switch (status) {
      case 'paper_out':
        return 0;
      case 'loading_paper':
        return 25;
      case 'paper_jam':
        return 60;
      default:
        return 80;
    }
  }

  // Extract paper level from various sources
  private extractPaperLevel(data: any): number {
    if (data.paperLevel) return data.paperLevel;
    if (data.paper && data.paper.level) return data.paper.level;
    if (data.tray && data.tray.level) return data.tray.level;
    return 75; // Default
  }

  // Extract paper level from XML
  private extractPaperLevelFromXml(xmlDoc: Document): number {
    const paperElements = xmlDoc.querySelectorAll('Paper, Tray, MediaLevel');
    if (paperElements.length > 0) {
      const level = parseInt(paperElements[0].getAttribute('level') || '75');
      return level;
    }
    return 75;
  }

  // Extract error codes from various response formats
  private extractErrorCode(data: any, alerts?: any[]): string | undefined {
    // Check direct error code fields
    if (data.errorCode) return data.errorCode;
    if (data.error_code) return data.error_code;
    if (data.code) return data.code;
    
    // Check in alerts/messages
    if (alerts && alerts.length > 0) {
      for (const alert of alerts) {
        const message = alert.message || alert.text || alert.description || '';
        const codes = parseErrorFromText(message);
        if (codes.length > 0) return codes[0];
      }
    }
    
    return undefined;
  }

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
    const codes = parseErrorFromText(text);
    return codes.length > 0 ? codes[0] : undefined;
  }

  // Process and store error codes
  private processErrorCodes(printerId: string, message: string, printerModel: string): void {
    const errorCodes = parseErrorFromText(message, printerModel);
    const printer = this.printers.get(printerId);
    
    if (!printer || errorCodes.length === 0) return;
    
    errorCodes.forEach(code => {
      // Check if this error code already exists and is active
      const existingError = printer.errorCodes.find(e => e.code === code && !e.resolved);
      if (existingError) return; // Don't duplicate active errors
      
      const errorInfo = getErrorCodeInfo(code, printerModel);
      const newError: ErrorCode = {
        code,
        description: errorInfo?.description || `Unknown error code: ${code}`,
        severity: errorInfo?.severity || ErrorSeverity.MEDIUM,
        category: errorInfo?.category || ErrorCategory.SYSTEM,
        timestamp: new Date(),
        resolved: false,
        solution: errorInfo?.solution
      };
      
      printer.errorCodes.push(newError);
      printer.lastErrorCode = code;
    });
    
    this.printers.set(printerId, printer);
    this.saveToStorage();
  }

  // Resolve an error code
  resolveErrorCode(printerId: string, errorCode: string): void {
    const printer = this.printers.get(printerId);
    if (!printer) return;
    
    const error = printer.errorCodes.find(e => e.code === errorCode && !e.resolved);
    if (error) {
      error.resolved = true;
      this.printers.set(printerId, printer);
      this.saveToStorage();
    }
  }

  // Get active error codes for a printer
  getActiveErrorCodes(printerId: string): ErrorCode[] {
    const printer = this.printers.get(printerId);
    return printer ? printer.errorCodes.filter(e => !e.resolved) : [];
  }

  // Get all error codes for a printer
  getAllErrorCodes(printerId: string): ErrorCode[] {
    const printer = this.printers.get(printerId);
    return printer ? printer.errorCodes : [];
  }
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

  private addStatusHistoryEntry(printerId: string, status: PrinterStatus, message?: string, errorCode?: string): void {
    const history = this.statusHistory.get(printerId) || [];
    const entry: StatusHistoryEntry = {
      timestamp: new Date(),
      status,
      message,
      errorCode
    };
    
    history.push(entry);
    
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.statusHistory.set(printerId, history);
    
    const printer = this.printers.get(printerId);
    if (printer) {
      printer.statusHistory = [...history];
      this.printers.set(printerId, printer);
    }
    
    this.saveToStorage();
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