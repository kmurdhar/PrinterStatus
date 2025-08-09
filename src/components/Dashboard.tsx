import React, { useState, useEffect } from 'react';
import { Printer, PrinterStatus } from '../types/printer';
import { printerService } from '../services/printerService';
import { PrinterCard } from './PrinterCard';
import { PrinterModal } from './PrinterModal';
import { StatusFilter } from './StatusFilter';
import { SearchBar } from './SearchBar';
import { PrinterSetup } from './PrinterSetup';
import { getStatusConfig } from '../utils/printerUtils';
import { RefreshCw, Activity, AlertCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<PrinterStatus[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load printers on component mount
  useEffect(() => {
    loadPrinters();
    
    // Start automatic monitoring after a short delay
    const timer = setTimeout(() => {
      printerService.startMonitoring(30000); // Check every 30 seconds
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      printerService.stopMonitoring();
    };
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (printers.length > 0) {
        loadPrinters();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [printers.length]);

  const loadPrinters = async () => {
    try {
      setError(null);
      console.log('Loading printers...');
      const currentPrinters = printerService.getAllPrinters();
      console.log(`Found ${currentPrinters.length} configured printers`);
      setPrinters(currentPrinters);
      
      if (currentPrinters.length > 0) {
        console.log('Checking status of all printers...');
        const updatedPrinters = await printerService.checkAllPrinters();
        console.log('Status check completed');
        setPrinters(updatedPrinters);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = 'Failed to detect printer status. This may be due to:\n• Network restrictions (CORS policy)\n• Printer web interface disabled\n• Firewall blocking connections\n• Printer not on same network';
      setError(errorMessage);
      console.error('Error loading printers:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPrinters();
    setIsRefreshing(false);
  };

  const handlePrinterAdded = () => {
    loadPrinters();
  };

  const handlePrinterClick = (printer: Printer) => {
    setSelectedPrinter(printer);
    setIsModalOpen(true);
  };

  const handleStatusToggle = (status: PrinterStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Filter printers based on search and status
  const filteredPrinters = printers.filter(printer => {
    const matchesSearch = printer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         printer.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(printer.status);
    
    return matchesSearch && matchesStatus;
  });

  // Calculate status counts
  const statusCounts = printers.reduce((acc, printer) => {
    acc[printer.status] = (acc[printer.status] || 0) + 1;
    return acc;
  }, {} as Record<PrinterStatus, number>);

  // Calculate summary stats
  const totalPrinters = printers.length;
  const onlinePrinters = printers.filter(p => p.status !== PrinterStatus.OFFLINE).length;
  const errorPrinters = printers.filter(p => 
    [PrinterStatus.ERROR, PrinterStatus.PAPER_JAM, PrinterStatus.CARTRIDGE_ISSUE].includes(p.status)
  ).length;
  const printersWithMessages = printers.filter(p => p.currentMessage && p.status !== PrinterStatus.READY).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Printer Status Monitor</h1>
                <p className="text-sm text-gray-500">Real-time printer monitoring dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <PrinterSetup onPrinterAdded={handlePrinterAdded} />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Printers</p>
                <p className="text-2xl font-semibold text-gray-900">{totalPrinters}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-green-600 text-xl">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-semibold text-gray-900">{onlinePrinters}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-semibold text-gray-900">{errorPrinters}</p>
              </div>
            </div>
          </div>
          
          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-orange-600 text-xl">💬</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">With Messages</p>
                <p className="text-2xl font-semibold text-gray-900">{printersWithMessages}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        {printers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            </div>
            <div>
              <StatusFilter 
                selectedStatuses={selectedStatuses}
                onStatusToggle={handleStatusToggle}
                statusCounts={statusCounts}
              />
            </div>
          </div>
        )}

        {/* Printer Grid */}
        {printers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🖨️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No printers configured</h3>
            <p className="text-gray-500 mb-4">Add your first printer to start monitoring.</p>
            <PrinterSetup onPrinterAdded={handlePrinterAdded} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrinters.map((printer) => (
                <PrinterCard
                  key={printer.id}
                  printer={printer}
                  onClick={handlePrinterClick}
                />
              ))}
            </div>

            {filteredPrinters.length === 0 && printers.length > 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No printers match your filters</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </>
        )}

        {/* Last Refresh Info */}
        {printers.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Last refreshed: {lastRefresh.toLocaleTimeString()} • Auto-refresh every 30 seconds
            <br />
            <span className="text-xs text-blue-600">
              💡 Tip: The system reads actual printer status messages. If your printer is working fine, it should show "Ready" status.
              Current messages are cleared automatically when issues are resolved.
            </span>
          </div>
        )}
      </div>

      {/* Printer Detail Modal */}
      <PrinterModal
        printer={selectedPrinter}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};