import React, { useState } from 'react';
import { Database, Key, Cpu } from 'lucide-react';
import { AuthMethod } from '../../types';

interface ADAuthFormProps {
    adMethod: AuthMethod;
    setAdMethod: (method: AuthMethod) => void;
    formData: {
        domain: string;
        server: string;
        username: string;
        password: string;
        vaultName: string;
        secretName: string;
        tenantId: string;
        clientId: string;
        clientSecret: string;
    };
    setFormData: (data: any) => void;
    cloudFormData?: {
        tenantId: string;
        appId: string;
        vaultName: string;
    };
    isUniversalMode?: boolean;
}

export const ADAuthForm: React.FC<ADAuthFormProps> = ({
    adMethod,
    setAdMethod,
    formData,
    setFormData,
    cloudFormData,
    isUniversalMode
}) => {
    return (
        <div className="space-y-3 p-3 bg-slate-900/30 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Active Directory Configuration</h3>
            </div>

            {/* AD Method Selection */}
            <div className="flex p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                    onClick={() => setAdMethod('Credentials')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${adMethod === 'Credentials' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
                        }`}
                >
                    <Key className="w-2.5 h-2.5" /> Direct Auth
                </button>
                <button
                    onClick={() => setAdMethod('AzureKeyVault')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition-all ${adMethod === 'AzureKeyVault' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'
                        }`}
                >
                    <Cpu className="w-2.5 h-2.5" /> Azure Vault
                </button>
            </div>

            {/* Auto-fill button for Key Vault mode when Universal */}
            {adMethod === 'AzureKeyVault' && isUniversalMode && cloudFormData && (
                <div className="flex justify-end">
                    <button
                        onClick={() => {
                            setFormData({
                                ...formData,
                                tenantId: cloudFormData.tenantId,
                                clientId: cloudFormData.appId,
                                vaultName: cloudFormData.vaultName
                            });
                        }}
                        className="px-2 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-md text-[9px] font-bold text-indigo-400 hover:bg-indigo-600/30 transition-all"
                    >
                        Copy from Cloud Config
                    </button>
                </div>
            )}

            {/* AD Fields - Dynamic based on method */}
            {adMethod === 'Credentials' ? (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            AD Domain
                        </label>
                        <input
                            type="text"
                            value={formData.domain}
                            onChange={e => setFormData({ ...formData, domain: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            DC Address
                        </label>
                        <input
                            type="text"
                            value={formData.server}
                            onChange={e => setFormData({ ...formData, server: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                            placeholder="Optional"
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Username
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            Password
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                Tenant ID
                            </label>
                            <input
                                type="text"
                                value={formData.tenantId}
                                onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="Same as Cloud"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                App ID
                            </label>
                            <input
                                type="text"
                                value={formData.clientId}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="Same as Cloud"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                Client Secret
                            </label>
                            <input
                                type="password"
                                value={formData.clientSecret}
                                onChange={e => setFormData({ ...formData, clientSecret: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="App Secret"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                Vault Name
                            </label>
                            <input
                                type="text"
                                value={formData.vaultName}
                                onChange={e => setFormData({ ...formData, vaultName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="Same as Cloud"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                AD Secret Name
                            </label>
                            <input
                                type="text"
                                value={formData.secretName}
                                onChange={e => setFormData({ ...formData, secretName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="AD-Service-Secret"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                Domain
                            </label>
                            <input
                                type="text"
                                value={formData.domain}
                                onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="hyperion.local"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                DC Address
                            </label>
                            <input
                                type="text"
                                value={formData.server}
                                onChange={e => setFormData({ ...formData, server: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="Optional"
                            />
                        </div>
                        <div className="space-y-0.5">
                            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                Username
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-xs text-white"
                                placeholder="Service account"
                            />
                        </div>
                    </div>

                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                        <p className="text-[9px] text-blue-400 font-medium">
                            <strong>Azure Key Vault Mode:</strong> Password retrieved from Key Vault.
                            Ensure App Registration has "Key Vault Secrets User" role.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
