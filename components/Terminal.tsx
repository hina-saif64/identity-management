
import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, ChevronRight, Circle, Info } from 'lucide-react';
import { TerminalLine, ConnectionState, LogEntry } from '../types';
import { geminiService } from '../services/geminiService';
import { apiService } from '../services/apiService';

interface TerminalProps {
  connection: ConnectionState;
  addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
}

const Terminal: React.FC<TerminalProps> = ({ connection, addLog }) => {
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: `Hyperion Remote Shell [1.2.5]`, type: 'output' },
    { text: `Session attached to DC: ${connection.domain}`, type: 'success' },
    { text: connection.isBackendVerified ? `MODE: PRODUCTION (REAL POWERSHELL)` : `MODE: SANDBOX (AI SIMULATED)`, type: 'output' },
    { text: `🚀 Full PowerShell Access Enabled`, type: 'success' },
    { text: ``, type: 'output' },
  ]);
  const [input, setInput] = useState('');
  const [psVersion, setPsVersion] = useState<'5.1' | '7.4'>(connection.psVersion);
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, isExecuting]);

  const handleCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory(prev => [...prev, { text: `PS HYP:\\> ${trimmed}`, type: 'input' }]);
    setInput('');
    setIsExecuting(true);
    addLog(`Executing: ${trimmed}`, 'TERMINAL', 'info');

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setIsExecuting(false);
      return;
    }

    try {
      if (connection.isBackendVerified) {
        // ACTUAL EXECUTION - No admin restrictions
        const output = await apiService.executePs(connection.backendUrl, trimmed);
        setHistory(prev => [...prev, { text: output, type: 'output' }]);
        addLog(`Command resolved by local Gateway.`, 'TERMINAL', 'success');
      } else {
        // AI SIMULATION
        const prompt = `Simulate PowerShell output for: ${trimmed}. Ensure it looks like real terminal output. No explanations.`;
        const output = await geminiService.getADInsight(prompt);
        setHistory(prev => [...prev, { text: output, type: 'output' }]);
        addLog(`Command resolved via AI Simulator.`, 'TERMINAL', 'info');
      }
    } catch (e: any) {
      setHistory(prev => [...prev, { text: `Error: ${e.message}`, type: 'error' }]);
      addLog(`Execution failed: ${e.message}`, 'TERMINAL', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl flex items-center gap-4 border ${
        connection.isBackendVerified ? 'bg-green-500/5 border-green-500/20' : 'bg-blue-500/5 border-blue-500/20'
      }`}>
          <div className={`p-2 rounded-lg ${connection.isBackendVerified ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
              <Info className={`w-5 h-5 ${connection.isBackendVerified ? 'text-green-500' : 'text-blue-500'}`} />
          </div>
          <div className="flex-1">
              <p className={`text-xs font-bold uppercase tracking-widest ${connection.isBackendVerified ? 'text-green-400' : 'text-blue-400'}`}>
                {connection.isBackendVerified ? 'Live Gateway Connected' : 'Terminal Sandbox Active'}
              </p>
              <p className="text-xs text-slate-500">
                {connection.isBackendVerified 
                    ? `Commands are executing directly on ${connection.domain} via local node server.` 
                    : "Requests are currently being handled by Hyperion AI for demonstration."}
              </p>
          </div>
      </div>

      <div className="flex flex-col border border-slate-800 rounded-3xl overflow-hidden bg-black h-[550px] shadow-2xl relative">
        <div className="bg-slate-900/80 px-4 py-3 flex items-center justify-between border-b border-slate-800/50">
           <div className="flex items-center gap-3">
              <TerminalIcon className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PowerShell Core</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-[8px] font-bold uppercase tracking-widest border border-green-500/30">
                🚀 Full Access
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] space-y-1.5 custom-scrollbar" ref={scrollRef}>
          {history.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap ${
              line.type === 'input' ? 'text-blue-400 font-bold pt-4' :
              line.type === 'error' ? 'text-red-400' :
              line.type === 'success' ? 'text-green-400' :
              'text-slate-300'
            }`}>
              {line.text}
            </div>
          ))}
          {isExecuting && (
            <div className="text-slate-600 animate-pulse mt-1 flex items-center gap-2">
                <Circle className="w-2 h-2 fill-current" />
                <span>Processing request...</span>
            </div>
          )}
        </div>

        <div className="bg-slate-900/40 p-4 border-t border-slate-800 flex items-center gap-3">
          <ChevronRight className="w-4 h-4 text-blue-600" />
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCommand(input)}
            className="flex-1 bg-transparent border-none outline-none text-slate-300 font-mono text-xs"
            autoFocus
            placeholder="PS HYP:\> type your command here..."
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
