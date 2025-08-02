import React from 'react';
import { Printer, PrinterStatus } from '../types/printer';
import { getStatusConfig, formatLastUpdated, getInkLevelColor, getPaperLevelColor } from '../utils/printerUtils';
import { X, Printer as PrinterIcon, MapPin, Monitor, Clock, Droplets, FileText, History } from 'lucide-react';

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

          {/* Network Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">Network Information</label>
            <div className="flex items-center space-x-2 text-gray-700">
              <Monitor className="w-4 h-4" />
              <span>IP Address: {printer.ipAddress}</span>
            </div>
          </div>

          {/* Ink Levels */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-600 flex items-center">
              <Droplets className="w-4 h-4 mr-2" />
              Ink Levels
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(printer.inkLevels).map(([color, level]) => (
                <div key={color} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getInkLevelColor(level)}`}
                      style={{ width: `${level}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{color}</span>
                  <div className="text-lg font-bold text-gray-900">{level}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Paper Level */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Paper Level
            </label>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Paper Tray</span>
                <span className="text-lg font-bold text-gray-900">{printer.paperLevel}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${getPaperLevelColor(printer.paperLevel)}`}
                  style={{ width: `${printer.paperLevel}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-600 flex items-center">
              <History className="w-4 h-4 mr-2" />
              Recent Status History
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {printer.statusHistory.slice(-5).reverse().map((entry, index) => {
                const entryConfig = getStatusConfig(entry.status);
                return (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg">{entryConfig.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${entryConfig.color}`}>
                          {entryConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {entry.timestamp.toLocaleString()}
                        </span>
                      </div>
                      {entry.message && (
                        <p className="text-sm text-gray-600 mt-1">{entry.message}</p>
                      )}
                    </div>
                  </div>
                );
              })}
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