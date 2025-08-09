import React from 'react';
import { Printer, PrinterStatus } from '../types/printer';
import { getStatusConfig, formatLastUpdated } from '../utils/printerUtils';
import { X, Printer as PrinterIcon, MapPin, Monitor, Clock } from 'lucide-react';

interface PrinterModalProps {
  printer: Printer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterModal: React.FC<PrinterModalProps> = ({ printer, isOpen, onClose }) => {
  if (!isOpen || !printer) return null;

  const statusConfig = getStatusConfig(printer.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <PrinterIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{printer.name}</h2>
              <p className="text-sm text-gray-500">{printer.model}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Current Status</label>
              <div className={`px-4 py-2 rounded-lg ${statusConfig.color} ${statusConfig.bgColor} flex items-center space-x-2`}>
                <span className="text-lg">{statusConfig.icon}</span>
                <span className="font-medium">{statusConfig.label}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Location</label>
              <div className="flex items-center space-x-2 text-gray-700">
                <MapPin className="w-4 h-4" />
                <span>{printer.location}</span>
              </div>
            </div>
          </div>

          {/* Current Message */}
          {printer.currentMessage && printer.status !== PrinterStatus.READY && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">Current Message</label>
                {printer.currentErrorCode && (
                  <span className="text-sm font-mono text-red-600 bg-red-50 px-2 py-1 rounded">
                    Error Code: {printer.currentErrorCode}
                  </span>
                )}
              </div>
              <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-orange-800 font-medium">{printer.currentMessage}</p>
              </div>
            </div>
          )}

          {/* Network Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Network Information</label>
            <div className="flex items-center space-x-2 text-gray-700">
              <Monitor className="w-4 h-4" />
              <span>IP Address: {printer.ipAddress}</span>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center text-sm text-gray-500 pt-4 border-t border-gray-200">
            <Clock className="w-4 h-4 mr-2" />
            Last updated {formatLastUpdated(printer.lastUpdated)}
          </div>
        </div>
      </div>
    </div>
  );
};