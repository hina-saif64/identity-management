/**
 * Device Dashboard - Summary Tiles (v5)
 * With duplicate detection tile
 */

import React from 'react';
import { Monitor, Cloud, Server, Database, CheckCircle, AlertTriangle, XCircle, Ban, Shield, Laptop, AlertOctagon, Copy } from 'lucide-react';
import { DeviceSummary } from './device.types';

interface DeviceDashboardProps {
    summary: DeviceSummary | null;
    isLoading: boolean;
    loadingSource?: string;
    onTileClick?: (filter: string) => void;
    duplicateCount?: number;
    deletedCount?: number;
}

interface TileProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
    tooltip: string;
    onClick?: () => void;
}

const Tile: React.FC<TileProps> = ({ icon, label, value, color, tooltip, onClick }) => (
    <button
        onClick={onClick}
        title={tooltip}
        className={`p-1.5 rounded-lg border transition-all hover:scale-105 hover:shadow-md cursor-pointer text-left w-full ${color}`}
    >
        <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-white/10 dark:bg-black/10 shrink-0">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-none">{value}</p>
                <p className="text-[8px] truncate opacity-70 leading-tight">{label}</p>
            </div>
        </div>
    </button>
);

export const DeviceDashboard: React.FC<DeviceDashboardProps> = ({
    summary,
    isLoading,
    loadingSource,
    onTileClick = () => { },
    duplicateCount = 0,
    deletedCount = 0
}) => {
    if (isLoading || !summary) {
        return (
            <div className="space-y-2">
                {isLoading && loadingSource && (
                    <div className="flex items-center justify-center gap-2 py-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Fetching from {loadingSource}...
                        </span>
                    </div>
                )}
                <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
                    {Array(12).fill(0).map((_, i) => (
                        <div key={i} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/30 animate-pulse h-10" />
                    ))}
                </div>
            </div>
        );
    }

    // Calculate "Missing From" counts
    const missingFromEntra = summary.total - summary.entra;
    const missingFromIntune = summary.total - summary.intune;
    const missingFromAd = summary.total - summary.ad;

    return (
        <div className="space-y-1.5">
            {/* Row 1: Sources + Health */}
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
                <Tile
                    icon={<Monitor className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                    label="Total"
                    value={summary.total.toLocaleString()}
                    tooltip="Total unique devices across all 3 systems (Entra + Intune + AD combined, deduplicated)"
                    color="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-100"
                    onClick={() => onTileClick('all')}
                />
                <Tile
                    icon={<Cloud className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                    label="Entra"
                    value={summary.entra.toLocaleString()}
                    tooltip="Devices registered in Microsoft Entra ID (Azure AD). May also exist in Intune and/or AD."
                    color="bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-900 dark:text-cyan-100"
                    onClick={() => onTileClick('entra')}
                />
                <Tile
                    icon={<Server className="w-3 h-3 text-green-600 dark:text-green-400" />}
                    label="Intune"
                    value={summary.intune.toLocaleString()}
                    tooltip="Devices enrolled in Microsoft Intune for MDM. May also exist in Entra and/or AD."
                    color="bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-900 dark:text-green-100"
                    onClick={() => onTileClick('intune')}
                />
                <Tile
                    icon={<Database className="w-3 h-3 text-orange-600 dark:text-orange-400" />}
                    label="AD"
                    value={summary.ad.toLocaleString()}
                    tooltip="Computer objects in on-premises Active Directory. May also exist in Entra and/or Intune."
                    color="bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-900 dark:text-orange-100"
                    onClick={() => onTileClick('ad')}
                />
                <Tile
                    icon={<CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    label="Active"
                    value={summary.active.toLocaleString()}
                    tooltip="Healthy devices: Last activity within 30 days. No action needed."
                    color="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                    onClick={() => onTileClick('active')}
                />
                <Tile
                    icon={<AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                    label="Warning"
                    value={summary.warning.toLocaleString()}
                    tooltip="Devices with last activity 31-90 days ago. Should be investigated."
                    color="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-100"
                    onClick={() => onTileClick('warning')}
                />
                <Tile
                    icon={<XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />}
                    label="Stale"
                    value={summary.stale.toLocaleString()}
                    tooltip="Inactive devices: No activity for 90+ days. Candidates for cleanup/removal."
                    color="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100"
                    onClick={() => onTileClick('stale')}
                />
                <Tile
                    icon={<Ban className="w-3 h-3 text-slate-600 dark:text-slate-400" />}
                    label="Disabled"
                    value={summary.disabled.toLocaleString()}
                    tooltip="Devices explicitly disabled in AD or Entra. Cannot authenticate."
                    color="bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30 text-slate-900 dark:text-slate-100"
                    onClick={() => onTileClick('disabled')}
                />
                <Tile
                    icon={<Laptop className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                    label="Win11"
                    value={summary.windows11.toLocaleString()}
                    tooltip="Devices running Windows 11 (any version/build)"
                    color="bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-100"
                    onClick={() => onTileClick('win11')}
                />
                <Tile
                    icon={<Laptop className="w-3 h-3 text-sky-600 dark:text-sky-400" />}
                    label="Win10"
                    value={summary.windows10.toLocaleString()}
                    tooltip="Devices running Windows 10 (any version/build)"
                    color="bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-900 dark:text-sky-100"
                    onClick={() => onTileClick('win10')}
                />
                <Tile
                    icon={<Server className="w-3 h-3 text-violet-600 dark:text-violet-400" />}
                    label="Server"
                    value={summary.windowsServer.toLocaleString()}
                    tooltip="Windows Server OS (2016, 2019, 2022, etc.)"
                    color="bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-100"
                    onClick={() => onTileClick('server')}
                />
                <Tile
                    icon={<Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
                    label="Compliance"
                    value={`${summary.compliance}%`}
                    tooltip={`Compliance Score: ${summary.allSystems} of ${summary.total} devices exist in ALL 3 systems (Entra + Intune + AD)`}
                    color="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-900 dark:text-purple-100"
                    onClick={() => onTileClick('all-systems')}
                />
            </div>

            {/* Row 2: Missing From + Gaps + Duplicates */}
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
                <Tile
                    icon={<AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                    label="Not in Entra"
                    value={missingFromEntra.toLocaleString()}
                    tooltip="Devices found in Intune or AD but NOT in Entra ID. May need cloud registration."
                    color="bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-100"
                    onClick={() => onTileClick('missing-entra')}
                />
                <Tile
                    icon={<AlertOctagon className="w-3 h-3 text-teal-600 dark:text-teal-400" />}
                    label="Not in Intune"
                    value={missingFromIntune.toLocaleString()}
                    tooltip="Devices found in Entra or AD but NOT enrolled in Intune. May need MDM enrollment."
                    color="bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-900 dark:text-teal-100"
                    onClick={() => onTileClick('missing-intune')}
                />
                <Tile
                    icon={<AlertOctagon className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />}
                    label="Not in AD"
                    value={missingFromAd.toLocaleString()}
                    tooltip="Devices found in Entra or Intune but NOT in on-premises AD. Cloud-only or not domain-joined."
                    color="bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-900 dark:text-yellow-100"
                    onClick={() => onTileClick('missing-ad')}
                />
                <Tile
                    icon={<Cloud className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                    label="Entra Only"
                    value={(summary.entra - summary.allSystems).toLocaleString()}
                    tooltip="Devices that ONLY exist in Entra ID - not in Intune and not in AD. Potential orphans or cloud-only devices."
                    color="bg-cyan-50/50 dark:bg-cyan-500/5 border-cyan-200/50 dark:border-cyan-500/20 text-cyan-800 dark:text-cyan-200"
                    onClick={() => onTileClick('entra-only')}
                />
                <Tile
                    icon={<Server className="w-3 h-3 text-green-600 dark:text-green-400" />}
                    label="Intune Only"
                    value="--"
                    tooltip="Devices that ONLY exist in Intune - not in Entra and not in AD. (Rare scenario)"
                    color="bg-green-50/50 dark:bg-green-500/5 border-green-200/50 dark:border-green-500/20 text-green-800 dark:text-green-200"
                    onClick={() => onTileClick('intune-only')}
                />
                <Tile
                    icon={<Database className="w-3 h-3 text-orange-600 dark:text-orange-400" />}
                    label="AD Only"
                    value="--"
                    tooltip="Devices that ONLY exist in on-premises AD - not in Entra and not in Intune. Not cloud-synced."
                    color="bg-orange-50/50 dark:bg-orange-500/5 border-orange-200/50 dark:border-orange-500/20 text-orange-800 dark:text-orange-200"
                    onClick={() => onTileClick('ad-only')}
                />
                <Tile
                    icon={<Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                    label="All 3"
                    value={summary.allSystems.toLocaleString()}
                    tooltip="Fully compliant devices that exist in ALL 3 systems: Entra ID + Intune + Active Directory"
                    color="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                    onClick={() => onTileClick('all-systems')}
                />
                <Tile
                    icon={<Copy className="w-3 h-3 text-fuchsia-600 dark:text-fuchsia-400" />}
                    label="Duplicates"
                    value={duplicateCount.toLocaleString()}
                    tooltip="Potential duplicate devices: Similar names like AL1234 / AL1234A / AL1234$ - worth investigating"
                    color="bg-fuchsia-50 dark:bg-fuchsia-500/10 border-fuchsia-200 dark:border-fuchsia-500/30 text-fuchsia-900 dark:text-fuchsia-100"
                    onClick={() => onTileClick('duplicates')}
                />
                <Tile
                    icon={<XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />}
                    label="Deleted (7d)"
                    value={deletedCount.toLocaleString()}
                    tooltip="Devices deleted from Entra ID in the last 7 days. Click to view deleted devices list."
                    color="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-900 dark:text-red-100"
                    onClick={() => onTileClick('deleted')}
                />
                <Tile
                    icon={<Shield className="w-3 h-3 text-lime-600 dark:text-lime-400" />}
                    label="Defender ✓"
                    value={summary.defenderOnboarded.toLocaleString()}
                    tooltip="Devices onboarded to Microsoft Defender for Endpoint - protected by advanced threat protection"
                    color="bg-lime-50 dark:bg-lime-500/10 border-lime-200 dark:border-lime-500/30 text-lime-900 dark:text-lime-100"
                    onClick={() => onTileClick('defender-onboarded')}
                />
                <Tile
                    icon={<Shield className="w-3 h-3 text-red-600 dark:text-red-400" />}
                    label="Defender ✗"
                    value={summary.defenderNotOnboarded.toLocaleString()}
                    tooltip="Devices NOT onboarded to Defender for Endpoint - can be onboarded for protection"
                    color="bg-red-50/50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20 text-red-800 dark:text-red-200"
                    onClick={() => onTileClick('defender-not-onboarded')}
                />
                <Tile
                    icon={<Monitor className="w-3 h-3 text-pink-600 dark:text-pink-400" />}
                    label="Other OS"
                    value={summary.otherOs.toLocaleString()}
                    tooltip="Devices with unknown or non-Windows OS (macOS, Linux, etc.)"
                    color="bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/30 text-pink-900 dark:text-pink-100"
                    onClick={() => onTileClick('other')}
                />
            </div>
        </div>
    );
};

export default DeviceDashboard;
