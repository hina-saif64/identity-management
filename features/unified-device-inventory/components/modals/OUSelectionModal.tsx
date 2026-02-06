/**
 * OU Selection Modal
 * Shows AD Organizational Units in tree view for device move operations
 */

import React, { useState, useEffect } from 'react';
import { X, Folder, FolderOpen, Loader2, ChevronRight, ChevronDown } from 'lucide-react';

interface OUNode {
    dn: string;
    name: string;
    children: OUNode[];
    isExpanded: boolean;
    isLoading: boolean;
}

interface OUSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedOU: string) => void;
    deviceCount: number;
    onFetchOUs: (parentDN?: string) => Promise<OUNode[]>;
}

export const OUSelectionModal: React.FC<OUSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    deviceCount,
    onFetchOUs
}) => {
    const [ouTree, setOuTree] = useState<OUNode[]>([]);
    const [selectedOU, setSelectedOU] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && ouTree.length === 0) {
            loadRootOUs();
        }
    }, [isOpen]);

    const loadRootOUs = async () => {
        setIsLoading(true);
        try {
            const rootOUs = await onFetchOUs();
            setOuTree(rootOUs);
        } catch (error) {
            console.error('Failed to load OUs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleOU = async (ouDN: string) => {
        setOuTree(prevTree => {
            const updateNode = (nodes: OUNode[]): OUNode[] => {
                return nodes.map(node => {
                    if (node.dn === ouDN) {
                        if (!node.isExpanded && node.children.length === 0) {
                            // Load children
                            node.isLoading = true;
                            onFetchOUs(ouDN).then(children => {
                                setOuTree(prevTree => {
                                    const updateWithChildren = (nodes: OUNode[]): OUNode[] => {
                                        return nodes.map(n => {
                                            if (n.dn === ouDN) {
                                                return { ...n, children, isExpanded: true, isLoading: false };
                                            }
                                            return { ...n, children: updateWithChildren(n.children) };
                                        });
                                    };
                                    return updateWithChildren(prevTree);
                                });
                            });
                        }
                        return { ...node, isExpanded: !node.isExpanded };
                    }
                    return { ...node, children: updateNode(node.children) };
                });
            };
            return updateNode(prevTree);
        });
    };

    const renderOUNode = (node: OUNode, level: number = 0) => (
        <div key={node.dn} className="select-none">
            <div
                className={`flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer rounded-lg ${
                    selectedOU === node.dn ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                }`}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
                onClick={() => setSelectedOU(node.dn)}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleOU(node.dn);
                    }}
                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                >
                    {node.isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                    ) : node.children.length > 0 || !node.isExpanded ? (
                        node.isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-slate-500" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-slate-500" />
                        )
                    ) : (
                        <div className="w-3 h-3" />
                    )}
                </button>
                
                {node.isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-blue-500" />
                ) : (
                    <Folder className="w-4 h-4 text-slate-500" />
                )}
                
                <span className="text-sm text-slate-900 dark:text-white font-medium">
                    {node.name}
                </span>
            </div>
            
            {node.isExpanded && node.children.map(child => renderOUNode(child, level + 1))}
        </div>
    );

    const handleConfirm = () => {
        if (selectedOU) {
            onConfirm(selectedOU);
            setSelectedOU('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Move Devices to OU
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Select the Organizational Unit to move <strong>{deviceCount}</strong> device{deviceCount !== 1 ? 's' : ''} to:
                        </p>
                    </div>

                    {/* OU Tree */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                    <span className="text-sm text-slate-600 dark:text-slate-300">Loading OUs...</span>
                                </div>
                            </div>
                        ) : ouTree.length > 0 ? (
                            <div className="space-y-1">
                                {ouTree.map(node => renderOUNode(node))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                No Organizational Units found
                            </div>
                        )}
                    </div>

                    {/* Selected OU Display */}
                    {selectedOU && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Selected OU:</div>
                            <div className="text-sm font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800 p-2 rounded border">
                                {selectedOU}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedOU}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        Move to Selected OU
                    </button>
                </div>
            </div>
        </div>
    );
};