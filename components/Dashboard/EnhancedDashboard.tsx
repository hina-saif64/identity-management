import React, { useRef, useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Cloud,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Server,
  Globe,
  Zap,
  BarChart3,
  MousePointer2
} from 'lucide-react';

interface DashboardProps {
  addLog: (message: string, module: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
  theme: 'light' | 'dark';
  userSummary?: any;
  lastFetched?: string | null;
  onNavigate?: (tab: string) => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  theme: 'light' | 'dark';
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color,
  theme,
  onClick
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-emerald-400';
      case 'negative': return 'text-rose-400';
      default: return theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
    }
  };

  return (
    <div
      className={`spotlight-card group relative overflow-hidden rounded-xl border transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
        } ${theme === 'dark'
          ? 'border-white/10 bg-slate-900/40 hover:bg-slate-800/60'
          : 'border-slate-200/60 bg-white/60 hover:bg-white/80'
        } backdrop-blur-xl shadow-lg hover:shadow-2xl`}
      onClick={onClick}
    >
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ring-1 ring-white/20 ${color} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {change && (
            <div className={`flex items-center gap-1 text-xs font-bold ${getChangeColor()} px-2 py-1 rounded-full bg-slate-500/10`}>
              {changeType === 'positive' && <TrendingUp className="w-3 h-3" />}
              {change}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
            {value}
          </h3>
          <p className={`text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
            {title}
          </p>
        </div>
      </div>
    </div>
  );
};

const QuickActionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  theme: 'light' | 'dark';
  onClick: () => void;
}> = ({ title, description, icon: Icon, color, theme, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`spotlight-card w-full text-left group relative overflow-hidden rounded-lg border p-3 transition-all duration-300 ${theme === 'dark'
        ? 'border-white/5 bg-slate-800/30 hover:bg-slate-700/40'
        : 'border-slate-200/50 bg-white/40 hover:bg-white/60'
        } backdrop-blur-md hover:shadow-lg`}
    >
      <div className="relative z-10 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-gradient-to-br ring-1 ring-white/10 ${color} shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h4 className={`font-bold text-sm mb-0.5 ${theme === 'dark' ? 'text-white group-hover:text-indigo-300' : 'text-slate-900 group-hover:text-indigo-600'
            } transition-colors`}>
            {title}
          </h4>
          <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
            {description}
          </p>
        </div>
        <MousePointer2 className={`w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
          }`} />
      </div>
    </button>
  );
};

const EnhancedDashboard: React.FC<DashboardProps> = ({
  addLog,
  theme,
  userSummary,
  lastFetched,
  onNavigate
}) => {
  // Spotlight Ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse Move Handler for Spotlight Effect using CSS Variables
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const cards = containerRef.current.getElementsByClassName('spotlight-card');
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
      (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
    }
  };

  const handleQuickAction = (action: string, description: string) => {
    addLog(`Quick Action: ${description}`, 'DASHBOARD', 'info');
    (window as any).showNotification?.({
      type: 'info',
      title: 'Quick Action',
      message: description,
      duration: 8000
    });

    if (onNavigate) {
      onNavigate(action);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="space-y-6 relative z-10 pb-8" // Reduced spacing from 8 to 6, padding from 10 to 8
    >
      {/* Aurora Background now handled globally in App.tsx */}

      {/* Welcome Header Removed per user request for cleaner UI */}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> {/* Reduced gap from 6 to 4 */}
        <MetricCard
          title="Active Users"
          value={userSummary?.totalUsers || "14,205"} // Mock data if 0
          change="12%"
          changeType="positive"
          icon={Users}
          color="from-blue-500 to-cyan-400"
          theme={theme}
        />

        <MetricCard
          title="Security Score"
          value="98.5%"
          change="2.4%"
          changeType="positive"
          icon={Shield}
          color="from-violet-500 to-fuchsia-500"
          theme={theme}
        />

        <MetricCard
          title="Cloud Assets"
          value="2,847"
          change="8%"
          changeType="neutral"
          icon={Cloud}
          color="from-indigo-500 to-purple-500"
          theme={theme}
        />

        <MetricCard
          title="System Uptime"
          value="99.99%"
          change="Stable"
          changeType="positive"
          icon={Activity}
          color="from-emerald-400 to-teal-500"
          theme={theme}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
          <MousePointer2 className="w-5 h-5 text-indigo-500" />
          Quick Command Center
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Row 1 */}
          <QuickActionCard
            title="Advanced Analytics"
            description="Deep dive into AI-powered insights"
            icon={BarChart3}
            color="from-violet-600 to-indigo-600"
            theme={theme}
            onClick={() => handleQuickAction('advanced-analytics', 'Navigate to Advanced Analytics')}
          />

          <QuickActionCard
            title="User Intelligence"
            description="360° Identity profiling & risks"
            icon={Users}
            color="from-blue-600 to-cyan-600"
            theme={theme}
            onClick={() => handleQuickAction('users', 'Navigate to User Intelligence')}
          />

          <QuickActionCard
            title="Security Audit (VAPT)"
            description="Run vulnerability assessment"
            icon={Shield}
            color="from-rose-600 to-red-600"
            theme={theme}
            onClick={() => handleQuickAction('security', 'Navigate to Security VAPT')}
          />

          {/* Row 2 */}
          <QuickActionCard
            title="Cloud Reporting"
            description="Azure & O365 usage metrics"
            icon={Cloud}
            color="from-sky-500 to-blue-500"
            theme={theme}
            onClick={() => handleQuickAction('cloud', 'Navigate to Cloud Reporting')}
          />

          <QuickActionCard
            title="PowerBI Analytics"
            description="Visualize audit logs & trends"
            icon={TrendingUp}
            color="from-amber-500 to-orange-500"
            theme={theme}
            onClick={() => handleQuickAction('powerbi', 'Navigate to PowerBI Usage')}
          />

          <QuickActionCard
            title="Terminal Direct"
            description="Execute PowerShell commands"
            icon={Database}
            color="from-slate-600 to-slate-800"
            theme={theme}
            onClick={() => handleQuickAction('terminal', 'Navigate to Terminal')}
          />
        </div>
      </div>

      {/* System Status */}
      <div className={`glass-premium rounded-xl p-6 border ${theme === 'dark'
        ? 'border-white/5 bg-slate-900/40' // Keep transparent for Aurora
        : 'border-slate-200/50 bg-white/50'
        }`}>
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
          <Server className="w-5 h-5 text-emerald-500" />
          System Health Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            <div>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                Authentication Core
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                ● Operational (12ms latency)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            <div>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                AI Data Processing
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                ● Active (Gemini-Pro)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            <div>
              <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                Scheduled Tasks
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                }`}>
                ● Next: Sunday 02:00 AM
              </p>
            </div>
          </div>
        </div>
      </div>

      {lastFetched && (
        <div className="text-center pt-4">
          <p className={`text-xs font-mono opacity-50 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>
            LAST SYNC: {lastFetched}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedDashboard;