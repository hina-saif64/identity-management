
import { EnhancedUser, EnhancedFilters } from '../../../components/ADUsers/types/enhanced.types';
import { ENHANCED_TILES } from '../../../components/ADUsers/constants/enhanced.constants';

/**
 * Filters users based on dashboard state (tile selection and active filters)
 */
export const filterUsers = (
    users: EnhancedUser[],
    activeFilters: EnhancedFilters,
    selectedTile: string | null = null,
    isSummaryAvailable: boolean = true
): EnhancedUser[] => {
    let filtered = [...users];

    // 1. Apply Tile Filters (High-level grouping)
    if (selectedTile && isSummaryAvailable) {
        const tile = ENHANCED_TILES.find(t => t.id === selectedTile);
        if (tile) {
            switch (tile.id) {
                case 'total':
                    // No filter needed
                    break;
                case 'enabled':
                    filtered = filtered.filter(u => u.status === 'Active');
                    break;
                case 'disabled':
                    filtered = filtered.filter(u => u.status === 'Disabled');
                    break;
                case 'guest':
                    filtered = filtered.filter(u => u.isGuest);
                    break;
                case 'target':
                    filtered = filtered.filter(u => u.isTarget);
                    break;
                case 'privileged':
                    filtered = filtered.filter(u => u.isPrivileged);
                    break;
                case 'service':
                    filtered = filtered.filter(u => u.isServiceAccount);
                    break;
                case 'at-risk':
                    filtered = filtered.filter(u => u.riskFactors.length > 0);
                    break;
                case 'healthy':
                    filtered = filtered.filter(u => u.healthStatus === 'Active');
                    break;
                case 'stalled':
                    // FIXED: Use same logic as tile calculation
                    filtered = filtered.filter(u => {
                        if (u.isGuest || u.isTarget || u.upn?.includes('#EXT#')) return false;
                        
                        // Get latest login date from AD, Entra, or usage data
                        const adLastLogin = u.lastLogin && u.lastLogin !== 'Never' ? new Date(u.lastLogin) : null;
                        const entraLastLogin = u.entraData?.lastSignIn ? new Date(u.entraData.lastSignIn) : null;
                        const usageLastLogin = u.usageData?.lastInteractiveSignIn ? new Date(u.usageData.lastInteractiveSignIn) : null;
                        
                        // Use the most recent date
                        const latestLogin = [adLastLogin, entraLastLogin, usageLastLogin]
                            .filter(d => d !== null)
                            .sort((a, b) => b!.getTime() - a!.getTime())[0];
                        
                        if (!latestLogin) return false; // No login data
                        
                        // Stale if no activity in last 90 days
                        const ninetyDaysAgo = new Date();
                        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                        
                        const isStale = latestLogin < ninetyDaysAgo;
                        
                        // Debug first 5 stale users
                        if (isStale && Math.random() < 0.01) {
                            console.log('🔍 Stale user found:', {
                                name: u.name,
                                upn: u.upn,
                                adLastLogin: u.lastLogin,
                                entraLastLogin: u.entraData?.lastSignIn,
                                usageLastLogin: u.usageData?.lastInteractiveSignIn,
                                latestLogin: latestLogin.toISOString(),
                                ninetyDaysAgo: ninetyDaysAgo.toISOString(),
                                isStale
                            });
                        }
                        
                        return isStale;
                    });
                    console.log(`🔍 Stalled filter applied: ${filtered.length} users out of ${users.length}`);
                    break;
                case 'neverLogin':
                    filtered = filtered.filter(u => u.lastLogin === 'Never');
                    break;
                case 'ad-total':
                    filtered = filtered.filter(u => u.sources.ad && !u.isGuest && !u.isTarget);
                    break;
                case 'entra-total':
                    filtered = filtered.filter(u => u.sources.entra && !u.isGuest && !u.isTarget);
                    break;
                case 'ad-unsynced':
                    // Strict "AD Only" (Unsynced)
                    filtered = filtered.filter(u => u.sources.ad && !u.sources.entra && !u.sources.exchange && !u.isGuest && !u.isTarget);
                    break;
                case 'entra-cloud-only':
                    // Strict "Entra Only" (Cloud Native)
                    filtered = filtered.filter(u => !u.sources.ad && u.sources.entra && !u.sources.exchange && !u.isGuest && !u.isTarget);
                    break;
                case 'exchange-only':
                    filtered = filtered.filter(u => u.sources.exchange && !u.isGuest && !u.isTarget);
                    break;
                case 'all-sources':
                    filtered = filtered.filter(u => u.sources.ad && u.sources.entra && u.sources.exchange && !u.isGuest && !u.isTarget);
                    break;
            }
        }
    }

    // 2. Apply Custom Filters
    const filters = activeFilters;

    // Status Filter
    if (filters.status && filters.status !== 'All') {
        filtered = filtered.filter(u => u.status === filters.status);
    }

    // User Type Filter
    if (filters.userType && filters.userType !== 'All') {
        if (filters.userType === 'Guest') {
            filtered = filtered.filter(u => u.isGuest);
        } else {
            filtered = filtered.filter(u => !u.isGuest);
        }
    }

    // Health Status Filter
    if (filters.healthStatus && filters.healthStatus !== 'All') {
        filtered = filtered.filter(u => u.healthStatus === filters.healthStatus);
    }

    // Source Filter
    if (filters.sources && filters.sources.length > 0) {
        filtered = filtered.filter(u =>
            filters.sources!.every(source => u.sources[source as keyof typeof u.sources])
        );
    }

    // 3. Apply Search (Text Filter)
    if (filters.searchString) {
        const searchTerm = filters.searchString.toLowerCase();
        filtered = filtered.filter(u =>
            u.name?.toLowerCase().includes(searchTerm) ||
            u.email?.toLowerCase().includes(searchTerm) ||
            u.samAccountName?.toLowerCase().includes(searchTerm) ||
            u.upn?.toLowerCase().includes(searchTerm) ||
            (u.description && u.description.toLowerCase().includes(searchTerm)) ||
            (u.department && u.department.toLowerCase().includes(searchTerm))
        );
    }

    return filtered;
};
