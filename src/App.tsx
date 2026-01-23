/**
 * 🎭 Hyperion Demo App - Complete Enterprise Identity Management Demo
 * All data is simulated - No real credentials required!
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Users, Shield, BarChart3, Settings, LogOut } from 'lucide-react';
import { DemoAuth } from './components/DemoAuth';
import { DemoUniversalAuth } from './components/DemoUniversalAuth';
import { DemoDeviceInventory } from './components/DemoDeviceInventory';
import { DemoUserIntelligence } from './components/DemoUserIntelligence';
import { DemoCAExclusions } from './components/DemoCAExclusions';
import { DemoPowerBI } from './components/DemoPowerBI';
import { DemoTerminal } from './components/DemoTerminal';
import { DemoIndicator } from './components/DemoIndicator';

type ActiveTab = 'auth' | 'devices' | 'users' | 'ca' | 'powerbi' | 'terminal';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cloudConnection, setCloudConnection] = useState({
    isConnected: false,
    tenantId: '',
    appId: '',
    vaultName: '',
    secretName: ''
  });
  const [adConnection, setAdConnection] = useState({
    isConnected: false,
    server: '',
    sessionId: ''
  });

  // Auto-connect in demo mode after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuthenticated(true);
      setCloudConnection({
        isConnected: true,
        tenantId: '12345678-1234-1234-1234-123456789abc',
        appId: '87654321-4321-4321-4321-abcdef123456',
        vaultName: 'hyperion-demo-vault',
        secretName: 'demo-ad-password'
      });
      setAdConnection({
        isConnected: true,
        server: 'demo.contoso.com',
        sessionId: 'demo-session-12345'
      });
      setActiveTab('devices');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCloudConnection({ isConnected: false, tenantId: '', appId: '', vaultName: '', secretName: '' });
    setAdConnection({ isConnected: false, server: '', sessionId: '' });
    setActiveTab('auth');
  };

  const addLog = (message: string, module: string, level: string = 'info') => {
    console.log(`[${module}] ${level.toUpperCase()}: ${message}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <DemoIndicator />
        <DemoAuth onAuthenticated={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <DemoIndicator />
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-bold text-slate-900 dark:text-white">
                Hyperion <span className="text-sm text-slate-500">Demo</span>
              </h1>
            </div>
            
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('devices')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'devices'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Device Inventory
              </button>
              
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'users'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                User Intelligence
              </button>
              
              <button
                onClick={() => setActiveTab('ca')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'ca'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4 mr-2" />
                CA Exclusions
              </button>
              
              <button
                onClick={() => setActiveTab('powerbi')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'powerbi'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                PowerBI Usage
              </button>
              
              <button
                onClick={() => setActiveTab('terminal')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'terminal'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Terminal
              </button>
            </nav>
            
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Universal Auth Status */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <DemoUniversalAuth 
            cloudConnection={cloudConnection}
            adConnection={adConnection}
            onCloudConnect={setCloudConnection}
            onAdConnect={setAdConnection}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'devices' && (
          <DemoDeviceInventory 
            cloudConnection={cloudConnection}
            adConnection={adConnection}
            addLog={addLog}
          />
        )}
        
        {activeTab === 'users' && (
          <DemoUserIntelligence 
            cloudConnection={cloudConnection}
            adConnection={adConnection}
            addLog={addLog}
          />
        )}
        
        {activeTab === 'ca' && (
          <DemoCAExclusions 
            cloudConnection={cloudConnection}
            addLog={addLog}
          />
        )}
        
        {activeTab === 'powerbi' && (
          <DemoPowerBI 
            cloudConnection={cloudConnection}
            addLog={addLog}
          />
        )}
        
        {activeTab === 'terminal' && (
          <DemoTerminal addLog={addLog} />
        )}
      </main>
    </div>
  );
}

export default App;