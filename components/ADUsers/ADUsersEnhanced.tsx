// User Intelligence Enhanced - Main component with User Intelligence Panel
// Label: USER-INTEL-ENHANCED

import React from 'react';
import { UserIntelligencePanel } from './components/UserIntelligencePanel';
import { UserIntelligenceErrorBoundary } from './components/UserIntelligenceErrorBoundary';
import type { UserTableProps } from './types/adUsers.types';
import type { CloudConnectionState, ExchangeConnectionState } from '../../types';

interface ADUsersEnhancedProps extends UserTableProps {
    cloudConnection?: CloudConnectionState;
    exchangeConnection?: ExchangeConnectionState;
    enableEnhancedMode?: boolean; // Deprecated prop kept for compatibility
}

/**
 * Enhanced User Intelligence component that provides:
 * - Multi-source user intelligence (AD, Entra ID, Exchange)
 * - Advanced dashboard with enhanced tiles
 * - Progressive loading with real-time updates
 * - Data persistence across tab switches
 */
export const ADUsersEnhanced: React.FC<ADUsersEnhancedProps> = ({
    connection,
    cloudConnection,
    exchangeConnection,
    addLog,
    persistedState,
    onStateChange
}) => {
    const handleBoundaryError = React.useCallback((error: Error) => {
        addLog(`User Intelligence Panel crashed: ${error.message}`, 'USER-INTEL', 'error');
    }, [addLog]);

    // Enhanced mode with User Intelligence Panel wrapped in Error Boundary
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        User Intelligence
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                            Enhanced Mode
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                            Multi-Source Intelligence
                        </span>
                    </div>
                </div>
            </div>

            {/* User Intelligence Panel with Error Boundary */}
            <UserIntelligenceErrorBoundary
                onError={handleBoundaryError}
            >
                <UserIntelligencePanel
                    connection={connection}
                    cloudConnection={cloudConnection}
                    exchangeConnection={exchangeConnection}
                    addLog={addLog}
                    persistedState={persistedState}
                    onStateChange={onStateChange}
                />
            </UserIntelligenceErrorBoundary>
        </div>
    );
};

export { UserIntelligencePanel };

// Default export is the enhanced version
export default ADUsersEnhanced;