import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  LayoutDashboard,
  ShieldCheck,
  Cloud,
  Terminal as TerminalIcon,
  ShieldAlert,
  BarChart3,
  Monitor,
  Fingerprint,
  ChevronDown,
  Building2,
  Shield,
  Server,
  Globe,
  KeyRound
} from 'lucide-react';
import { Tab } from '../../types';

interface NavigationItem {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
}

interface NavigationCategory {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  items: NavigationItem[];
}

interface NavigationCategoriesProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  theme: 'light' | 'dark';
}

const navigationCategories: NavigationCategory[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'advanced-analytics', icon: BarChart3, label: 'Advanced Analytics' }
    ]
  },
  {
    id: 'identity-access',
    label: 'Identity & Access',
    icon: Building2,
    items: [
      { id: 'users', icon: Users, label: 'User Intelligence' },
      { id: 'access-intelligence', icon: Fingerprint, label: 'Access Intelligence' },
      { id: 'exchange-onprem', icon: Server, label: 'Exchange On-Prem' }
    ]
  },
  {
    id: 'cloud-governance',
    label: 'Cloud Governance',
    icon: Cloud,
    items: [
      { id: 'cloud-reporting', icon: BarChart3, label: 'Cloud Reporting' },
      { id: 'powerbi-usage', icon: BarChart3, label: 'PowerBI Usage' },
      { id: 'ca-exclusions', icon: ShieldCheck, label: 'CA Policies' },
      { id: 'azure', icon: Globe, label: 'Azure Sync' }
    ]
  },
  {
    id: 'security-compliance',
    label: 'Security & Compliance',
    icon: Shield,
    items: [
      { id: 'security', icon: ShieldAlert, label: 'Security VAPT' },
      { id: 'device-inventory', icon: Monitor, label: 'Device Intelligence' },
      { id: 'password-tools', icon: KeyRound, label: 'Password Tools' }
    ]
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: Server,
    items: [
      { id: 'terminal', icon: TerminalIcon, label: 'Terminal' }
    ]
  }
];

const NavigationCategories: React.FC<NavigationCategoriesProps> = ({
  activeTab,
  onTabChange,
  theme
}) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  const handleCategoryHover = (categoryId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left
    });
    setOpenCategory(categoryId);
  };

  const handleCategoryLeave = () => {
    setOpenCategory(null);
    setDropdownPosition(null);
  };

  const isActiveCategory = (category: NavigationCategory) => {
    return category.items.some(item => item.id === activeTab);
  };

  const getActiveItem = (category: NavigationCategory) => {
    return category.items.find(item => item.id === activeTab);
  };

  return (
    <div className="flex items-center space-x-1">
      {navigationCategories.map((category) => {
        const isActive = isActiveCategory(category);
        const activeItem = getActiveItem(category);

        return (
          <div
            key={category.id}
            className="relative"
            onMouseEnter={(e) => handleCategoryHover(category.id, e)}
            onMouseLeave={handleCategoryLeave}
          >
            {/* Category Button */}
            <button
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 group ${isActive
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5'
                : theme === 'dark'
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
            >
              <category.icon className="w-4 h-4" />
              <span>{isActive && activeItem ? activeItem.label : category.label}</span>
              {category.items.length > 1 && (
                <ChevronDown className={`w-3 h-3 transition-transform ${openCategory === category.id ? 'rotate-180' : ''
                  }`} />
              )}
            </button>

            {/* Dropdown Menu - Rendered as Portal */}
            {category.items.length > 1 && openCategory === category.id && dropdownPosition && createPortal(
              <div
                className={`dropdown-force-top w-56 rounded-lg shadow-2xl border glass ${theme === 'dark'
                  ? 'border-slate-700 bg-slate-800/95'
                  : 'border-slate-200 bg-white/95'
                  }`}
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  zIndex: 99999
                }}
                onMouseEnter={() => setOpenCategory(category.id)}
                onMouseLeave={handleCategoryLeave}
              >
                <div className="py-2">
                  {category.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id as Tab);
                        setOpenCategory(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${activeTab === item.id
                        ? 'text-indigo-500 bg-indigo-500/10'
                        : theme === 'dark'
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      {activeTab === item.id && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>,
              document.body
            )}

            {/* Single Item Category - Direct Click */}
            {category.items.length === 1 && (
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={() => onTabChange(category.items[0].id as Tab)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NavigationCategories;