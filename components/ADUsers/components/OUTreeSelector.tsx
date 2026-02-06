// OU Tree Selector Component
// Label: AD-OU-TREE
// Tree-like OU selector similar to AD dsa.msc

import React, { useState, useCallback, useMemo } from 'react';
import { X, ChevronRight, ChevronDown, Folder, FolderOpen, Loader2, Search } from 'lucide-react';

interface OU {
    Name: string;
    DN: string;
}

interface OUTreeNode {
    name: string;
    dn: string;
    children: OUTreeNode[];
    depth: number;
}

interface OUTreeSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (ouDN: string) => void;
    ous: OU[];
    isLoading?: boolean;
    title?: string;
}

/**
 * @module ADUsers/OUTreeSelector
 * @label AD-OU-TREE
 * @description Tree-like OU selector modal similar to AD dsa.msc
 */
export const OUTreeSelector: React.FC<OUTreeSelectorProps> = ({
    isOpen,
    onClose,
    onSelect,
    ous,
    isLoading = false,
    title = "Select Organizational Unit",
}) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedOU, setSelectedOU] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    // Build tree structure from flat OU list
    const ouTree = useMemo(() => {
        if (!ous || ous.length === 0) return [];

        // Parse DN to get path components
        const parseOU = (dn: string): string[] => {
            const parts: string[] = [];
            const matches = dn.match(/OU=([^,]+)/gi) || [];
            matches.reverse().forEach(m => {
                parts.push(m.replace('OU=', ''));
            });
            return parts;
        };

        // Build tree structure
        const root: { [key: string]: OUTreeNode } = {};

        ous.forEach(ou => {
            const pathParts = parseOU(ou.DN);
            let currentLevel = root;
            let currentPath = '';

            pathParts.forEach((part, index) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        name: part,
                        dn: index === pathParts.length - 1 ? ou.DN : '',
                        children: [],
                        depth: index,
                    };
                }

                // Update DN if this is the actual OU
                if (index === pathParts.length - 1) {
                    currentLevel[part].dn = ou.DN;
                }

                // Move to next level
                if (index < pathParts.length - 1) {
                    const childNode = currentLevel[part];
                    if (!childNode.children) {
                        childNode.children = [];
                    }
                    // Convert array to object for easier lookup
                    const childMap: { [key: string]: OUTreeNode } = {};
                    childNode.children.forEach(c => childMap[c.name] = c);
                    currentLevel = childMap as any;
                }
            });
        });

        // Convert to array
        const convertToArray = (obj: { [key: string]: OUTreeNode }): OUTreeNode[] => {
            return Object.values(obj).sort((a, b) => a.name.localeCompare(b.name));
        };

        return convertToArray(root);
    }, [ous]);

    // Filter OUs by search term
    const filteredOUs = useMemo(() => {
        if (!searchTerm.trim()) return ous;
        const term = searchTerm.toLowerCase();
        return ous.filter(ou =>
            ou.Name.toLowerCase().includes(term) ||
            ou.DN.toLowerCase().includes(term)
        );
    }, [ous, searchTerm]);

    const toggleNode = useCallback((dn: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dn)) {
                newSet.delete(dn);
            } else {
                newSet.add(dn);
            }
            return newSet;
        });
    }, []);

    const handleSelect = useCallback(() => {
        if (selectedOU) {
            onSelect(selectedOU);
            onClose();
        }
    }, [selectedOU, onSelect, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-[500px] max-h-[600px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-500" />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search OUs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* OU List */}
                <div className="flex-1 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            <span className="ml-2 text-xs text-slate-500">Loading OUs...</span>
                        </div>
                    ) : filteredOUs.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500">
                            No OUs found
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {filteredOUs.map((ou) => (
                                <button
                                    key={ou.DN}
                                    onClick={() => setSelectedOU(ou.DN)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${selectedOU === ou.DN
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                >
                                    {selectedOU === ou.DN ? (
                                        <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                    ) : (
                                        <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{ou.Name}</div>
                                        <div className="text-[10px] text-slate-500 truncate font-mono">{ou.DN}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-500">
                        {filteredOUs.length} OU{filteredOUs.length !== 1 ? 's' : ''} available
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedOU}
                            className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Select
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
