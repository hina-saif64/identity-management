import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: string;
}

interface SecurityAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
}

interface AdvancedAnalyticsProps {
  theme: 'light' | 'dark';
  addLog: (message: string, category: string, type: string) => void;
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ theme, addLog }) => {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading analytics data
    const loadAnalytics = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockMetrics: AnalyticsMetric[] = [
        {
          id: 'security-score',
          title: 'Security Score',
          value: '94%',
          change: 2.5,
          trend: 'up',
          icon: Shield,
          color: 'emerald'
        },
        {
          id: 'active-users',
          title: 'Active Users',
          value: '1,247',
          change: -3.2,
          trend: 'down',
          icon: Users,
          color: 'blue'
        },
        {
          id: 'threat-detection',
          title: 'Threats Blocked',
          value: '156',
          change: 12.8,
          trend: 'up',
          icon: AlertTriangle,
          color: 'red'
        },
        {
          id: 'system-health',
          title: 'System Health',
          value: '99.2%',
          change: 0.1,
          trend: 'stable',
          icon: Activity,
          color: 'green'
        },
        {
          id: 'compliance-rate',
          title: 'Compliance Rate',
          value: '98.7%',
          change: 1.3,
          trend: 'up',
          icon: CheckCircle,
          color: 'indigo'
        },
        {
          id: 'response-time',
          title: 'Avg Response Time',
          value: '1.2s',
          change: -8.5,
          trend: 'up',
          icon: Clock,
          color: 'purple'
        }
      ];

      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          severity: 'high',
          title: 'Unusual Login Activity',
          description: 'Multiple failed login attempts detected from IP 192.168.1.100',
          timestamp: '2 minutes ago'
        },
        {
          id: '2',
          severity: 'medium',
          title: 'Policy Violation',
          description: 'User attempted to access restricted resource without proper permissions',
          timestamp: '15 minutes ago'
        },
        {
          id: '3',
          severity: 'low',
          title: 'Certificate Expiry Warning',
          description: 'SSL certificate for internal.company.com expires in 30 days',
          timestamp: '1 hour ago'
        }
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setLoading(false);
      
      addLog('Advanced Analytics: Dashboard loaded with real-time metrics', 'ANALYTICS', 'success');
    };

    loadAnalytics();
  }, [addLog]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: 'from-emerald-500 to-emerald-600',
      blue: 'from-blue-500 to-blue-600',
      red: 'from-red-500 to-red-600',
      green: 'from-green-500 to-green-600',
      indigo: 'from-indigo-500 to-indigo-600',
      purple: 'from-purple-500 to-purple-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <div className={`p-8 ${theme === 'dark' ? 'bg-[#0a0f1a] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-lg font-medium">Loading Advanced Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-8 space-y-8 ${theme === 'dark' ? 'bg-[#0a0f1a] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Advanced Analytics
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Real-time insights and predictive intelligence for your organization
          </p>
        </div>
        <div className="flex gap-3">
          <button className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100'}`}>
            <BarChart3 className="w-5 h-5" />
          </button>
          <button className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100'}`}>
            <PieChart className="w-5 h-5" />
          </button>
          <button className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-100'}`}>
            <LineChart className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          return (
            <div
              key={metric.id}
              className={`glass p-6 rounded-xl border transition-all duration-300 hover:scale-105 ${
                theme === 'dark' 
                  ? 'bg-slate-900/50 border-slate-700 hover:bg-slate-800/60' 
                  : 'bg-white/70 border-slate-200 hover:bg-white/90'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${getColorClasses(metric.color)}`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-sm font-medium ${
                    metric.trend === 'up' ? 'text-emerald-500' : 
                    metric.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {metric.title}
                </h3>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Alerts */}
      <div className={`glass p-6 rounded-xl border ${
        theme === 'dark' 
          ? 'bg-slate-900/50 border-slate-700' 
          : 'bg-white/70 border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Security Alerts</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
          }`}>
            {alerts.length} Active
          </span>
        </div>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 transition-colors ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}
              style={{ borderLeftColor: getSeverityColor(alert.severity).replace('bg-', '#') }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`}></span>
                    <h3 className="font-medium">{alert.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {alert.description}
                  </p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    {alert.timestamp}
                  </p>
                </div>
                <button className={`ml-4 px-3 py-1 rounded text-sm font-medium transition-colors ${
                  theme === 'dark' 
                    ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}>
                  Investigate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`glass p-6 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-slate-900/50 border-slate-700' 
            : 'bg-white/70 border-slate-200'
        }`}>
          <h3 className="text-lg font-semibold mb-4">User Activity Trends</h3>
          <div className={`h-64 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
          }`}>
            <div className="text-center">
              <LineChart className="w-12 h-12 mx-auto mb-2 text-blue-500" />
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Interactive chart will be rendered here
              </p>
            </div>
          </div>
        </div>

        <div className={`glass p-6 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-slate-900/50 border-slate-700' 
            : 'bg-white/70 border-slate-200'
        }`}>
          <h3 className="text-lg font-semibold mb-4">Security Distribution</h3>
          <div className={`h-64 rounded-lg flex items-center justify-center ${
            theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-100'
          }`}>
            <div className="text-center">
              <PieChart className="w-12 h-12 mx-auto mb-2 text-purple-500" />
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Interactive pie chart will be rendered here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;