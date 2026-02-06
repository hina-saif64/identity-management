// Progressive Loader - Shows real-time loading progress for multi-source collection
// Label: PROGRESSIVE-LOADER

import React from 'react';
import type { ProgressiveLoadingState } from '../types/enhanced.types';
import { ENHANCED_DEV_LABELS, ENHANCED_ACTION_EMOJIS } from '../constants/enhanced.constants';

interface ProgressiveLoaderProps {
    state: ProgressiveLoadingState;
    sources?: {
        ad: { success: boolean; count: number; duration: number; error?: string };
        entra: { success: boolean; count: number; duration: number; error?: string };
        exchange: { success: boolean; count: number; duration: number; error?: string };
    };
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
    state,
    sources
}) => {
    const getPhaseMessage = (phase: string) => {
        const messages = {
            'initializing': '🚀 Initializing multi-source collection...',
            'loading-ad': '🏢 Loading from Active Directory...',
            'loading-entra': '☁️ Loading from Entra ID...',
            'loading-exchange': '📧 Loading from Exchange Online...',
            'correlating': '🔄 Correlating user data across sources...',
            'complete': '✅ Collection completed successfully!',
            'error': '❌ Collection failed'
        };
        
        return messages[phase as keyof typeof messages] || `Processing: ${phase}`;
    };

    const getSourceIcon = (source: string) => {
        const icons = {
            ad: '🏢',
            entra: '☁️',
            exchange: '📧'
        };
        return icons[source as keyof typeof icons] || '📊';
    };

    const getSourceStatus = (source: string) => {
        if (!sources) return 'pending';
        
        const sourceData = sources[source as keyof typeof sources];
        if (!sourceData) return 'pending';
        
        if (sourceData.error) return 'error';
        if (sourceData.success) return 'success';
        
        return state.currentSource === `loading-${source}` ? 'loading' : 'pending';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
            case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
            case 'loading': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>;
            case 'error':
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>;
            case 'loading':
                return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>;
            default:
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
        }
    };

    return (
        <div 
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            data-dev-label={ENHANCED_DEV_LABELS.PROGRESSIVE_LOADER}
        >
            {/* Main Progress */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {getPhaseMessage(state.phase)}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(state.progress)}%
                    </span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${state.progress}%` }}
                    ></div>
                </div>
                
                {state.estimatedTimeRemaining && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Estimated time remaining: {Math.round(state.estimatedTimeRemaining / 1000)}s
                    </p>
                )}
            </div>

            {/* Source Status */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data Sources
                </h4>
                
                <div className="grid gap-3">
                    {['ad', 'entra', 'exchange'].map(source => {
                        const status = getSourceStatus(source);
                        const sourceData = sources?.[source as keyof typeof sources];
                        
                        return (
                            <div 
                                key={source}
                                className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(status)}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {getSourceIcon(source)}
                                    </span>
                                    <div>
                                        <h5 className="font-medium text-sm">
                                            {source === 'ad' ? 'Active Directory' : 
                                             source === 'entra' ? 'Entra ID' : 
                                             'Exchange Online'}
                                        </h5>
                                        {sourceData && (
                                            <p className="text-xs opacity-75">
                                                {sourceData.success 
                                                    ? `${sourceData.count} users in ${Math.round(sourceData.duration)}ms`
                                                    : sourceData.error || 'Processing...'
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(status)}
                                    <span className="text-xs font-medium capitalize">
                                        {status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Current Activity */}
            {state.currentSource && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                        <div className="animate-pulse">
                            <span className="text-lg">
                                {ENHANCED_ACTION_EMOJIS.PROCESSING}
                            </span>
                        </div>
                        <span className="text-sm text-blue-800 dark:text-blue-200">
                            Currently processing: {state.currentSource.replace('loading-', '').toUpperCase()}
                        </span>
                    </div>
                </div>
            )}

            {/* Completed Sources */}
            {state.completedSources.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Completed: {state.completedSources.join(', ')}
                    </p>
                </div>
            )}
        </div>
    );
};