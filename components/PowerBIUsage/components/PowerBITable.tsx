import React from 'react';
import { Users, Clock, Globe, Shield } from 'lucide-react';
import { PowerBIActivity } from '../powerbi.types';

/**
 * Props for the PowerBITable component
 */
interface PowerBITableProps {
    /** Array of PowerBI activity data to display */
    data: PowerBIActivity[];
}

/**
 * PowerBI Usage Data Table Component - "Cloud Governance" Style
 */
export const PowerBITable: React.FC<PowerBITableProps> = ({ data }) => {
    return (
        <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden relative shadow-lg bg-white dark:bg-slate-950/20">
            <div className="overflow-x-auto custom-scrollbar max-h-[600px] relative">
                <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-slate-950/90 sticky top-0 z-10 text-slate-600 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                        <tr>
                            <th className="px-6 py-4 w-[30%]">Identity & Principal Name</th>
                            <th className="px-6 py-4 w-[20%]">Operation</th>
                            <th className="px-6 py-4 w-[25%]">Activity Date</th>
                            <th className="px-6 py-4 w-[25%]">Client IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/10">
                        {data.map((item, index) => (
                            <tr key={index} className="hover:bg-indigo-500/[0.03] transition-colors group">
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[9px] border bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                                            PBI
                                        </div>
                                        <div className="truncate">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate leading-none">
                                                {String(item.userIds || 'Unknown')}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-2">
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {item.operations}
                                    </span>
                                </td>
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                                            {new Date(item.creationDate).toLocaleString()}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-3 h-3 text-indigo-500 opacity-50" />
                                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                                            {item.clientIP}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
