import { ErrorCode, ErrorSeverity, ErrorCategory } from '../types/printer';

// Common printer error codes database
export const ERROR_CODE_DATABASE: Record<string, Omit<ErrorCode, 'timestamp' | 'resolved'>> = {
  // Paper-related errors
  '13.01': {
    code: '13.01',
    description: 'Paper jam in input tray',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.PAPER,
    solution: 'Remove jammed paper from input tray. Check for torn pieces.'
  },
  '13.02': {
    code: '13.02',
    description: 'Paper jam in output tray',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.PAPER,
    solution: 'Remove jammed paper from output tray. Clear paper path.'
  },
  '13.05': {
    code: '13.05',
    description: 'Paper jam in fuser area',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.PAPER,
    solution: 'Turn off printer, wait 30 minutes for fuser to cool, then remove jam.'
  },
  '41.01': {
    code: '41.01',
    description: 'Paper size mismatch',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.PAPER,
    solution: 'Load correct paper size or adjust printer settings.'
  },
  '41.03': {
    code: '41.03',
    description: 'Paper type mismatch',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.PAPER,
    solution: 'Load correct paper type or change printer settings.'
  },

  // Ink/Toner errors
  '10.00': {
    code: '10.00',
    description: 'Black cartridge missing or not detected',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.INK_TONER,
    solution: 'Install or reseat black ink/toner cartridge.'
  },
  '10.01': {
    code: '10.01',
    description: 'Cyan cartridge missing or not detected',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.INK_TONER,
    solution: 'Install or reseat cyan ink cartridge.'
  },
  '10.02': {
    code: '10.02',
    description: 'Magenta cartridge missing or not detected',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.INK_TONER,
    solution: 'Install or reseat magenta ink cartridge.'
  },
  '10.03': {
    code: '10.03',
    description: 'Yellow cartridge missing or not detected',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.INK_TONER,
    solution: 'Install or reseat yellow ink cartridge.'
  },
  '10.10': {
    code: '10.10',
    description: 'Cartridge incompatible or counterfeit',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.INK_TONER,
    solution: 'Replace with genuine cartridge compatible with this printer model.'
  },

  // Mechanical errors
  '50.01': {
    code: '50.01',
    description: 'Fuser error - temperature too low',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.MECHANICAL,
    solution: 'Turn printer off and on. If error persists, replace fuser unit.'
  },
  '50.02': {
    code: '50.02',
    description: 'Fuser error - temperature too high',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.MECHANICAL,
    solution: 'Turn off printer immediately. Allow cooling. Contact service if error persists.'
  },
  '51.01': {
    code: '51.01',
    description: 'Laser scanner error',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.MECHANICAL,
    solution: 'Clean laser scanner mirror. If error persists, replace laser unit.'
  },
  '52.01': {
    code: '52.01',
    description: 'Scanner motor error',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.MECHANICAL,
    solution: 'Turn printer off and on. If error persists, replace scanner motor.'
  },

  // Network errors
  '79.00': {
    code: '79.00',
    description: 'Network communication error',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK,
    solution: 'Check network cable connection. Restart network services.'
  },
  '79.01': {
    code: '79.01',
    description: 'Network timeout error',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.NETWORK,
    solution: 'Check network stability. Reduce network traffic or increase timeout.'
  },

  // System errors
  '20.00': {
    code: '20.00',
    description: 'Memory error - insufficient RAM',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    solution: 'Reduce print job complexity or add more memory to printer.'
  },
  '21.00': {
    code: '21.00',
    description: 'Page too complex to print',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.SYSTEM,
    solution: 'Simplify document or print at lower resolution.'
  },
  '22.00': {
    code: '22.00',
    description: 'EIO card error',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    solution: 'Reseat or replace EIO card. Check card compatibility.'
  },

  // User intervention required
  '30.01': {
    code: '30.01',
    description: 'Cover open',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INTERVENTION,
    solution: 'Close all printer covers and doors.'
  },
  '30.02': {
    code: '30.02',
    description: 'Tray missing',
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.USER_INTERVENTION,
    solution: 'Insert paper tray properly into printer.'
  },
  '40.01': {
    code: '40.01',
    description: 'Bad serial transmission',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK,
    solution: 'Check cable connections. Replace serial cable if necessary.'
  }
};

// HP-specific error codes
export const HP_ERROR_CODES: Record<string, Omit<ErrorCode, 'timestamp' | 'resolved'>> = {
  '49.38.01': {
    code: '49.38.01',
    description: 'Firmware error - corrupt print job',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.SYSTEM,
    solution: 'Cancel current print job. Update printer firmware.'
  },
  '59.F0': {
    code: '59.F0',
    description: 'Transfer roller motor error',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.MECHANICAL,
    solution: 'Turn printer off and on. Replace transfer roller if error persists.'
  }
};

// Canon-specific error codes
export const CANON_ERROR_CODES: Record<string, Omit<ErrorCode, 'timestamp' | 'resolved'>> = {
  'E02': {
    code: 'E02',
    description: 'Paper feed error',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.PAPER,
    solution: 'Remove paper from rear tray and reload properly.'
  },
  'E03': {
    code: 'E03',
    description: 'Paper jam error',
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.PAPER,
    solution: 'Remove jammed paper. Check for torn pieces in paper path.'
  },
  'E04': {
    code: 'E04',
    description: 'Ink cartridge not recognized',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.INK_TONER,
    solution: 'Remove and reinstall ink cartridge. Clean cartridge contacts.'
  },
  'E05': {
    code: 'E05',
    description: 'Ink cartridge not installed',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.INK_TONER,
    solution: 'Install the correct ink cartridge for this printer model.'
  }
};

// Epson-specific error codes
export const EPSON_ERROR_CODES: Record<string, Omit<ErrorCode, 'timestamp' | 'resolved'>> = {
  'W-01': {
    code: 'W-01',
    description: 'Ink pad at end of service life',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.MECHANICAL,
    solution: 'Contact Epson service center to replace ink pad.'
  },
  'E-01': {
    code: 'E-01',
    description: 'Printer head error',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.MECHANICAL,
    solution: 'Turn printer off and on. If error persists, replace print head.'
  },
  'E-02': {
    code: 'E-02',
    description: 'Scanner error',
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.MECHANICAL,
    solution: 'Remove any obstructions from scanner unit. Restart printer.'
  }
};

export function getErrorCodeInfo(code: string, printerModel?: string): Omit<ErrorCode, 'timestamp' | 'resolved'> | null {
  // First check model-specific codes
  if (printerModel) {
    const modelUpper = printerModel.toUpperCase();
    
    if (modelUpper.includes('HP') && HP_ERROR_CODES[code]) {
      return HP_ERROR_CODES[code];
    }
    
    if (modelUpper.includes('CANON') && CANON_ERROR_CODES[code]) {
      return CANON_ERROR_CODES[code];
    }
    
    if (modelUpper.includes('EPSON') && EPSON_ERROR_CODES[code]) {
      return EPSON_ERROR_CODES[code];
    }
  }
  
  // Fall back to generic error codes
  return ERROR_CODE_DATABASE[code] || null;
}

export function parseErrorFromText(text: string, printerModel?: string): string[] {
  const errorCodes: string[] = [];
  
  // Common error code patterns
  const patterns = [
    /\b(\d{2}\.\d{2})\b/g,           // XX.XX format
    /\b(\d{2}\.\d{2}\.\d{2})\b/g,   // XX.XX.XX format
    /\b([EW]-\d{2})\b/g,            // E-XX or W-XX format (Epson)
    /\b(E\d{2})\b/g,                // EXX format (Canon)
    /\b(\d{2}[A-F]\d)\b/g,          // XXFx format (HP)
    /\bError\s+(\d+)\b/gi,          // Error XXX format
    /\bCode\s+([A-Z0-9\-\.]+)\b/gi  // Code XXX format
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const code = match[1];
      if (!errorCodes.includes(code)) {
        errorCodes.push(code);
      }
    }
  });
  
  return errorCodes;
}

export function getErrorSeverityColor(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case ErrorSeverity.MEDIUM:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case ErrorSeverity.HIGH:
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case ErrorSeverity.CRITICAL:
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getErrorCategoryIcon(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.PAPER:
      return '📄';
    case ErrorCategory.INK_TONER:
      return '🖨️';
    case ErrorCategory.MECHANICAL:
      return '⚙️';
    case ErrorCategory.NETWORK:
      return '🌐';
    case ErrorCategory.SYSTEM:
      return '💻';
    case ErrorCategory.USER_INTERVENTION:
      return '👤';
    default:
      return '❓';
  }
}