/**
 * Demo Mode Indicator - Shows this is a demo environment
 */

import React from 'react';
import { Eye } from 'lucide-react';

export const DemoIndicator: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center py-2 px-4">
      <div className="flex items-center justify-center space-x-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">
          🎭 DEMO MODE - All data is simulated for demonstration purposes
        </span>
        <Eye className="w-4 h-4" />
      </div>
    </div>
  );
};