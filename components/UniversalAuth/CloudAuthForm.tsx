import React from 'react';
import { Cloud, Shield } from 'lucide-react';

interface CloudAuthFormProps {
    formData: {
        tenantId: string;
        appId: string;
        vaultName: string;
        secretName: string;
        organization: string;
        certificateThumbprint: string;
    };
    setFormData: (data: any) => void;
    useUnifiedAuth: boolean;
    setUseUnifiedAuth: (value: boolean) => void;
}

export const CloudAuthForm: React.FC<CloudAuthFormProps> = ({
    formData,
    setFormData,
    useUnifiedAuth,
    setUseUnifiedAuth
}) => {
    return (
        <div className="space-y-3">
            {/* Cloud Configuration */}
            <div className="p-3 bg-slate-900/30 border border-slate-800 rounded-lg space-y-3">
                <div className="flex items-center gap-1.5">
                    <Cloud className="w-3 h-3 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white">Cloud Configuration</h3>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Tenant ID
                        </label>
                        <input
                            type="text"
                            placeholder="Tenant ID (GUID)"
                            value={formData.tenantId}
                            onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            App ID
                        </label>
                        <input
                            type="text"
                            placeholder="App (Client) ID"
                            value={formData.appId}
                            onChange={(e) => setFormData({ ...formData, appId: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Vault Name
                        </label>
                        <input
                            type="text"
                            placeholder="Key Vault Name"
                            value={formData.vaultName}
                            onChange={(e) => setFormData({ ...formData, vaultName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Secret Name
                        </label>
                        <input
                            type="text"
                            placeholder="Secret Name"
                            value={formData.secretName}
                            onChange={(e) => setFormData({ ...formData, secretName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5 col-span-2">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Organization
                        </label>
                        <input
                            type="text"
                            placeholder="Organization Name"
                            value={formData.organization}
                            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5 col-span-2">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Certificate Thumbprint (Optional - Required for PowerBI)
                        </label>
                        <input
                            type="text"
                            placeholder="Certificate Thumbprint (SHA1)"
                            value={formData.certificateThumbprint || ''}
                            onChange={(e) => setFormData({ ...formData, certificateThumbprint: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white font-mono"
                        />
                    </div>
                </div>
            </div>

            {/* Unified Authentication Toggle */}
            <div className="p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            <h4 className="text-sm font-bold text-white">Unified Cloud + Exchange</h4>
                            {useUnifiedAuth && (
                                <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                                    Default
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                            {useUnifiedAuth
                                ? 'Single authentication establishes both Graph API and Exchange Online sessions simultaneously'
                                : 'Separate connections - Exchange Online connects on-demand when needed'}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            const newValue = !useUnifiedAuth;
                            setUseUnifiedAuth(newValue);
                            localStorage.setItem('hyp_unified_auth_mode', String(newValue));
                        }}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 ${useUnifiedAuth ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${useUnifiedAuth ? 'left-7' : 'left-1'
                            }`} />
                    </button>
                </div>
            </div>
        </div>
    );
};
