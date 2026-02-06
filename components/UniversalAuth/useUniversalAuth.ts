import { useState } from 'react';
import { apiService } from '../../services/apiService';
import { ConnectionState, CloudConnectionState, ExchangeConnectionState, AuthMethod } from '../../types';

const CLOUD_STORAGE_KEY = 'hyp_cloud_v3_vault_cfg';
const AD_STORAGE_KEY = 'hyp_ad_v3_session_cfg';

export const useUniversalAuth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [errorReport, setErrorReport] = useState<any>(null);

    /**
     * Authenticate with Active Directory
     */
    const authenticateAD = async (
        gatewayUrl: string,
        adMethod: AuthMethod,
        adFormData: any,
        rememberCredentials: boolean
    ): Promise<ConnectionState | null> => {
        setStatusMessage('Authenticating with Active Directory...');

        const adResult = await apiService.testAdConnection(gatewayUrl, {
            method: adMethod,
            server: adFormData.server,
            domain: adFormData.domain,
            username: adFormData.username,
            password: adFormData.password,
            ...(adMethod === 'AzureKeyVault' && {
                tenantId: adFormData.tenantId,
                clientId: adFormData.clientId,
                clientSecret: adFormData.clientSecret,
                vaultName: adFormData.vaultName,
                secretName: adFormData.secretName
            })
        });

        if (adResult.status === 'connected') {
            const adConnectionState: ConnectionState = {
                isConnected: true,
                isBackendVerified: true,
                backendUrl: gatewayUrl,
                method: adMethod,
                domain: adFormData.domain,
                server: adFormData.server,
                sessionId: adResult.sessionId,
                psVersion: '7.4'
            };

            if (rememberCredentials) {
                const adConfigToSave: any = {
                    server: adFormData.server,
                    domain: adFormData.domain,
                    username: adFormData.username,
                    method: adMethod,
                    gatewayUrl
                };

                if (adMethod === 'AzureKeyVault') {
                    Object.assign(adConfigToSave, {
                        tenantId: adFormData.tenantId,
                        clientId: adFormData.clientId,
                        clientSecret: btoa(adFormData.clientSecret),
                        vaultName: adFormData.vaultName,
                        secretName: adFormData.secretName
                    });
                } else {
                    Object.assign(adConfigToSave, {
                        password: btoa(adFormData.password)
                    });
                }

                localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(adConfigToSave));
            }

            return adConnectionState;
        } else {
            throw new Error(`AD Authentication Failed: ${adResult.error || adResult.detail}`);
        }
    };

    /**
     * Authenticate with Cloud (Unified or Separate mode)
     */
    const authenticateCloud = async (
        gatewayUrl: string,
        cloudFormData: any,
        useUnifiedAuth: boolean,
        rememberCredentials: boolean
    ): Promise<{ cloud: CloudConnectionState | null; exchange: ExchangeConnectionState | null }> => {
        if (useUnifiedAuth) {
            // UNIFIED MODE
            setStatusMessage('Establishing Unified Cloud + Exchange Bridge...');

            const unifiedResult = await apiService.connectUnified(gatewayUrl, {
                tenantId: cloudFormData.tenantId,
                appId: cloudFormData.appId,
                vaultName: cloudFormData.vaultName,
                secretName: cloudFormData.secretName,
                organization: cloudFormData.organization,
                certificateThumbprint: cloudFormData.certificateThumbprint
            });

            if (unifiedResult.status === 'connected') {
                const cloudState: CloudConnectionState = {
                    isConnected: true,
                    tenantId: cloudFormData.tenantId,
                    appId: cloudFormData.appId,
                    vaultName: cloudFormData.vaultName,
                    secretName: cloudFormData.secretName,
                    organization: cloudFormData.organization,
                    certificateThumbprint: cloudFormData.certificateThumbprint,
                    verifiedDomains: unifiedResult.cloud.verifiedDomains || []
                };

                const exchangeState: ExchangeConnectionState | null = unifiedResult.exchange.connected ? {
                    isConnected: true,
                    tenantId: cloudFormData.tenantId,
                    appId: cloudFormData.appId,
                    organization: cloudFormData.organization,
                    connectedAt: new Date(),
                    sessionId: unifiedResult.exchange.sessionId
                } : null;

                if (rememberCredentials) {
                    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify({
                        ...cloudFormData,
                        gatewayUrl
                    }));
                }

                return { cloud: cloudState, exchange: exchangeState };
            } else {
                throw new Error(`Unified Authentication Failed: ${unifiedResult.error || unifiedResult.detail}`);
            }
        } else {
            // SEPARATE MODE
            setStatusMessage('Establishing Cloud Bridge...');

            const cloudResult = await apiService.connectCloud(gatewayUrl, {
                tenantId: cloudFormData.tenantId,
                appId: cloudFormData.appId,
                vaultName: cloudFormData.vaultName,
                secretName: cloudFormData.secretName,
                organization: cloudFormData.organization,
                certificateThumbprint: cloudFormData.certificateThumbprint
            });

            if (cloudResult.status === 'connected') {
                const cloudState: CloudConnectionState = {
                    isConnected: true,
                    tenantId: cloudFormData.tenantId,
                    appId: cloudFormData.appId,
                    vaultName: cloudFormData.vaultName,
                    secretName: cloudFormData.secretName,
                    organization: cloudFormData.organization,
                    certificateThumbprint: cloudFormData.certificateThumbprint,
                    verifiedDomains: cloudResult.verifiedDomains || []
                };

                if (rememberCredentials) {
                    localStorage.setItem(CLOUD_STORAGE_KEY, JSON.stringify({
                        ...cloudFormData,
                        gatewayUrl
                    }));
                }

                return { cloud: cloudState, exchange: null };
            } else {
                throw new Error(`Cloud Authentication Failed: ${cloudResult.error || cloudResult.detail}`);
            }
        }
    };

    return {
        isLoading,
        statusMessage,
        errorReport,
        setIsLoading,
        setStatusMessage,
        setErrorReport,
        authenticateAD,
        authenticateCloud
    };
};
