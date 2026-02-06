// Development Label Component
// Displays visual labels in development mode only

import React from 'react';

interface DevLabelProps {
    label: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const DevLabel: React.FC<DevLabelProps> = ({ label, position = 'top-left' }) => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    const positionClasses = {
        'top-left': 'top-0 left-0',
        'top-right': 'top-0 right-0',
        'bottom-left': 'bottom-0 left-0',
        'bottom-right': 'bottom-0 right-0',
    };

    return (
        <div
            className={`absolute ${positionClasses[position]} bg-yellow-400 text-black text-[8px] px-1 py-0.5 font-mono z-50 opacity-75 pointer-events-none select-none`}
            title={`Development Label: ${label}`}
        >
            {label}
        </div>
    );
};

// Hook for adding data-dev-label attribute
export const useDevLabel = (label: string) => {
    return process.env.NODE_ENV === 'development' ? { 'data-dev-label': label } : {};
};
