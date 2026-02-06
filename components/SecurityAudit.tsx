
import React from 'react';
import { ShieldAlert, ShieldCheck, Lock, Activity, Eye, AlertCircle, Terminal, HardDrive, Cpu } from 'lucide-react';
import { ConnectionState, LogEntry } from '../types';

interface SecurityAuditProps {
  connection: ConnectionState;
  addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
}

const SecurityAudit: React.FC<SecurityAuditProps> = ({ connection, addLog }) => {
  const findings = [
    { title: "PowerShell Input Sanitization", status: "Active", severity: "High", icon: Terminal, color: "text-green-400" },
    { title: "Rate Limiting (Anti-Brute Force)", status: "Active", severity: "Medium", icon: Activity, color: "text-green-400" },
    { title: "EncodedCommand Protocol", status: "Active", severity: "Critical", icon: Lock, color: "text-green-400" },
    { title: "Local Gateway Key Check", status: connection.isBackendVerified ? "Verified" : "Bypassed", severity: "High", icon: ShieldCheck, color: connection.isBackendVerified ? "text-green-400" : "text-yellow-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">VAPT Audit Log</h2>
            <p className="text-slate-500 text-sm mt-1">Gateway security posture and real-time threat analysis.</p>
          </div>
          <div className="px-6 py-3 bg-indigo-600 rounded-2xl flex items-center gap-3 shadow-xl shadow-indigo-600/20">
              <ShieldCheck className="w-5 h-5 text-white" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Hardened Kernel 2.0</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {findings.map((f, i) => (
              <div key={i} className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                      <f.icon className="w-16 h-16" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-xl bg-slate-950 border border-slate-800 ${f.color}`}>
                          <f.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{f.severity} IMPACT</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${f.color.replace('text', 'bg')} animate-pulse`} />
                      <span className={`text-xs font-bold ${f.color}`}>{f.status}</span>
                  </div>
              </div>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
          <div className="p-8 bg-slate-950 border border-slate-800 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Detected Surface Threats</h3>
                  <Eye className="w-5 h-5 text-slate-600" />
              </div>
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                      <div className="flex items-center gap-4">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <div>
                              <p className="text-xs font-bold text-white">PS Sub-expression Hijack</p>
                              <p className="text-[10px] text-slate-500">Blocked 0 attempts this session.</p>
                          </div>
                      </div>
                      <span className="text-[10px] font-black text-green-500 uppercase">Mitigated</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                      <div className="flex items-center gap-4">
                          <AlertCircle className="w-5 h-5 text-yellow-500" />
                          <div>
                              <p className="text-xs font-bold text-white">LDAP Credential Brute-Force</p>
                              <p className="text-[10px] text-slate-500">Rate limiter active on Gateway.</p>
                          </div>
                      </div>
                      <span className="text-[10px] font-black text-green-500 uppercase">Mitigated</span>
                  </div>
              </div>
          </div>

          <div className="p-8 bg-indigo-600/5 border border-indigo-600/10 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 opacity-10">
                  <ShieldAlert className="w-64 h-64 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-6">Security Integrity Report</h3>
              <div className="space-y-6 relative z-10">
                  <div className="flex items-start gap-4">
                      <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                          <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-white">Input Sanitizer Engine</p>
                          <p className="text-[10px] text-slate-500 mt-1">Version 2.4.1 (Strict Whitelist). All LDAP parameters are Scrubbed before execution.</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-4">
                      <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                          <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-white">Gateway Secret Policy</p>
                          <p className="text-[10px] text-slate-500 mt-1">Handshake requires X-Hyperion-Key. Ensure environment variables match the Gateway configuration.</p>
                      </div>
                  </div>
              </div>
              <button className="mt-8 w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all">Download Audit PDF</button>
          </div>
      </div>
    </div>
  );
};

export default SecurityAudit;
