import React, { useState, useEffect } from 'react';
import { Users, X, Loader2, Download } from 'lucide-react';
import { GraphCollector, GraphCredentials } from '../collectors/graphCollector';

interface GroupMembersModalProps {
    group: { id: string; displayName: string };
    creds: GraphCredentials;
    onClose: () => void;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({ group, creds, onClose }) => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMembers();
    }, [group]);

    const loadMembers = async () => {
        setLoading(true);
        try {
            const graph = new GraphCollector();
            const data = await graph.fetchGroupMembers(creds, group.id);
            setMembers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = ['Type', 'Display Name', 'User Principal Name'];
        const rows = members.map(m => [
            m['@odata.type']?.includes('group') ? 'Nested Group' : 'User',
            m.displayName,
            m.userPrincipalName || m.mail
        ]);
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.map(c => `"${c}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${group.displayName.replace(/\s+/g, '_')}_members.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-500/20 p-2 rounded-lg text-indigo-700 dark:text-indigo-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">{group.displayName}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Group Membership</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-black/20">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <span className="text-sm">Fetching members...</span>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 italic">No members found in this group.</div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((member: any) => (
                                <div key={member.id} className="flex items-center justify-between bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                            {member.displayName?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-200">{member.displayName}</div>
                                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-500">{member.userPrincipalName || member.mail}</div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                                        {member['@odata.type']?.includes('group') ? 'Nested Group' : 'User'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-center text-slate-500 flex justify-between items-center">
                    <span className="opacity-75 pl-2">TRANSITIVE MEMBERS</span>
                    <button
                        onClick={handleExport}
                        disabled={loading || members.length === 0}
                        className="flex items-center gap-2 text-indigo-500 hover:text-indigo-600 font-bold px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50"
                    >
                        <Download className="w-3 h-3" /> Export List
                    </button>
                </div>
            </div>
        </div>
    );
};
