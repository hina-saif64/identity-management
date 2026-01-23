/**
 * Demo Terminal - Interactive terminal with demo commands and outputs
 */

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Copy, Trash2, Download } from 'lucide-react';

interface DemoTerminalProps {
  addLog: (message: string, module: string, level?: string) => void;
}

interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export const DemoTerminal: React.FC<DemoTerminalProps> = ({ addLog }) => {
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Demo commands and their outputs
  const demoCommands = {
    'help': `Available Demo Commands:
  help                    - Show this help message
  get-adusers            - Fetch Active Directory users
  get-devices            - Get device inventory
  get-capolicies         - List Conditional Access policies
  get-powerbiusage       - Show PowerBI usage statistics
  test-connection        - Test connectivity to services
  get-logs               - Show recent system logs
  clear                  - Clear terminal
  whoami                 - Show current user context`,

    'get-adusers': `Connecting to Active Directory...
Fetching user accounts...

Found 650 users:
  - 618 Enabled accounts
  - 32 Disabled accounts
  - 45 Guest users
  - 125 Stale users (90+ days inactive)

Sample users:
  john.doe@demo.contoso.com        [Enabled]  IT Department
  jane.smith@demo.contoso.com      [Enabled]  Finance Department
  mike.johnson@demo.contoso.com    [Disabled] Marketing Department

Operation completed successfully.`,

    'get-devices': `Scanning device inventory across all systems...
Entra ID: Connected ✓
Intune: Connected ✓
Active Directory: Connected ✓

Device Summary:
  Total Devices: 1,200
  Entra ID: 1,020 devices
  Intune: 900 devices
  Active Directory: 1,080 devices
  
Health Status:
  Active: 856 devices
  Warning: 234 devices
  Stale: 89 devices
  Disabled: 21 devices

Duplicate Detection: 18 potential duplicates found
Recommendation: Review stale devices for cleanup`,

    'get-capolicies': `Retrieving Conditional Access policies...

Policy Summary:
  Total Policies: 10
  Enabled: 7 policies
  Disabled: 1 policy
  Report-Only: 2 policies

High-Impact Policies:
  ✓ Block Legacy Authentication (96% compliance)
  ✓ Require MFA for All Users (92% compliance)
  ✓ Block High Risk Sign-ins (90% compliance)
  
Exclusions Summary:
  Total Exclusions: 115 users
  High Risk Exclusions: 12 users
  
Recommendation: Review high-risk exclusions quarterly`,

    'get-powerbiusage': `Analyzing PowerBI usage patterns...

Usage Statistics:
  Total Users: 150
  Active Users: 128 (85%)
  Premium Licenses: 45
  Pro Licenses: 78
  Free Licenses: 27

Content Summary:
  Workspaces: 16 (14 active, 2 orphaned)
  Reports: 89 (80 published)
  Total Views: 45,678 (last 30 days)
  Storage Used: 4.8 GB

Top Workspaces by Usage:
  1. Finance Analytics - 12,456 views
  2. Sales Dashboard - 8,923 views
  3. Executive Reports - 6,789 views`,

    'test-connection': `Testing connectivity to Microsoft services...

Azure AD Graph API: ✓ Connected (Response: 45ms)
Microsoft Graph API: ✓ Connected (Response: 52ms)
PowerBI REST API: ✓ Connected (Response: 38ms)
Exchange Online: ✓ Connected (Response: 67ms)

Active Directory:
  Domain Controller: demo.contoso.com ✓ Connected
  LDAP Port 389: ✓ Open
  Global Catalog 3268: ✓ Open

Key Vault Access:
  Vault: hyperion-demo-vault ✓ Accessible
  Secrets: 12 secrets available
  Certificates: 3 certificates valid

All systems operational.`,

    'get-logs': `Retrieving recent system logs...

[2026-01-23 15:30:15] INFO  Device Inventory: Refreshed 1,200 devices successfully
[2026-01-23 15:28:42] INFO  User Intelligence: Stale users filter applied (125 results)
[2026-01-23 15:25:33] INFO  CA Exclusions: Policy 'Block Legacy Auth' updated
[2026-01-23 15:22:18] WARN  PowerBI Usage: Orphaned workspace detected: 'Old Marketing'
[2026-01-23 15:20:05] INFO  Authentication: AD auto-connection established
[2026-01-23 15:18:47] INFO  Universal Auth: Cloud connection verified
[2026-01-23 15:15:22] INFO  System: Demo environment initialized
[2026-01-23 15:12:08] INFO  Startup: All modules loaded successfully

Log retention: 30 days | Total entries: 2,847`,

    'whoami': `Current User Context:

User: demo-admin@demo.contoso.com
Role: Global Administrator
Tenant: Demo Contoso (12345678-1234-1234-1234-123456789abc)
Session: demo-session-12345

Permissions:
  ✓ Azure AD Administration
  ✓ Intune Administration  
  ✓ PowerBI Administration
  ✓ Exchange Administration
  ✓ Conditional Access Management

Connected Services:
  ✓ Microsoft Graph API
  ✓ Active Directory
  ✓ PowerBI Service
  ✓ Azure Key Vault

Demo Mode: Active 🎭`
  };

  // Initialize with welcome message
  useEffect(() => {
    const welcomeEntries: TerminalEntry[] = [
      {
        id: '1',
        type: 'output',
        content: `🎭 Hyperion Demo Terminal
Version 1.0.0 - Demo Environment

Welcome to the Hyperion management terminal!
Type 'help' to see available commands.
All data shown is simulated for demonstration purposes.

Ready for commands...`,
        timestamp: new Date()
      }
    ];
    setEntries(welcomeEntries);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [entries]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    const commandEntry: TerminalEntry = {
      id: Date.now().toString(),
      type: 'command',
      content: `PS C:\\Hyperion> ${command}`,
      timestamp: new Date()
    };

    setEntries(prev => [...prev, commandEntry]);
    setIsExecuting(true);
    addLog(`Executing command: ${command}`, 'Terminal');

    // Simulate command execution delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    let output = '';
    let outputType: 'output' | 'error' = 'output';

    if (command.toLowerCase() === 'clear') {
      setEntries([]);
      setIsExecuting(false);
      return;
    }

    const lowerCommand = command.toLowerCase().trim();
    if (demoCommands[lowerCommand as keyof typeof demoCommands]) {
      output = demoCommands[lowerCommand as keyof typeof demoCommands];
    } else {
      output = `Command '${command}' not recognized. Type 'help' for available commands.`;
      outputType = 'error';
    }

    const outputEntry: TerminalEntry = {
      id: (Date.now() + 1).toString(),
      type: outputType,
      content: output,
      timestamp: new Date()
    };

    setEntries(prev => [...prev, outputEntry]);
    setIsExecuting(false);
    addLog(`Command completed: ${command}`, 'Terminal', outputType === 'error' ? 'error' : 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && !isExecuting) {
      executeCommand(currentCommand.trim());
      setCurrentCommand('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearTerminal = () => {
    setEntries([]);
    addLog('Terminal cleared', 'Terminal');
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    addLog('Content copied to clipboard', 'Terminal');
  };

  const exportLogs = () => {
    const logContent = entries.map(entry => 
      `[${entry.timestamp.toISOString()}] ${entry.type.toUpperCase()}: ${entry.content}`
    ).join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyperion-demo-terminal-${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('Terminal logs exported', 'Terminal');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <Terminal className="w-6 h-6 mr-2" />
            Interactive Terminal
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Execute PowerShell commands and view system outputs
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearTerminal}
            className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </button>
          <button
            onClick={exportLogs}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="text-sm text-slate-400 font-mono">
            PowerShell 7.4.0 - Hyperion Demo Terminal
          </div>
          <div className="w-16"></div>
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="h-96 overflow-y-auto p-4 font-mono text-sm"
        >
          {entries.map((entry) => (
            <div key={entry.id} className="mb-2 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {entry.type === 'command' && (
                    <div className="text-green-400 mb-1">{entry.content}</div>
                  )}
                  {entry.type === 'output' && (
                    <div className="text-slate-300 whitespace-pre-wrap">{entry.content}</div>
                  )}
                  {entry.type === 'error' && (
                    <div className="text-red-400 whitespace-pre-wrap">{entry.content}</div>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(entry.content)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-slate-500 hover:text-slate-300 transition-opacity"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          
          {isExecuting && (
            <div className="text-yellow-400 animate-pulse">
              Executing command...
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="border-t border-slate-700 p-4">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <span className="text-green-400 font-mono text-sm">PS C:\Hyperion&gt;</span>
            <input
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              placeholder="Enter command..."
              className="flex-1 bg-transparent text-slate-300 font-mono text-sm focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!currentCommand.trim() || isExecuting}
              className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3 mr-1" />
              Run
            </button>
          </form>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-3">Quick Commands</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(demoCommands).map((command) => (
            <button
              key={command}
              onClick={() => {
                setCurrentCommand(command);
                executeCommand(command);
              }}
              disabled={isExecuting}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 font-mono"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      {/* Command Reference */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">Demo Commands Available</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">System Commands</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300 font-mono">
              <li>• help - Show available commands</li>
              <li>• whoami - Current user context</li>
              <li>• test-connection - Test connectivity</li>
              <li>• get-logs - Show system logs</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Data Commands</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300 font-mono">
              <li>• get-adusers - Fetch AD users</li>
              <li>• get-devices - Device inventory</li>
              <li>• get-capolicies - CA policies</li>
              <li>• get-powerbiusage - PowerBI stats</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};