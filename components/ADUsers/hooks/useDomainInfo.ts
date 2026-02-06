// Custom Hook: Domain Info Management
// Label: AD-HOOK-DOMAIN

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/apiService';
import type { ConnectionState } from '../types/adUsers.types';

interface DomainInfo {
    upns: string[];
    ous: { Name: string; DN: string }[];
}

/**
 * Manages domain metadata (UPNs and OUs)
 * 
 * @param {ConnectionState} connection - AD connection state
 * @returns {Object} Domain info and refresh handler
 * 
 * @example
 * const { domainInfo, refreshDomainInfo, loading } = useDomainInfo(connection);
 */
export const useDomainInfo = (connection: ConnectionState) => {
    const [domainInfo, setDomainInfo] = useState<DomainInfo>({ upns: [], ous: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDomainInfo = useCallback(async () => {
        if (!connection.sessionId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await apiService.getDomainInfo(connection.backendUrl, connection.sessionId);

            console.log('=== DOMAIN INFO RESPONSE ===');
            console.log('Full data:', data);
            console.log('UPN fields:', {
                upnSuffixes: data.upnSuffixes,
                UPNSuffixes: data.UPNSuffixes,
                upn: data.upn,
            });

            // Parse UPNs - handle multiple possible field names
            const rawUpns = data.upnSuffixes || data.UPNSuffixes || data.upn || [];
            console.log('Raw UPNs:', rawUpns);

            let upns: string[] = [];
            if (Array.isArray(rawUpns)) {
                upns = rawUpns.filter(u => u && typeof u === 'string');
            } else if (typeof rawUpns === 'string') {
                upns = [rawUpns];
            }

            console.log('Parsed UPNs:', upns);

            // Parse OUs
            let ous: { Name: string; DN: string }[] = [];

            if (data.OUs) {
                const rawOus = Array.isArray(data.OUs) ? data.OUs : [data.OUs];
                ous = rawOus
                    .filter((o: any) => o && o.Name && o.DistinguishedName)
                    .map((o: any) => ({
                        Name: o.Name,
                        DN: o.DistinguishedName,
                    }));
            }

            console.log('Final domain info:', { upns, ous: ous.length });
            setDomainInfo({ upns, ous });
        } catch (err: any) {
            setError(err.message || 'Failed to fetch domain info');
            console.error('Domain info fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [connection.sessionId, connection.backendUrl]);

    // Auto-fetch on mount and when connection changes
    useEffect(() => {
        fetchDomainInfo();
    }, [fetchDomainInfo]);

    return {
        domainInfo,
        loading,
        error,
        refreshDomainInfo: fetchDomainInfo,
    };
};
