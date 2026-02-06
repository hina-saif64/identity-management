import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Lock } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo?: string;
  active: boolean;
}

interface TenantSwitcherProps {
  theme: 'light' | 'dark';
  disabled?: boolean;
}

// Mock tenant data - will be replaced with real data in future
const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Contoso Corporation',
    domain: 'contoso.com',
    active: true
  },
  {
    id: '2',
    name: 'Fabrikam Inc',
    domain: 'fabrikam.com',
    active: false
  },
  {
    id: '3',
    name: 'Adventure Works',
    domain: 'adventureworks.com',
    active: false
  }
];

const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ 
  theme, 
  disabled = true // Disabled by default until multi-tenant is implemented
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTenant] = useState(mockTenants.find(t => t.active) || mockTenants[0]);

  if (disabled) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border opacity-50 ${
        theme === 'dark'
          ? 'border-slate-700 bg-slate-800/50 text-slate-500'
          : 'border-slate-200 bg-slate-100/50 text-slate-400'
      }`}>
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">Single Tenant</span>
        <Lock className="w-3 h-3" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          theme === 'dark'
            ? 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
            : 'border-slate-200 bg-slate-100/50 text-slate-700 hover:bg-slate-200/50'
        }`}
      >
        <Building2 className="w-4 h-4" />
        <div className="text-left">
          <div className="text-sm font-medium">{selectedTenant.name}</div>
          <div className={`text-xs ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {selectedTenant.domain}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-64 rounded-lg shadow-lg border z-50 glass ${
          theme === 'dark'
            ? 'border-slate-700 bg-slate-800/95'
            : 'border-slate-200 bg-white/95'
        }`}>
          <div className="py-2">
            {mockTenants.map((tenant) => (
              <button
                key={tenant.id}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  tenant.active
                    ? 'text-indigo-500 bg-indigo-500/10'
                    : theme === 'dark'
                      ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{tenant.name}</div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    {tenant.domain}
                  </div>
                </div>
                {tenant.active && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
          
          <div className={`border-t px-4 py-3 ${
            theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Multi-tenant support coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantSwitcher;