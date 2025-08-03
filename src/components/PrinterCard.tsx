import React from 'react';
import { Printer } from '../types/printer';
import { getStatusConfig, formatLastUpdated, getInkLevelColor, getPaperLevelColor } from '../utils/printerUtils';
import { Printer as PrinterIcon, MapPin, Clock, Droplets, FileText, AlertTriangle } from 'lucide-react';

interface PrinterCardProps {
  printer: Printer;
  onClick: (printer: Printer) => void;
}

export const PrinterCard: React.FC<PrinterCardProps> = ({ printer, onClick }) => {
  const statusConfig = getStatusConfig(printer.status);
  const activeErrors = (printer.errorCodes || []).filter(error => !error.resolved);
  const criticalErrors = activeErrors.filter(error => error.severity === 'critical');
  
  return (
    <div 
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-100"
      onClick={() => onClick(printer)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <PrinterIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{printer.name}</h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {printer.location}
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color} ${statusConfig.bgColor} flex items-center space-x-1`}>
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Error Indicators */}
        {activeErrors.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Printer Messages
              </div>
              <span className="text-sm font-medium text-red-700">{activeErrors.length}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {activeErrors.slice(0, 3).map((error, index) => (
                <span 
                  key={index}
                  className={`px-2 py-1 text-xs rounded ${
                    error.severity === 'critical' 
                      ? 'bg-red-100 text-red-800 border border-red-200' 
                      : 'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}
                >
                  {error.description}
                </span>
              ))}
              {activeErrors.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  +{activeErrors.length - 3} more
                </span>
              )}
            </div>
            {criticalErrors.length > 0 && (
              <div className="mt-2 text-xs text-red-600 font-medium">
                ⚠️ {criticalErrors.length} critical error{criticalErrors.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Ink Levels */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm text-gray-600">
              <Droplets className="w-4 h-4 mr-1" />
              Ink Levels
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(printer.inkLevels).map(([color, level]) => (
              <div key={color} className="text-center">
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getInkLevelColor(level)}`}
                    style={{ width: `${level}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 capitalize">{color}</span>
                <div className="text-xs font-medium text-gray-700">{level}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Paper Level */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-1" />
              Paper Level
            </div>
            <span className="text-sm font-medium text-gray-700">{printer.paperLevel}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getPaperLevelColor(printer.paperLevel)}`}
              style={{ width: `${printer.paperLevel}%` }}
            ></div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          <Clock className="w-3 h-3 mr-1" />
          Last updated {formatLastUpdated(printer.lastUpdated)}
          {printer.lastErrorCode && (
            <>
              <span className="mx-2">•</span>
              <span className="text-red-600">Last error: {printer.lastErrorCode}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};