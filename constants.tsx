
import { ADUser, Metric, OU } from './types';

export const MOCK_USERS: ADUser[] = [
  { 
    id: '1', 
    name: 'Alex Johnson', 
    email: 'a.johnson@hyperion.com', 
    samAccountName: 'ajohnson',
    status: 'Active', 
    department: 'Engineering', 
    lastLogin: '2024-05-20 09:15',
    createdDate: '2022-01-12',
    lastPasswordSet: '2024-02-10',
    description: 'Lead Developer - Core Systems',
    extAttribute7: 'E-001',
    extAttribute10: 'Hybrid-Remote',
    extAttribute14: 'Tier-3',
    distinguishedName: 'CN=Alex Johnson,OU=Engineering,DC=hyperion,DC=com'
  },
  { 
    id: '2', 
    name: 'Sarah Miller', 
    email: 's.miller@hyperion.com', 
    samAccountName: 'smiller',
    status: 'Locked', 
    department: 'Sales', 
    lastLogin: '2024-05-18 14:22',
    createdDate: '2023-06-05',
    lastPasswordSet: '2024-05-18',
    description: 'Regional Sales Mgr',
    extAttribute7: 'S-442',
    extAttribute10: 'On-Site',
    extAttribute14: 'Tier-1',
    distinguishedName: 'CN=Sarah Miller,OU=Sales,DC=hyperion,DC=com'
  }
];

export const MOCK_OUS: OU[] = [
  { name: 'Engineering', dn: 'OU=Engineering,DC=hyperion,DC=com' },
  { name: 'Sales', dn: 'OU=Sales,DC=hyperion,DC=com' },
  { name: 'Human Resources', dn: 'OU=HR,DC=hyperion,DC=com' },
  { name: 'Finance', dn: 'OU=Finance,DC=hyperion,DC=com' },
  { name: 'IT Admins', dn: 'OU=Admins,DC=hyperion,DC=com' },
  { name: 'Executive', dn: 'OU=Exec,DC=hyperion,DC=com' },
];

export const MOCK_UPN_SUFFIXES = [
  'hyperion.com',
  'hyperion.local',
  'external.hyperion.com',
  'dev.hyperion.io'
];

export const MOCK_METRICS: Metric[] = [
  { name: 'Total Users', value: 2451, change: 12 },
  { name: 'Locked Accounts', value: 14, change: -5 },
  { name: 'Active Sessions', value: 182, change: 8 },
  { name: 'Azure Sync Errors', value: 0, change: 0 },
];

export const CHART_DATA = [
  { time: '00:00', logons: 120, syncs: 45 },
  { time: '04:00', logons: 80, syncs: 40 },
  { time: '08:00', logons: 450, syncs: 55 },
  { time: '12:00', logons: 850, syncs: 70 },
  { time: '16:00', logons: 720, syncs: 65 },
  { time: '20:00', logons: 300, syncs: 50 },
  { time: '23:59', logons: 150, syncs: 45 },
];