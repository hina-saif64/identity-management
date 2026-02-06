import React, { useState, useCallback } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertTriangle, Filter, Database } from 'lucide-react';
import XLSX from 'xlsx-js-style';

interface DataUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEnrich: (data: Map<string, { status: string; owner?: string }>) => void;
    onBulkFilter: (deviceNames: Set<string>) => void;
    initialMode?: 'enrich' | 'filter';
}

type UploadMode = 'enrich' | 'filter';

interface PreviewRow {
    [key: string]: string | number | boolean | null;
}

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
    isOpen,
    onClose,
    onEnrich,
    onBulkFilter,
    initialMode = 'enrich'
}) => {
    const [mode, setMode] = useState<UploadMode>(initialMode);

    // Reset mode when opened/initialMode changes
    React.useEffect(() => {
        setMode(initialMode);
    }, [initialMode, isOpen]);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [mapping, setMapping] = useState<{
        tag?: string;
        status?: string;
        owner?: string;
        device?: string;
    }>({});

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [mode]);

    const handleFile = async (file: File) => {
        setFileName(file.name);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<PreviewRow>(sheet);

                if (jsonData.length === 0) {
                    setError('File is empty');
                    return;
                }

                const fullData = jsonData; // Keep full data
                setFullRawData(fullData);
                setPreviewData(fullData.slice(0, 5)); // Preview first 5 rows
                const detectedColumns = Object.keys(fullData[0]);
                setColumns(detectedColumns);

                // Auto-detect mappings based on legacy script logic (Case-insensitive)
                const lowerCols = detectedColumns.map(c => c.toLowerCase());

                if (mode === 'enrich') {
                    const tagCol = detectedColumns.find(c => ['tag', 'tags', 'device name', 'devicename', 'host name', 'hostname'].includes(c.toLowerCase()));
                    const statusCol = detectedColumns.find(c => ['status', 'servicedesk status', 'sd status', 'state'].includes(c.toLowerCase()));
                    const ownerCol = detectedColumns.find(c => ['allocated', 'allocated to', 'owner', 'user', 'assigned to'].includes(c.toLowerCase()));

                    setMapping({ tag: tagCol, status: statusCol, owner: ownerCol });

                    if (!tagCol || !statusCol) {
                        setError('Could not auto-detect "Tag" or "Status" columns. Please verify headers.');
                    }
                } else {
                    const deviceCol = detectedColumns.find(c => ['tag', 'device name', 'devicename', 'host name', 'hostname', 'computer name'].includes(c.toLowerCase()));
                    setMapping({ device: deviceCol });
                }

            } catch (err) {
                setError('Failed to parse file. Ensure it is a valid Excel or CSV file.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleProcess = () => {
        // We need to re-read the file or process logic on the full data. 
        // NOTE: For simplicity, we are re-using the logic here as if we had full data. 
        // In a real app we'd store `fullData` in state, but let's assume `file` input again or just assume `previewData` mechanism works for small files locally.
        // Actually, let's store full data in memory since it's client side.
        // Wait, for step 1 we only stored preview. Let's fix handleFile to store full data.

        // RE-IMPLEMENTATION: Store full data in a Ref or State
        // Since we can't easily modify the handleFile in this single-pass tool, 
        // let's assume the user will pick the file and we parsed it into `previewData`.
        // FIX: Update `handleFile` to store `fullRawData`.
    };

    // To properly implement handleProcess, we need full data.
    // Let's add a state for it.
    const [fullRawData, setFullRawData] = useState<any[]>([]);

    // Updated handleFile logic (injected via `replace_file_content` if I was editing, but I'm creating new)
    // I will write the component with this logic included.

    const processData = () => {
        if (mode === 'enrich') {
            if (!mapping.tag || !mapping.status) return;

            const enrichmentMap = new Map<string, { status: string; owner?: string }>();

            fullRawData.forEach(row => {
                const tag = String(row[mapping.tag!] || '').trim();
                const status = String(row[mapping.status!] || '').trim();
                const owner = mapping.owner ? String(row[mapping.owner] || '').trim() : undefined;

                if (tag) {
                    // Normalize key
                    enrichmentMap.set(tag.toLowerCase(), { status, owner });
                }
            });

            onEnrich(enrichmentMap);
            onClose();
        } else {
            if (!mapping.device) return;

            const deviceSet = new Set<string>();
            fullRawData.forEach(row => {
                const name = String(row[mapping.device!] || '').trim();
                if (name) deviceSet.add(name.toLowerCase()); // Store normalized, filter will check normalized
            });

            onBulkFilter(deviceSet);
            onClose();
        }
    };

    // ... Render logic ... (Will be in the full file content below)

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-6 h-6 text-indigo-500" />
                        Data Upload Center
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => { setMode('enrich'); setFileName(null); setPreviewData([]); setError(null); }}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${mode === 'enrich'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'border-transparent text-slate-500 hover:text-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <Database className="w-4 h-4" />
                        Enrich Asset Data
                    </button>
                    <button
                        onClick={() => { setMode('filter'); setFileName(null); setPreviewData([]); setError(null); }}
                        className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${mode === 'filter'
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                            : 'border-transparent text-slate-500 hover:text-slate-700/70 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                    >
                        <Filter className="w-4 h-4" />
                        Bulk Filter List
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    {/* Instructions */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                        {mode === 'enrich' ? (
                            <p>Upload a CSV/Excel file with <strong>Tag</strong> and <strong>Status</strong> columns to add ServiceDesk details to your inventory.</p>
                        ) : (
                            <p>Upload a list of device names to filter the dashboard view to <strong>only</strong> those devices.</p>
                        )}
                    </div>

                    {/* Dropzone */}
                    {!fileName ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                        >
                            <input
                                type="file"
                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                className="hidden"
                                id="file-upload"
                                accept=".csv, .xlsx, .xls"
                            />
                            <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                                    <FileSpreadsheet className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                    {isDragging ? 'Drop file here' : 'Click to upload or drag & drop'}
                                </h3>
                                <p className="text-sm text-slate-500">CSV, XLSX, or XLS files</p>
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* File Info */}
                            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    <span className="font-medium text-slate-900 dark:text-white">{fileName}</span>
                                </div>
                                <button onClick={() => { setFileName(null); setPreviewData([]); }} className="text-xs text-slate-500 hover:text-red-500 underline">Remove</button>
                            </div>

                            {/* Column Mapping Status */}
                            {mode === 'enrich' && (
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className={`p-2 rounded border ${mapping.tag ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        Tag: {mapping.tag || 'Not Found'}
                                    </div>
                                    <div className={`p-2 rounded border ${mapping.status ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        Status: {mapping.status || 'Not Found'}
                                    </div>
                                    <div className={`p-2 rounded border ${mapping.owner ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                        Owner: {mapping.owner || 'Optional'}
                                    </div>
                                </div>
                            )}

                            {mode === 'filter' && (
                                <div className={`p-2 rounded border text-xs text-center ${mapping.device ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                    Device Name Column: {mapping.device || 'Not Found'}
                                </div>
                            )}

                            {/* Error Msg */}
                            {error && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
                                    <AlertTriangle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {/* Preview Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-400">
                                        <tr>
                                            {columns.map(col => (
                                                <th key={col} className="p-2 border-b border-r last:border-r-0 border-slate-200 dark:border-slate-700">{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {previewData.map((row, i) => (
                                            <tr key={i}>
                                                {columns.map(col => (
                                                    <td key={`${i}-${col}`} className="p-2 border-r last:border-r-0 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-300 whitespace-nowrap">
                                                        {String(row[col] ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                    <button
                        onClick={processData}
                        disabled={!fileName || !!error || (mode === 'enrich' && (!mapping.tag || !mapping.status)) || (mode === 'filter' && !mapping.device)}
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        {mode === 'enrich' ? 'Import & Enrich' : 'Apply Filter'}
                    </button>
                </div>
            </div>
        </div>
    );
};
