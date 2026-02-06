import React, { useState, useEffect } from 'react';
import { Shield, X, Loader2, CheckCircle, AlertTriangle, Link2, Database, Cloud, Globe } from 'lucide-react';
import { AuthMethod, ConnectionState, CloudConnectionState, ExchangeConnectionState, ApiResponse } from '../types';
import { apiService } from '../services/apiService';
import { ADAuthForm } from './UniversalAuth/ADAuthForm';
import { CloudAuthForm } from './UniversalAuth/CloudAuthForm';
import { useUniversalAuth } from './UniversalAuth/useUniversalAuth';

interface UniversalAuthProps {
  onConnect: (adConfig: ConnectionState, cloudConfig: CloudConnectionState, exoConfig: ExchangeConnectionState) => void;
  onClose: () => void;
}

type AuthStep = 'form' | 'connecting' | 'success' | 'error';
type AuthType = 'AD' | 'Cloud' | 'Universal';

const CLOUD_STORAGE_KEY = 'hyp_cloud_v3_vault_cfg';
const AD_STORAGE_KEY = 'hyp_ad_v3_session_cfg';

const UniversalAuth: React.FC<UniversalAuthProps> = ({ onConnect, onClose }) => {
  const [authType, setAuthType] = useState<AuthType>('Universal');
  const [adMethod, setAdMethod] = useState<AuthMethod>('Credentials');
  const [step, setStep] = useState<AuthStep>('form');
  const [rememberCredentials, setRememberCredentials] = useState(true);

  const [useUnifiedAuth, setUseUnifiedAuth] = useState(() => {
    const saved = localStorage.getItem('hyp_unified_auth_mode');
    return saved === null ? true : saved === 'true';
  });

  const {
    isLoading,
    statusMessage,
    errorReport,
    setIsLoading,
    setStatusMessage,
    setErrorReport,
    authenticateAD,
    authenticateCloud
  } = useUniversalAuth();

  // AD Form Data
  const [adFormData, setAdFormData] = useState({
    domain: 'hyperion.local',
    server: '',
    username: '',
    password: '',
    gatewayUrl: 'http://localhost:3002', // Fixed: Backend runs on 3002
    vaultName: '',
    secretName: '',
    tenantId: '',
    clientId: '',
    clientSecret: ''
  });

  // Cloud Form Data
  const [cloudFormData, setCloudFormData] = useState({
    tenantId: '',
    appId: '',
    vaultName: 'Hyperion-Prod-Vault',
    secretName: 'M365-Graph-Secret',
    organization: '',
    certificateThumbprint: '',
    gatewayUrl: 'http://localhost:3002' // Fixed: Backend runs on 3002
  });

  // Load saved configurations
  useEffect(() => {
    const savedCloudConfig = localStorage.getItem(CLOUD_STORAGE_KEY);
    const savedAdConfig = localStorage.getItem(AD_STORAGE_KEY);

    if (savedCloudConfig) {
      try {
        const parsed = JSON.parse(savedCloudConfig);
        setCloudFormData(prev => ({ ...prev, ...parsed }));
        if (parsed.gatewayUrl) {
          setAdFormData(prev => ({ ...prev, gatewayUrl: parsed.gatewayUrl }));
        }
      } catch (e) {
        console.error("Cloud Config Corrupt", e);
      }
    }

    if (savedAdConfig) {
      try {
        const parsed = JSON.parse(savedAdConfig);
        if (parsed.password && parsed.method === 'Credentials') {
          parsed.password = atob(parsed.password);
        }
        if (parsed.clientSecret && parsed.method === 'AzureKeyVault') {
          parsed.clientSecret = atob(parsed.clientSecret);
        }
        setAdFormData(prev => ({ ...prev, ...parsed }));
        if (parsed.method) {
          setAdMethod(parsed.method);
        }
      } catch (e) {
        console.error("AD Config Corrupt", e);
      }
    }
  }, []);

  const handleUniversalConnect = async () => {
    try {
      setIsLoading(true);
      setErrorReport(null);
      setStep('connecting');
      setStatusMessage('Initializing Universal Authentication...');

      // Check Gateway Health
      setStatusMessage('Pinging Local Gateway...');
      const gatewayUrl = adFormData.gatewayUrl;
      const isAlive = await apiService.checkHealth(gatewayUrl);

      if (!isAlive) {
        throw new Error(`Gateway Not Detected: Hyperion Gateway at ${gatewayUrl} did not respond. Is 'node server.js' running?`);
      }

      let adConnectionState: ConnectionState | null = null;
      let cloudConnectionState: CloudConnectionState | null = null;
      let exoConnectionState: ExchangeConnectionState | null = null;

      // AD Authentication
      if (authType === 'AD' || authType === 'Universal') {
        adConnectionState = await authenticateAD(gatewayUrl, adMethod, adFormData, rememberCredentials);
      }

      // Cloud + Exchange Authentication (Unified or Separate)
      if (authType === 'Cloud' || authType === 'Universal') {
        const { cloud, exchange } = await authenticateCloud(
          gatewayUrl,
          cloudFormData,
          useUnifiedAuth,
          rememberCredentials
        );
        cloudConnectionState = cloud;
        exoConnectionState = exchange;
      }

      // Success
      setStep('success');
      setStatusMessage('Universal Authentication Complete');

      setTimeout(() => {
        onConnect(
          adConnectionState || {
            isConnected: false,
            isBackendVerified: false,
            backendUrl: '',
            method: null,
            domain: '',
            server: '',
            psVersion: '7.4'
          },
          cloudConnectionState || {
            isConnected: false,
            tenantId: '',
            appId: '',
            vaultName: '',
            secretName: '',
            organization: '',
            certificateThumbprint: '',
            verifiedDomains: []
          },
          exoConnectionState || {
            isConnected: false,
            tenantId: '',
            appId: '',
            organization: ''
          }
        );
      }, 1500);

    } catch (error: any) {
      console.error('Universal Auth Error:', error);
      setIsLoading(false);
      setStep('error');
      setErrorReport({
        status: 'error',
        error: 'Universal Authentication Failed',
        detail: error.message,
        code: 'ERR_UNIVERSAL_AUTH'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-2 overflow-y-auto">
      <div className="w-full max-w-lg glass border border-slate-700 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-600/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
              <Shield className="w-3 h-3 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Universal Authentication</h2>
              <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                Unified AD & Cloud Identity Gateway
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          {step === 'form' ? (
            <div className="space-y-4">
              {/* Authentication Type Selection */}
              <div className="space-y-2">
                <label className="block text-[8px] font-black text-blue-400 uppercase tracking-widest">
                  Authentication Scope
                </label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <button
                    onClick={() => setAuthType('AD')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${authType === 'AD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
                      }`}
                  >
                    <Database className="w-2.5 h-2.5" /> AD Only
                  </button>
                  <button
                    onClick={() => setAuthType('Cloud')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${authType === 'Cloud' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
                      }`}
                  >
                    <Cloud className="w-2.5 h-2.5" /> Cloud Only
                  </button>
                  <button
                    onClick={() => setAuthType('Universal')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${authType === 'Universal' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
                      }`}
                  >
                    <Shield className="w-2.5 h-2.5" /> Universal
                  </button>
                </div>
              </div>

              {/* Gateway Configuration */}
              <div className="space-y-1">
                <label className="block text-[8px] font-black text-blue-400 uppercase tracking-widest">
                  Gateway Bridge Address
                </label>
                <div className="relative">
                  <Link2 className="absolute left-2.5 top-2.5 w-2.5 h-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={adFormData.gatewayUrl}
                    onChange={e => {
                      setAdFormData({ ...adFormData, gatewayUrl: e.target.value });
                      setCloudFormData({ ...cloudFormData, gatewayUrl: e.target.value });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-2 outline-none focus:border-blue-500 text-xs font-mono text-slate-300"
                  />
                </div>
              </div>

              {/* AD Configuration */}
              {(authType === 'AD' || authType === 'Universal') && (
                <ADAuthForm
                  adMethod={adMethod}
                  setAdMethod={setAdMethod}
                  formData={adFormData}
                  setFormData={setAdFormData}
                  cloudFormData={cloudFormData}
                  isUniversalMode={authType === 'Universal'}
                />
              )}

              {/* Cloud Configuration */}
              {(authType === 'Cloud' || authType === 'Universal') && (
                <CloudAuthForm
                  formData={cloudFormData}
                  setFormData={setCloudFormData}
                  useUnifiedAuth={useUnifiedAuth}
                  setUseUnifiedAuth={setUseUnifiedAuth}
                />
              )}

              {/* Remember Credentials */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberCredentials}
                    onChange={(e) => setRememberCredentials(e.target.checked)}
                    className="w-3 h-3 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="remember" className="text-xs text-slate-400">
                    Remember configuration for auto-connect
                  </label>
                </div>

                {rememberCredentials && (
                  <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-[9px] text-yellow-400 font-medium">
                      <strong>Security Notice:</strong> Credentials are stored locally with basic encoding.
                      For production, use Azure Key Vault method.
                    </p>
                  </div>
                )}
              </div>

              {/* Connect Button */}
              <button
                onClick={handleUniversalConnect}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {authType === 'Universal' ? 'CONNECT UNIVERSAL' : `CONNECT ${authType}`}
              </button>
            </div>
          ) : step === 'connecting' ? (
            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Connecting...</h3>
              <p className="text-sm text-slate-400">{statusMessage}</p>
            </div>
          ) : step === 'success' ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Authentication Successful</h3>
              <p className="text-sm text-slate-400">Redirecting...</p>
            </div>
          ) : (
            <div className="py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 text-center">Authentication Failed</h3>
              {errorReport && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-medium">{errorReport.error}</p>
                  <p className="text-xs text-red-300 mt-1">{errorReport.detail}</p>
                </div>
              )}
              <button
                onClick={() => setStep('form')}
                className="w-full mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UniversalAuth;