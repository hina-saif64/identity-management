
import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShieldAlert, Activity, RefreshCw, Zap, Sparkles, UserX, UserCheck, ExternalLink } from 'lucide-react';
import { CHART_DATA } from '../constants';
import { LogEntry } from '../types';
import { UserSummary } from './ADUsers/types/enhanced.types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

interface DashboardProps {
  addLog?: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
  // Theme added to support dynamic chart colors
  theme?: 'light' | 'dark';
  userSummary?: UserSummary | null;
  lastFetched?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ addLog, theme, userSummary, lastFetched }) => {
  const [uptime, setUptime] = useState('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setUptime(now.toLocaleTimeString());
    }, 1000);

    if (addLog) {
      addLog('Dashboard telemetry synchronized.', 'SYSTEM', 'info');
    }

    return () => clearInterval(timer);
  }, []);

  // Calculate real metrics or use defaults (0)
  const metrics = [
    {
      name: 'Total Users',
      value: userSummary?.total || 0,
      change: 0, // We could calculate this if we had historical data, defaulting to 0 for now
      icon: Users,
      color: 'blue'
    },
    {
      name: 'Active Users',
      value: userSummary?.enabled || 0,
      change: 0,
      icon: UserCheck,
      color: 'green'
    },
    {
      name: 'Disabled Users',
      value: userSummary?.disabled || 0,
      change: 0,
      icon: UserX,
      color: 'red'
    },
    {
      name: 'Guest Users',
      value: userSummary?.guestUsers || 0,
      change: 0,
      icon: ExternalLink,
      color: 'indigo'
    }
  ];

  return (
    <div className="space-y-2.5 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 p-1 bg-gradient-to-r from-blue-600/20 via-blue-600/5 to-transparent rounded-xl border border-blue-500/20 flex items-center gap-3 px-3 py-2 overflow-hidden relative shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Zap className="w-16 h-16 text-blue-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Hyperion Engine Status</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Gateway Operating in <span className="text-blue-600 dark:text-blue-400">Hybrid Cloud Mode</span></h2>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Uptime</p>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{uptime}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-slate-500 font-bold uppercase">Last Sync</p>
              <p className="text-xs font-mono text-green-600 dark:text-green-400">
                {lastFetched ? new Date(lastFetched).toLocaleTimeString() : '--:--'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-500/10 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">AI SECURE PROXY</p>
              <p className="text-[8px] text-slate-500 uppercase tracking-tighter">VAPT Verified - HARDENED</p>
            </div>
          </div>
          <button className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[8px] font-bold text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest">AUDIT</button>
        </div>
      </div>

      {/* Metric Cards - Dynamic Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {metrics.map((metric) => (
          <div key={`stat-${metric.name}`} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 group hover:border-blue-500/30 transition-all cursor-default relative overflow-hidden shadow-sm hover:shadow-md">
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-10 transition-opacity">
              <metric.icon className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="p-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 group-hover:border-blue-500/50 transition-colors">
                <metric.icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              {/* Change indicator - kept for layout but static 0% for now */}
              <div className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-lg ${metric.change >= 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                {metric.change >= 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">{metric.name}</h3>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {metric.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 shadow-sm h-[280px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Identity Flow Analysis</h3>
              <p className="text-[9px] text-slate-500 font-medium">Real-time logon & sync telemetry across all sites</p>
            </div>
          </div>
          <div className="w-full h-[210px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height={210} minWidth={300} minHeight={210}>
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="colorLogons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {/* Fixed CartesianGrid by removing invalid dark:stroke prop and using dynamic stroke based on theme */}
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                  itemStyle={{ color: '#0f172a', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="logons" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorLogons)" />
                <Area type="monotone" dataKey="syncs" stroke="#818cf8" strokeWidth={1.5} fill="transparent" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 shadow-sm flex flex-col h-[280px]">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-0.5">Entra ID Compliance</h3>
          <p className="text-[9px] text-slate-500 mb-4">Object alignment between AD and Azure</p>

          <div className="w-full h-[140px] flex items-center justify-center relative mb-4">
            <ResponsiveContainer width="100%" height={140} minWidth={200} minHeight={140}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Compliant', value: 85 },
                    { name: 'Drifted', value: 10 },
                    { name: 'Failed', value: 5 },
                  ]}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`dist-cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 dark:text-white">85%</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Healthy</span>
            </div>
          </div>
          <div className="space-y-1.5 mt-auto">
            {['Synchronized', 'MFA Enrolled', 'Pending Sync'].map((label, idx) => (
              <div key={`legend-${idx}`} className="flex justify-between items-center p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">{label}</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">{(idx + 1) * 123}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
