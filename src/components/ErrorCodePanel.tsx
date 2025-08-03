import React, { useState } from 'react';
import { ErrorCode, ErrorSeverity, ErrorCategory } from '../types/printer';
import { getErrorSeverityColor, getErrorCategoryIcon } from '../utils/errorCodes';
import { AlertTriangle, CheckCircle, Clock, Filter, Search, X } from 'lucide-react';

interface ErrorCodePanelProps {
  errorCodes: ErrorCode[];
  onResolveError: (errorCode: string) => void;
}

export const ErrorCodePanel: React.FC<ErrorCodePanelProps> = ({ errorCodes, onResolveError }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ErrorCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredErrors = errorCodes.filter(error => {
    // Status filter
    if (filter === 'active' && error.resolved) return false;
    if (filter === 'resolved' && !error.resolved) return false;
    
    // Severity filter
    if (severityFilter !== 'all' && error.severity !== severityFilter) return false;
    
    // Category filter
    if (categoryFilter !== 'all' && error.category !== categoryFilter) return false;
    
    // Search filter
    if (searchTerm && !error.code.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !error.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const activeErrors = errorCodes.filter(e => !e.resolved);
  const resolvedErrors = errorCodes.filter(e => e.resolved);
  const criticalErrors = activeErrors.filter(e => e.severity === ErrorSeverity.CRITICAL);

  if (errorCodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Error Codes</h3>
          <p className="text-gray-500">This printer has no recorded error codes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Error Codes</h3>
              <p className="text-sm text-gray-500">
                {activeErrors.length} active, {resolvedErrors.length} resolved
                {criticalErrors.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    {criticalErrors.length} critical
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Errors</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value={ErrorSeverity.CRITICAL}>Critical</option>
            <option value={ErrorSeverity.HIGH}>High</option>
            <option value={ErrorSeverity.MEDIUM}>Medium</option>
            <option value={ErrorSeverity.LOW}>Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value={ErrorCategory.PAPER}>Paper</option>
            <option value={ErrorCategory.INK_TONER}>Ink/Toner</option>
            <option value={ErrorCategory.MECHANICAL}>Mechanical</option>
            <option value={ErrorCategory.NETWORK}>Network</option>
            <option value={ErrorCategory.SYSTEM}>System</option>
            <option value={ErrorCategory.USER_INTERVENTION}>User Action</option>
          </select>
        </div>
      </div>

      {/* Error List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredErrors.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No errors match your current filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredErrors.map((error, index) => (
              <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">{getErrorCategoryIcon(error.category)}</span>
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getErrorSeverityColor(error.severity)}`}>
                        {error.code}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        error.resolved 
                          ? 'text-green-600 bg-green-50 border border-green-200' 
                          : 'text-orange-600 bg-orange-50 border border-orange-200'
                      }`}>
                        {error.resolved ? 'Resolved' : 'Active'}
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-1">{error.description}</h4>
                    
                    {error.solution && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Solution:</strong> {error.solution}
                      </p>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {error.timestamp.toLocaleString()}
                      <span className="mx-2">•</span>
                      <span className="capitalize">{error.severity} severity</span>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{error.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  {!error.resolved && (
                    <button
                      onClick={() => onResolveError(error.code)}
                      className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};