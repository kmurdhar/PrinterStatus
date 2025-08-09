import React from 'react';
import { Printer } from '../types/printer';
import { getStatusConfig, formatLastUpdated } from '../utils/printerUtils';
import { Printer as PrinterIcon, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { PrinterStatus } from '../types/printer';

interface PrinterCardProps {
  printer: Printer;
  onClick: (printer: Printer) => void;
}

export const PrinterCard: React.FC<PrinterCardProps> = ({ printer, onClick }) => {
  const statusConfig = getStatusConfig(printer.status);
  const hasCurrentMessage = printer.currentMessage && printer.status !== PrinterStatus.READY;
  
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

        {/* Printer Messages */}
        {hasCurrentMessage && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Current Message
              </div>
            </div>
            <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800 border border-orange-200">
              {printer.currentMessage}
            </span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          <Clock className="w-3 h-3 mr-1" />
          Last updated {formatLastUpdated(printer.lastUpdated)}
          {printer.currentErrorCode && (
            <>
              <span className="mx-2">•</span>
              <span className="text-red-600">Error: {printer.currentErrorCode}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};