
import React, { useState } from 'react';
import { Server, X, Loader2, CheckCircle, Link2, Globe, ShieldCheck, AlertTriangle, Key, Cpu, AlertCircle, Info, Database, Fingerprint, Activity } from 'lucide-react';
import { AuthMethod, ConnectionState, ApiResponse } from '../types';
import { apiService } from '../services/apiService';

interface ADConnectionProps {
  onConnect: (config: ConnectionState) => void;
  onClose: () => void;
}

const ADConnection: React.FC<ADConnectionProps> = ({ onConnect, onClose }) => {
  const [method, setMethod] = useState<AuthMethod>('Credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorReport, setErrorReport] = useState<ApiResponse | null>(null);
  
  const [formData, setFormData] = useState({
    domain: 'hyperion.local',
    server: '', 
    username: '',
    password: '',
    gatewayUrl: 'http://localhost:3001',
    vaultName: '',
    secretName: '',
    tenantId: '',
    clientId: '',
    clientSecret: ''
  });

  const handleConnect = async () => {
    setIsLoading(true);
    setErrorReport(null);
    setStatusMessage('Pinging Local Gateway...');
    
    const isAlive = await apiService.checkHealth(formData.gatewayUrl);
    if (!isAlive) {
        setIsLoading(false);
        setStep('error');
        setErrorReport({
            status: 'error',
            error: 'Gateway Not Detected',
            detail: `Hyperion Gateway at ${formData.gatewayUrl} did not respond. Is 'node server.js' running?`,
            code: 'ERR_GATEWAY_OFFLINE'
        });
        return;
    }

    setStatusMessage('Authenticating with Active Directory...');
    
    try {
        const result = await apiService.testAdConnection(formData.gatewayUrl, {
            method,
            server: formData.server,
            domain: formData.domain,
            username: formData.username,
            password: formData.password
        });

        setIsLoading(false);
        
        if (result.status === 'connected') {
          setStep('success');
          setTimeout(() => {
            // CRITICAL FIX: Include the sessionId in the connection state
            onConnect({
              isConnected: true,
              isBackendVerified: true,
              backendUrl: formData.gatewayUrl,
              method,
              domain: formData.domain,
              server: formData.server,
              sessionId: result.sessionId, // THIS WAS MISSING
              psVersion: '7.4'
            });
          }, 1500);
        } else {
          setStep('error');
          setErrorReport(result);
        }
    } catch (e: any) {
        setIsLoading(false);
        setStep('error');
        setErrorReport({ status: 'error', error: 'Network Error', detail: e.message });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl glass border border-slate-700 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Identity Gateway Authentication</h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Secure LDAP/Kerberos Handshake</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="p-10">
          {step === 'form' ? (
            <div className="space-y-8">
              <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl">
                  <button onClick={() => setMethod('Credentials')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${method === 'Credentials' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                      <Key className="w-4 h-4" /> Direct Auth
                  </button>
                  <button onClick={() => setMethod('AzureKeyVault')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${method === 'AzureKeyVault' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                      <Cpu className="w-4 h-4" /> Azure Vault
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2 space-y-2">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">Gateway Bridge Address</label>
                    <div className="relative">
                        <Link2 className="absolute left-4 top-4 w-4 h-4 text-slate-500" />
                        <input type="text" value={formData.gatewayUrl} onChange={e => setFormData({...formData, gatewayUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-blue-500 text-sm font-mono text-slate-300" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">AD Domain</label>
                    <input type="text" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 text-sm text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">DC Address</label>
                    <input type="text" value={formData.server} onChange={e => setFormData({...formData, server: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 text-sm text-white" placeholder="Optional: FQDN or IP" />
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Username</label>
                    <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 text-sm text-white" />
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 outline-none focus:border-blue-500 text-sm text-white" />
                 </div>
              </div>

              <button 
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-3xl font-black text-white shadow-2xl shadow-blue-500/20 transition-all flex items-center justify-center gap-4 text-sm uppercase tracking-widest"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
                <span>{isLoading ? statusMessage : 'Authorize and Bind Session'}</span>
              </button>
            </div>
          ) : step === 'success' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in zoom-in-95">
              <div className="w-24 h-24 bg-green-500/20 rounded-[2rem] flex items-center justify-center mb-8 border border-green-500/30">
                 <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-white">Connection Verified</h3>
              <p className="text-slate-400 mt-3 text-lg">Hyperion Secure Identity flow is live.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-24 h-24 bg-red-500/20 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/30">
                 <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h3 className="text-3xl font-bold text-white">Handshake Failed</h3>
              <div className="mt-6 w-full p-6 bg-red-500/5 border border-red-500/10 rounded-3xl text-left">
                  <p className="text-red-400 font-bold text-xs uppercase mb-2">{errorReport?.error}</p>
                  <p className="text-slate-400 text-xs font-mono">{errorReport?.detail}</p>
              </div>
              <button onClick={() => setStep('form')} className="mt-8 w-full py-4 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest">Retry Configuration</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ADConnection;
