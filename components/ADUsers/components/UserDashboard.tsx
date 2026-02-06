
/**
 * User Dashboard - Summary Tiles
 * Matches DeviceInventory style
 */

import React from 'react';
import {
    Users, UserPlus, UserMinus, Shield, AlertTriangle, XCircle, CheckCircle,
    Mail, Globe, Key, Lock, AlertOctagon, UserCheck, Ban, History, Hourglass,
    Clock, Crosshair, Bot, Layers, Server, Share2
} from 'lucide-react';
import { UserSummary } from '../types/enhanced.types';

interface UserDashboardProps {
    summary: UserSummary | null;
    isLoading: boolean;
    loadingStates: { ad: boolean; entra: boolean; exchange: boolean; summary: boolean };
    onTileClick?: (filter: string) => void;
    selectedTile?: string | null;
    sources?: any; // Optional, for future use or compatibility
}

interface TileProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
    tooltip: string;
    onClick?: () => void;
    isSelected?: boolean;
}

const Tile: React.FC<TileProps> = ({ icon, label, value, color, tooltip, onClick, isSelected }) => (
    <button
        onClick={onClick}
        title={tooltip}
        className={`p-1 rounded-lg border transition-all hover:scale-105 hover:shadow-md cursor-pointer text-left w-full ${isSelected
            ? 'ring-2 ring-blue-500 ring-offset-1 border-transparent'
            : 'border-transparent'
            } ${color} ${isSelected ? 'shadow-md' : ''}`}
    >
        <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded flex items-center justify-center bg-white/10 dark:bg-black/10 shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-none">{value}</p>
                <p className="text-[7px] truncate opacity-80 leading-tight tracking-wide">{label}</p>
            </div>
        </div>
    </button>
);

export const UserDashboard: React.FC<UserDashboardProps> = ({
    summary,
    isLoading,
    loadingStates,
    onTileClick = () => { },
    selectedTile
}) => {
    // Show loading skeleton
    if (isLoading || !summary) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 py-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {loadingStates.ad ? 'Loading AD...' : loadingStates.entra ? 'Loading Entra...' : 'Loading...'}
                    </span>
                </div>
                <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
                    {Array(24).fill(0).map((_, i) => (
                        <div key={i} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/30 animate-pulse h-10" />
                    ))}
                </div>
            </div>
        );
    }

    // Helper to render tile with selection check
    const renderTile = (id: string, icon: React.ReactNode, label: string, value: number | string, color: string, tooltip: string) => (
        <Tile
            key={id}
            icon={icon}
            label={label}
            value={value}
            color={color}
            tooltip={tooltip}
            onClick={() => onTileClick(id)}
            isSelected={selectedTile === id}
        />
    );

    return (
        <div className="space-y-1">
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1">
                {/* 1. Core Identity & Status */}
                {renderTile(
                    'all',
                    <Users className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />,
                    "Total Users",
                    summary.total.toLocaleString(),
                    "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-100",
                    "Total unique users across all systems"
                )}
                {renderTile(
                    'active',
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />,
                    "Active",
                    summary.enabled.toLocaleString(),
                    "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100",
                    "Enabled accounts"
                )}
                {renderTile(
                    'disabled',
                    <Ban className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />,
                    "Disabled",
                    summary.disabled.toLocaleString(),
                    "bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30 text-slate-900 dark:text-slate-100",
                    "Disabled accounts"
                )}
                {renderTile(
                    'guests',
                    <Globe className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />,
                    "Guests",
                    summary.guestUsers.toLocaleString(),
                    "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-100",
                    "External guest users"
                )}

                {/* 2. Source Distribution */}
                {renderTile(
                    'ad-total',
                    <Server className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />,
                    "Active Directory",
                    summary.totalAdUsers?.toLocaleString() || 0,
                    "bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30 text-slate-900 dark:text-slate-100",
                    "Total users in Active Directory"
                )}
                {renderTile(
                    'entra-total',
                    <UserPlus className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />,
                    "Entra ID",
                    summary.totalEntraUsers?.toLocaleString() || 0,
                    "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-900 dark:text-cyan-100",
                    "Total users in Entra ID"
                )}
                {renderTile(
                    'ad-unsynced',
                    <AlertOctagon className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />,
                    "Unsynced",
                    summary.adOnlyUsers?.toLocaleString() || 0,
                    "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100",
                    "AD users NOT synced to cloud"
                )}
                {renderTile(
                    'entra-cloud-only',
                    <Globe className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />,
                    "Cloud Only",
                    summary.entraOnlyUsers?.toLocaleString() || 0,
                    "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-100",
                    "Entra users NOT in AD"
                )}
                {renderTile(
                    'exchange-only',
                    <Mail className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />,
                    "Exchange",
                    summary.exchangeOnlyUsers?.toLocaleString() || 0,
                    "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-100",
                    "Exchange Online only"
                )}
                {renderTile(
                    'synced',
                    <UserCheck className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />,
                    "Synced",
                    summary.allSourcesUsers?.toLocaleString() || 0,
                    "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-900 dark:text-teal-100",
                    "Users present in all sources"
                )}
                {renderTile(
                    'multi-source',
                    <Layers className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />,
                    "Multi-Src",
                    summary.multiSourceUsers?.toLocaleString() || 0,
                    "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-100",
                    "Users in more than one source"
                )}

                {/* 3. Security & Risk */}
                {renderTile(
                    'privileged',
                    <Shield className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />,
                    "Admins",
                    summary.privilegedUsers?.toLocaleString() || 0,
                    "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-900 dark:text-purple-100",
                    "Privileged accounts"
                )}
                {renderTile(
                    'service',
                    <Bot className="w-2.5 h-2.5 text-gray-600 dark:text-gray-400" />,
                    "Service",
                    summary.serviceAccounts?.toLocaleString() || 0,
                    "bg-gray-100 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/30 text-gray-900 dark:text-gray-100",
                    "Service Accounts"
                )}
                {renderTile(
                    'no-mfa',
                    <AlertOctagon className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />,
                    "No MFA",
                    summary.noMfa.toLocaleString(),
                    "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100",
                    "Users without MFA enabled"
                )}
                {renderTile(
                    'at-risk',
                    <AlertTriangle className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400" />,
                    "At Risk",
                    summary.atRiskUsers?.toLocaleString() || 0,
                    "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-900 dark:text-orange-100",
                    "Users with identified risks"
                )}

                {/* 4. Hygiene & Stale */}
                {renderTile(
                    'never-login',
                    <Key className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />,
                    "No Login",
                    summary.neverLogin.toLocaleString(),
                    "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-100",
                    "Never logged in"
                )}
                {renderTile(
                    'stalled',
                    <Hourglass className="w-2.5 h-2.5 text-stone-600 dark:text-stone-400" />,
                    "Stale",
                    summary.stalled?.toLocaleString() || 0,
                    "bg-stone-50 dark:bg-stone-500/10 border-stone-200 dark:border-stone-500/30 text-stone-900 dark:text-stone-100",
                    "Inactive for >90 days"
                )}
                {renderTile(
                    'never-changed',
                    <History className="w-2.5 h-2.5 text-yellow-600 dark:text-yellow-400" />,
                    "Old Pwd",
                    summary.neverChanged?.toLocaleString() || 0,
                    "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-900 dark:text-yellow-100",
                    "Password never changed"
                )}
                {renderTile(
                    'pwd-expired',
                    <Clock className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />,
                    "Pwd Exp",
                    summary.passwordExpired?.toLocaleString() || 0,
                    "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-100",
                    "Password expired"
                )}

                {/* 5. Licenses & Attributes */}
                {renderTile(
                    'license-e5',
                    <CheckCircle className="w-2.5 h-2.5 text-lime-600 dark:text-lime-400" />,
                    "E5 Lic",
                    summary.licenseE5.toLocaleString(),
                    "bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30 text-lime-900 dark:text-lime-100",
                    "Microsoft 365 E5"
                )}
                {renderTile(
                    'license-e3',
                    <CheckCircle className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />,
                    "E3 Lic",
                    summary.licenseE3.toLocaleString(),
                    "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-900 dark:text-green-100",
                    "Microsoft 365 E3"
                )}
                {renderTile(
                    'license-e1',
                    <CheckCircle className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />,
                    "E1 Lic",
                    summary.licenseE1?.toLocaleString() || 0,
                    "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-900 dark:text-teal-100",
                    "Microsoft 365 E1"
                )}
                {renderTile(
                    'license-f3',
                    <CheckCircle className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />,
                    "F3 Lic",
                    summary.licenseF3?.toLocaleString() || 0,
                    "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-900 dark:text-cyan-100",
                    "Microsoft 365 F3"
                )}
                {renderTile(
                    'with-email',
                    <Mail className="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />,
                    "Email",
                    summary.withEmail.toLocaleString(),
                    "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-100",
                    "Users with email"
                )}
                {renderTile(
                    'target',
                    <Crosshair className="w-2.5 h-2.5 text-pink-600 dark:text-pink-400" />,
                    "Target",
                    summary.targetUsers?.toLocaleString() || 0,
                    "bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-900 dark:text-pink-100",
                    "Target users"
                )}
            </div>
        </div>
    );
};