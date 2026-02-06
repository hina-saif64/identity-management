// Empty State Component
// Label: AD-EMPTY

import React from 'react';
import { Users, Search } from 'lucide-react';
import { DevLabel } from './DevLabel';

interface EmptyStateProps {
    hasFilters: boolean;
}

/**
 * @module ADUsers/EmptyState
 * @label AD-EMPTY
 * @description Displays empty state when no users are found
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters }) => {
    return (
        <div className="relative flex flex-col items-center justify-center p-12 text-center">
            <DevLabel label="AD-EMPTY" />

            {hasFilters ? (
                <>
                    <Search className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        No users found
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        No users match your current filters. Try adjusting your search criteria or clearing filters.
                    </p>
                </>
            ) : (
                <>
                    <Users className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        No users loaded
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        Click "Execute Policy Scan" to fetch user intelligence.
                    </p>
                </>
            )}
        </div>
    );
};
