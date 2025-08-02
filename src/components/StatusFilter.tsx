import React from 'react';
import { PrinterStatus } from '../types/printer';
import { getStatusConfig } from '../utils/printerUtils';

interface StatusFilterProps {
  selectedStatuses: PrinterStatus[];
  onStatusToggle: (status: PrinterStatus) => void;
  statusCounts: Record<PrinterStatus, number>;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({ 
  selectedStatuses, 
  onStatusToggle, 
  statusCounts 
}) => {
  const allStatuses = Object.values(PrinterStatus);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Status</h3>
      <div className="flex flex-wrap gap-2">
        {allStatuses.map((status) => {
          const config = getStatusConfig(status);
          const isSelected = selectedStatuses.includes(status);
          const count = statusCounts[status] || 0;
          
          return (
            <button
              key={status}
              onClick={() => onStatusToggle(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                isSelected
                  ? `${config.color} ${config.bgColor} ring-2 ring-offset-1 ring-blue-500`
                  : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
              <span className="bg-white bg-opacity-50 px-1.5 py-0.5 rounded text-xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};