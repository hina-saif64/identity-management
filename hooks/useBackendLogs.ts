/**
 * Hook: useBackendLogs
 * Subscribes to backend SSE log stream and forwards to addLog
 */

import { useEffect, useRef } from 'react';

export const useBackendLogs = (
    addLog: (message: string, module: string, level?: string) => void,
    backendUrl: string = 'http://localhost:3001'
) => {
    const eventSourceRef = useRef<EventSource | null>(null);
    const isConnectedRef = useRef(false);

    useEffect(() => {
        // Don't reconnect if already connected
        if (isConnectedRef.current) return;

        const connect = () => {
            try {
                const eventSource = new EventSource(`${backendUrl}/api/logs/stream`);
                eventSourceRef.current = eventSource;

                eventSource.onopen = () => {
                    isConnectedRef.current = true;
                    console.log('[BackendLogs] SSE connected');
                };

                eventSource.onmessage = (event) => {
                    try {
                        const log = JSON.parse(event.data);
                        // Add [BACKEND] prefix to distinguish from frontend logs
                        addLog(
                            `[BACKEND] ${log.message}`,
                            log.module || 'SYSTEM',
                            log.level || 'info'
                        );
                    } catch (e) {
                        // Ignore parse errors (e.g., heartbeat)
                    }
                };

                eventSource.onerror = () => {
                    isConnectedRef.current = false;
                    eventSource.close();
                    // Reconnect after 5 seconds
                    setTimeout(connect, 5000);
                };
            } catch (e) {
                console.error('[BackendLogs] Failed to connect:', e);
            }
        };

        connect();

        // Cleanup on unmount
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                isConnectedRef.current = false;
            }
        };
    }, [backendUrl]); // Only reconnect if backendUrl changes

    return {
        isConnected: isConnectedRef.current
    };
};

export default useBackendLogs;
