import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Play, Square, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Props for the EmbeddedTerminal component
 */
interface EmbeddedTerminalProps {
    /** Callback when Exchange Online connection is established */
    onConnectionSuccess: (connectionInfo: any) => void;
    /** Callback when connection fails */
    onConnectionError: (error: string) => void;
    /** Current connection state */
    isConnecting: boolean;
    /** Backend base URL */
    baseUrl: string;
}

/**
 * Embedded PowerShell Terminal Component
 * 
 * Provides an in-browser terminal interface for Exchange Online authentication.
 * Users can run Connect-ExchangeOnline directly within the app without external PowerShell.
 * 
 * Features:
 * - Real-time PowerShell command execution
 * - Interactive authentication flow
 * - Connection status monitoring
 * - Automatic session detection
 * - Error handling and display
 * 
 * @param onConnectionSuccess - Callback when EXO connection succeeds
 * @param onConnectionError - Callback when connection fails
 * @param isConnecting - Current connection state
 * @param baseUrl - Backend base URL for API calls
 * 
 * @example
 * ```tsx
 * <EmbeddedTerminal
 *   onConnectionSuccess={handleSuccess}
 *   onConnectionError={handleError}
 *   isConnecting={connecting}
 *   baseUrl="http://localhost:3001"
 * />
 * ```
 */
export const EmbeddedTerminal: React.FC<EmbeddedTerminalProps> = ({
    onConnectionSuccess,
    onConnectionError,
    isConnecting,
    baseUrl
}) => {
    const [output, setOutput] = useState<string[]>([]);
    const [currentCommand, setCurrentCommand] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const terminalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * Scrolls terminal to bottom when new output is added
     */
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [output]);

    /**
     * Adds a line to terminal output
     */
    const addOutput = (line: string, type: 'command' | 'output' | 'error' | 'success' = 'output') => {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'command' ? 'PS> ' : 
                      type === 'error' ? '❌ ' : 
                      type === 'success' ? '✅ ' : '   ';
        
        setOutput(prev => [...prev, `[${timestamp}] ${prefix}${line}`]);
    };

    /**
     * Executes PowerShell command via backend
     */
    const executeCommand = async (command: string) => {
        if (!command.trim()) return;

        setIsExecuting(true);
        addOutput(command, 'command');

        try {
            const response = await fetch(`${baseUrl}/api/terminal/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Check if response has content
            const text = await response.text();
            if (!text) {
                throw new Error('Empty response from server');
            }

            // Try to parse JSON
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
            }

            if (result.status === 'success') {
                if (result.output) {
                    result.output.split('\n').forEach((line: string) => {
                        if (line.trim()) addOutput(line);
                    });
                } else {
                    addOutput('Command executed successfully (no output)');
                }

                // Check if this was a Connect-ExchangeOnline command
                if (command.toLowerCase().includes('connect-exchangeonline')) {
                    await checkConnectionStatus();
                }
            } else {
                addOutput(`Error: ${result.error}`, 'error');
                if (result.detail) {
                    addOutput(result.detail, 'error');
                }
            }
        } catch (error) {
            addOutput(`Network error: ${error}`, 'error');
        } finally {
            setIsExecuting(false);
        }
    };

    /**
     * Checks Exchange Online connection status
     */
    const checkConnectionStatus = async () => {
        try {
            const response = await fetch(`${baseUrl}/api/powerbi/status`);
            const result = await response.json();

            if (result.connected) {
                setConnectionStatus('connected');
                addOutput('Exchange Online connection established!', 'success');
                onConnectionSuccess(result);
            } else {
                setConnectionStatus('disconnected');
            }
        } catch (error) {
            addOutput(`Status check failed: ${error}`, 'error');
        }
    };

    /**
     * Handles Enter key press in command input
     */
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isExecuting) {
            executeCommand(currentCommand);
            setCurrentCommand('');
        }
    };

    /**
     * Quick connect function that runs Connect-ExchangeOnline
     */
    const quickConnect = () => {
        const connectCommand = 'Connect-ExchangeOnline -ShowBanner:$false';
        setCurrentCommand(connectCommand);
        executeCommand(connectCommand);
    };

    /**
     * Initializes terminal with welcome message
     */
    useEffect(() => {
        addOutput('PowerShell Terminal for Exchange Online Authentication', 'success');
        addOutput('Type "Connect-ExchangeOnline" or click Quick Connect button');
        addOutput('Commands: help, Get-ConnectionInformation, Connect-ExchangeOnline');
        addOutput('─'.repeat(60));
    }, []);

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            {/* Terminal Header */}
            <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-bold text-sm">PowerShell Terminal</span>
                    <div className="flex items-center gap-2">
                        {connectionStatus === 'connected' && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Connected
                            </span>
                        )}
                        {connectionStatus === 'connecting' && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                                <Loader2 className="w-3 h-3 animate-spin" /> Connecting
                            </span>
                        )}
                        {connectionStatus === 'disconnected' && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">
                                <AlertCircle className="w-3 h-3" /> Disconnected
                            </span>
                        )}
                    </div>
                </div>
                
                <button
                    onClick={quickConnect}
                    disabled={isExecuting || connectionStatus === 'connected'}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExecuting ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Executing...
                        </>
                    ) : (
                        <>
                            <Play className="w-3 h-3" /> Quick Connect
                        </>
                    )}
                </button>
            </div>

            {/* Terminal Output */}
            <div 
                ref={terminalRef}
                className="bg-slate-900 text-green-400 font-mono text-sm p-4 h-80 overflow-y-auto custom-scrollbar"
            >
                {output.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap break-words">
                        {line}
                    </div>
                ))}
                
                {isExecuting && (
                    <div className="flex items-center gap-2 text-yellow-400 mt-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Executing command...</span>
                    </div>
                )}
            </div>

            {/* Command Input */}
            <div className="bg-slate-800 border-t border-slate-700 p-3">
                <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-mono text-sm">PS&gt;</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={currentCommand}
                        onChange={(e) => setCurrentCommand(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isExecuting}
                        placeholder="Type PowerShell command here..."
                        className="flex-1 bg-slate-900 text-green-400 font-mono text-sm px-3 py-2 rounded border border-slate-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                        onClick={() => executeCommand(currentCommand)}
                        disabled={isExecuting || !currentCommand.trim()}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Execute
                    </button>
                </div>
                
                <div className="mt-2 text-xs text-slate-400">
                    Press Enter to execute • Type "help" for available commands
                </div>
            </div>
        </div>
    );
};