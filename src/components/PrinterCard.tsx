import React from 'react';
import { Printer } from '../types/printer';
import { getStatusConfig, formatLastUpdated, getInkLevelColor, getPaperLevelColor } from '../utils/printerUtils';
import { Printer as PrinterIcon, MapPin, Clock, Droplets, FileText } from 'lucide-react';

interface PrinterCardProps {
  printer: Printer;
  onClick: (printer: Printer) => void;
}

export const PrinterCard: React.FC<PrinterCardProps> = ({ printer, onClick }) => {
  const statusConfig = getStatusConfig(printer.status);
  
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
        </div>
      </div>
    </div>
  );
};