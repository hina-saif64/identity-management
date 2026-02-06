import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { ConnectionState, CloudConnectionState } from '../types';

export const useIndividualRetry = (
  backendUrl: string,
  onAdSuccess: (connection: ConnectionState) => void,
  onCloudSuccess: (connection: CloudConnectionState) => void,
  onError: (message: string, type: 'ad' | 'cloud') => void
) => {
  const [isRetrying, setIsRetrying] = useState({ ad: false, cloud: false });

  const retryAdConnection = useCallback(async () => {
    setIsRetrying(prev => ({ ...prev, ad: true }));
    
    try {
      // Get saved AD config from localStorage
      const AD_STORAGE_KEY = 'hyp_ad_v3_session_cfg';
      const savedAdConfig = localStorage.getItem(AD_STORAGE_KEY);
      
      if (!savedAdConfig) {
        throw new Error('No saved AD configuration found');
      }

      const adParsed = JSON.parse(savedAdConfig);
      
      // Decode password if it's encoded
      let password = adParsed.password;
      let clientSecret = adParsed.clientSecret;

      if (password && adParsed.method === 'Credentials') {
        try {
          password = atob(password); // Base64 decode
        } catch (e) {
          console.error('Failed to decode saved password');
        }
      }

      if (clientSecret && adParsed.method === 'AzureKeyVault') {
        try {
          clientSecret = atob(clientSecret); // Base64 decode
        } catch (e) {
          console.error('Failed to decode saved client secret');
        }
      }

      const adResult = await apiService.testAdConnection(backendUrl, {
        method: adParsed.method || 'Credentials',
        server: adParsed.server,
        domain: adParsed.domain,
        username: adParsed.username,
        password: password,
        // Key Vault fields if method is AzureKeyVault
        ...(adParsed.method === 'AzureKeyVault' && {
          tenantId: adParsed.tenantId,
          clientId: adParsed.clientId,
          clientSecret: clientSecret,
          vaultName: adParsed.vaultName,
          secretName: adParsed.secretName
        })
      });

      if (adResult.status === 'connected') {
        const newConnection: ConnectionState = {
          isConnected: true,
          isBackendVerified: true,
          backendUrl: backendUrl,
          method: 'Credentials',
          domain: adParsed.domain,
          server: adParsed.server,
          sessionId: adResult.sessionId,
          psVersion: '7.4'
        };
        
        onAdSuccess(newConnection);
      } else {
        throw new Error(adResult.error || 'AD connection failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onError(`AD retry failed: ${errorMsg}`, 'ad');
    } finally {
      setIsRetrying(prev => ({ ...prev, ad: false }));
    }
  }, [backendUrl, onAdSuccess, onError]);

  const retryCloudConnection = useCallback(async () => {
    setIsRetrying(prev => ({ ...prev, cloud: true }));
    
    try {
      // Get saved Cloud config from localStorage
      const CLOUD_STORAGE_KEY = 'hyp_cloud_v3_vault_cfg';
      const savedCloudConfig = localStorage.getItem(CLOUD_STORAGE_KEY);
      
      if (!savedCloudConfig) {
        throw new Error('No saved Cloud configuration found');
      }

      const cloudParsed = JSON.parse(savedCloudConfig);

      const cloudResult = await apiService.connectCloud(backendUrl, {
        tenantId: cloudParsed.tenantId,
        appId: cloudParsed.appId,
        vaultName: cloudParsed.vaultName,
        secretName: cloudParsed.secretName,
        organization: cloudParsed.organization
      });

      if (cloudResult.status === 'connected') {
        const newConnection: CloudConnectionState = {
          isConnected: true,
          tenantId: cloudParsed.tenantId,
          appId: cloudParsed.appId,
          vaultName: cloudParsed.vaultName,
          secretName: cloudParsed.secretName,
          organization: cloudParsed.organization,
          certificateThumbprint: cloudParsed.certificateThumbprint,
          verifiedDomains: cloudResult.verifiedDomains || []
        };
        
        onCloudSuccess(newConnection);
      } else {
        throw new Error(cloudResult.error || 'Cloud connection failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      onError(`Cloud retry failed: ${errorMsg}`, 'cloud');
    } finally {
      setIsRetrying(prev => ({ ...prev, cloud: false }));
    }
  }, [backendUrl, onCloudSuccess, onError]);

  return {
    isRetrying,
    retryAdConnection,
    retryCloudConnection
  };
};