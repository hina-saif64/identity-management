import { useState, useEffect, useCallback } from 'react';
import { ConnectionState, CloudConnectionState } from '../types';

interface ConnectionHealth {
  ad: {
    isHealthy: boolean;
    lastChecked: Date | null;
    error: string | null;
  };
  cloud: {
    isHealthy: boolean;
    lastChecked: Date | null;
    error: string | null;
  };
}

export const useConnectionHealth = (
  connection: ConnectionState,
  cloudConnection: CloudConnectionState,
  backendUrl: string
) => {
  const [health, setHealth] = useState<ConnectionHealth>({
    ad: { isHealthy: false, lastChecked: null, error: null },
    cloud: { isHealthy: false, lastChecked: null, error: null }
  });

  const checkAdHealth = useCallback(async () => {
    if (!connection.isConnected || !connection.sessionId) {
      setHealth(prev => ({
        ...prev,
        ad: { isHealthy: false, lastChecked: new Date(), error: 'Not connected' }
      }));
      return false;
    }

    try {
      // Use a simple health check endpoint instead of full connection test
      const response = await fetch(`${backendUrl}/api/ad/health`, {
        method: 'GET',
        headers: {
          'X-Hyperion-Key': 'dev-gateway-key-change-in-production',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      const isHealthy = result.status === 'online';
      
      setHealth(prev => ({
        ...prev,
        ad: { 
          isHealthy, 
          lastChecked: new Date(), 
          error: isHealthy ? null : result.error || 'Health check failed' 
        }
      }));
      return isHealthy;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setHealth(prev => ({
        ...prev,
        ad: { isHealthy: false, lastChecked: new Date(), error: errorMsg }
      }));
      return false;
    }
  }, [connection.isConnected, connection.sessionId, backendUrl]);

  const checkCloudHealth = useCallback(async () => {
    if (!cloudConnection.isConnected || !cloudConnection.tenantId) {
      setHealth(prev => ({
        ...prev,
        cloud: { isHealthy: false, lastChecked: new Date(), error: 'Not connected' }
      }));
      return false;
    }

    try {
      const response = await fetch(`${backendUrl}/api/cloud/health`, {
        method: 'GET',
        headers: {
          'X-Hyperion-Key': 'dev-gateway-key-change-in-production',
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      const isHealthy = result.status === 'online';
      
      setHealth(prev => ({
        ...prev,
        cloud: { 
          isHealthy, 
          lastChecked: new Date(), 
          error: isHealthy ? null : result.error || 'Health check failed' 
        }
      }));
      return isHealthy;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setHealth(prev => ({
        ...prev,
        cloud: { isHealthy: false, lastChecked: new Date(), error: errorMsg }
      }));
      return false;
    }
  }, [cloudConnection.isConnected, cloudConnection.tenantId, backendUrl]);

  const checkAllHealth = useCallback(async () => {
    const [adHealthy, cloudHealthy] = await Promise.all([
      checkAdHealth(),
      checkCloudHealth()
    ]);
    return { ad: adHealthy, cloud: cloudHealthy };
  }, [checkAdHealth, checkCloudHealth]);

  // Periodic health checks every 2 minutes (less frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAllHealth();
    }, 120000); // 2 minutes instead of 30 seconds

    // Initial check after 5 seconds to let connections stabilize
    const initialCheck = setTimeout(() => {
      checkAllHealth();
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialCheck);
    };
  }, [checkAllHealth]);

  return {
    health,
    checkAdHealth,
    checkCloudHealth,
    checkAllHealth
  };
};