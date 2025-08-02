import React, { useState } from 'react';
import { Plus, X, Wifi, MapPin, Monitor } from 'lucide-react';
import { printerService, PrinterConfig } from '../services/printerService';

interface PrinterSetupProps {
  onPrinterAdded: () => void;
}

export const PrinterSetup: React.FC<PrinterSetupProps> = ({ onPrinterAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<PrinterConfig, 'id'>>({
    name: '',
    ipAddress: '',
    location: '',
    model: ''
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    try {
      // Validate IP address format
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(formData.ipAddress)) {
        alert('Please enter a valid IP address (e.g., 192.168.1.100)');
        setIsAdding(false);
        return;
      }

      const config: PrinterConfig = {
        ...formData,
        id: `printer_${Date.now()}`
      };

      printerService.addPrinter(config);
      
      // Test connection
      const printer = printerService.getPrinter(config.id);
      if (printer) {
        await printerService.checkPrinterStatus(printer);
      }

      onPrinterAdded();
      setIsOpen(false);
      setFormData({ name: '', ipAddress: '', location: '', model: '' });
      
      // Show success message
      alert(`Printer "${formData.name}" has been added successfully! Status will update within 30 seconds.`);
    } catch (error) {
      console.error('Failed to add printer:', error);
      alert(`Printer "${formData.name}" has been added. Status detection will begin automatically.`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add Printer</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Printer</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Printer Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Office Printer 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Wifi className="w-4 h-4 inline mr-1" />
              IP Address
            </label>
            <input
              type="text"
              required
              value={formData.ipAddress}
              onChange={(e) => handleInputChange('ipAddress', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 192.168.1.100"
              pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Office Floor 1 - Reception"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Monitor className="w-4 h-4 inline mr-1" />
              Model
            </label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., HP LaserJet Pro M404n"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAdding}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add Printer'}
            </button>
          </div>
        </form>

        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Instructions:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure the printer is connected to your network</li>
              <li>• Find the printer's IP address from its settings menu</li>
              <li>• Make sure the printer's web interface is enabled</li>
              <li>• Test connectivity by visiting http://[IP] in your browser</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};