
import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Save, Bookmark, Trash2, ChevronDown } from 'lucide-react';

export interface UserFiltersState {
    searchString: string;
    status: 'All' | 'Active' | 'Disabled';
    userType: 'All' | 'Member' | 'Guest';
    healthStatus: 'All' | 'Active' | 'Warning' | 'Stale' | 'Disabled';
    sources: ('ad' | 'entra' | 'exchange')[];
    stalledDays?: number;
    passwordAge?: number;
}

interface UserFiltersProps {
    filters: UserFiltersState;
    onFilterChange: (filters: UserFiltersState) => void;
    totalUsers: number;
    filteredCount: number;
}

interface FilterPreset {
    id: string;
    name: string;
    filters: UserFiltersState;
    isSystem?: boolean;
}

const SYSTEM_PRESETS: FilterPreset[] = [
    {
        id: 'sys_guests',
        name: 'Guest Users',
        filters: { searchString: '', status: 'All', userType: 'Guest', healthStatus: 'All', sources: ['entra'] },
        isSystem: true
    },
    {
        id: 'sys_stale',
        name: 'Stale Accounts',
        filters: { searchString: '', status: 'All', userType: 'All', healthStatus: 'Stale', sources: [] },
        isSystem: true
    },
    {
        id: 'sys_risky',
        name: 'Risky Users', // Generic placeholder, functionality relies on healthStatus
        filters: { searchString: '', status: 'All', userType: 'All', healthStatus: 'Warning', sources: [] },
        isSystem: true
    },
    {
        id: 'sys_exchange_cleanup',
        name: 'Exchange Cleanup',
        filters: { searchString: '', status: 'Disabled', userType: 'All', healthStatus: 'All', sources: ['exchange'] },
        isSystem: true
    }
];

export const UserFilters: React.FC<UserFiltersProps> = ({
    filters,
    onFilterChange,
    totalUsers,
    filteredCount
}) => {
    const [presets, setPresets] = useState<FilterPreset[]>(SYSTEM_PRESETS);
    const [isSaveOpen, setIsSaveOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [showPresets, setShowPresets] = useState(false);

    // Load custom presets on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('hyp_user_filter_presets');
            if (saved) {
                const parsed = JSON.parse(saved);
                setPresets([...SYSTEM_PRESETS, ...parsed]);
            }
        } catch (e) {
            console.error('Failed to load presets', e);
        }
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ ...filters, searchString: e.target.value });
    };

    const handleSelectChange = (key: keyof UserFiltersState, value: string) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const toggleSource = (source: 'ad' | 'entra' | 'exchange') => {
        const currentSources = [...filters.sources];
        const index = currentSources.indexOf(source);

        if (index >= 0) {
            currentSources.splice(index, 1);
        } else {
            currentSources.push(source);
        }

        onFilterChange({ ...filters, sources: currentSources });
    };

    const clearFilters = () => {
        onFilterChange({
            searchString: '',
            status: 'All',
            userType: 'All',
            healthStatus: 'All',
            sources: [],
            stalledDays: 0,
            passwordAge: 0
        });
    };

    const savePreset = () => {
        if (!newPresetName.trim()) return;

        const newPreset: FilterPreset = {
            id: `custom_${Date.now()}`,
            name: newPresetName,
            filters: { ...filters }, // Snapshot current filters
            isSystem: false
        };

        const updatedPresets = [...presets, newPreset];
        setPresets(updatedPresets);

        // Persist only custom presets
        const customOnly = updatedPresets.filter(p => !p.isSystem);
        localStorage.setItem('hyp_user_filter_presets', JSON.stringify(customOnly));

        setIsSaveOpen(false);
        setNewPresetName('');
    };

    const deletePreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = presets.filter(p => p.id !== id);
        setPresets(updated);

        const customOnly = updated.filter(p => !p.isSystem);
        localStorage.setItem('hyp_user_filter_presets', JSON.stringify(customOnly));
    };

    const loadPreset = (preset: FilterPreset) => {
        onFilterChange(preset.filters);
        setShowPresets(false);
    };

    const hasActiveFilters =
        filters.searchString !== '' ||
        filters.status !== 'All' ||
        filters.userType !== 'All' ||
        filters.healthStatus !== 'All' ||
        filters.sources.length > 0 ||
        (filters.stalledDays && filters.stalledDays > 0) ||
        (filters.passwordAge && filters.passwordAge > 0);

    const sourceOptions: ('ad' | 'entra' | 'exchange')[] = ['ad', 'entra', 'exchange'];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                {/* Search Bar */}
                <div className="relative flex-1 w-full xl:w-auto xl:min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, email, UPN, or SAM account..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={filters.searchString}
                        onChange={handleSearchChange}
                    />
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-row flex-wrap gap-2 items-center w-full xl:w-auto">
                    <Filter className="h-4 w-4 text-gray-500 hidden sm:block" />

                    <select
                        value={filters.status}
                        onChange={(e) => handleSelectChange('status', e.target.value)}
                        className="block w-full sm:w-28 pl-2 pr-6 py-2 text-xs md:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Disabled">Disabled</option>
                    </select>

                    <select
                        value={filters.userType}
                        onChange={(e) => handleSelectChange('userType', e.target.value)}
                        className="block w-full sm:w-28 pl-2 pr-6 py-2 text-xs md:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="All">All Types</option>
                        <option value="Member">Member</option>
                        <option value="Guest">Guest</option>
                    </select>

                    <select
                        value={filters.healthStatus}
                        onChange={(e) => handleSelectChange('healthStatus', e.target.value)}
                        className="block w-full sm:w-32 pl-2 pr-6 py-2 text-xs md:text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="All">Health: All</option>
                        <option value="Active">Healthy</option>
                        <option value="Warning">Warning</option>
                        <option value="Stale">Stale</option>
                        <option value="Disabled">Disabled</option>
                    </select>

                    {/* Source Toggles */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 gap-0.5">
                        {sourceOptions.map(source => (
                            <button
                                key={source}
                                onClick={() => toggleSource(source)}
                                className={`px-2 py-1.5 text-[10px] uppercase font-bold rounded flex items-center gap-1 ${filters.sources.includes(source)
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                                title={`Filter by ${source.toUpperCase()}`}
                            >
                                {source}
                            </button>
                        ))}
                    </div>

                    {/* RESTORED V1 FEATURES: Numeric Filters */}
                    <div className="flex items-center gap-2 border-l border-gray-300 dark:border-gray-600 pl-2">
                        <div className="flex items-center gap-1" title="Show users inactive for > X days">
                            <span className="text-[10px] uppercase font-bold text-gray-500">Stalled:</span>
                            <input
                                type="number"
                                min="0"
                                className="w-12 px-1 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="0"
                                value={filters.stalledDays || ''}
                                onChange={(e) => onFilterChange({ ...filters, stalledDays: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center gap-1" title="Show users with password older than X days">
                            <span className="text-[10px] uppercase font-bold text-gray-500">Pwd Age:</span>
                            <input
                                type="number"
                                min="0"
                                className="w-12 px-1 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="0"
                                value={filters.passwordAge || ''}
                                onChange={(e) => onFilterChange({ ...filters, passwordAge: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    {/* Preset Manager */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPresets(!showPresets)}
                            className="flex items-center gap-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30 rounded-md text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>Presets</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {showPresets && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2">Saved Views</span>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {presets.map(preset => (
                                        <div key={preset.id} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded cursor-pointer">
                                            <div onClick={() => loadPreset(preset)} className="flex-1 flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${preset.isSystem ? 'bg-indigo-400' : 'bg-green-400'}`}></span>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{preset.name}</span>
                                            </div>
                                            {!preset.isSystem && (
                                                <button
                                                    onClick={(e) => deletePreset(preset.id, e)}
                                                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
                                    {!isSaveOpen ? (
                                        <button
                                            onClick={() => setIsSaveOpen(true)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                        >
                                            <Save className="w-3 h-3" />
                                            Save Current View
                                        </button>
                                    ) : (
                                        <div className="flex gap-1 animate-in slide-in-from-top-1 duration-200">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={newPresetName}
                                                onChange={e => setNewPresetName(e.target.value)}
                                                placeholder="Preset Name"
                                                className="flex-1 px-2 py-1 text-xs border rounded dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                                                onKeyDown={e => e.key === 'Enter' && savePreset()}
                                            />
                                            <button onClick={savePreset} disabled={!newPresetName} className="p-1 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50">
                                                <Save className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => setIsSaveOpen(false)} className="p-1 bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 rounded hover:bg-gray-300">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                            title="Clear all filters"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-2">
                <span>
                    Showing <span className="font-medium text-gray-900 dark:text-white">{filteredCount}</span> of <span className="font-medium">{totalUsers}</span> users
                </span>
                {hasActiveFilters && (
                    <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                        Filtered View Active
                    </span>
                )}
            </div>

            {/* Backdrop for presets dropdown */}
            {showPresets && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setShowPresets(false)}
                />
            )}
        </div>
    );
};
