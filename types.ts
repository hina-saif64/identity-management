
export interface ADUser {
  id: string;
  name: string;
  email: string;
  samAccountName: string;
  status: 'Active' | 'Disabled' | 'Locked';
  department: string;
  lastLogin: string;
  createdDate: string;
  lastPasswordSet: string;
  description: string;
  extAttribute7: string;
  extAttribute10: string;
  extAttribute14: string;
  distinguishedName: string;
}

export interface CloudUsageEntry {
  userPrincipalName: string;
  displayName: string;
  licenseType: string;
  hasPowerBILicense: boolean; // Add this field
  exchangeLastActivityDate: string | null;
  teamsLastActivityDate: string | null;
  sharePointLastActivityDate: string | null;
  oneDriveLastActivityDate: string | null;
  powerBILastActivityDate: string | null;
  lastInteractiveSignIn: string | null;
  lastNonInteractiveSignIn: string | null;
  isStale: boolean; // 90+ days inactive on all apps
}

export interface LogEntry {
  id: string;
  timestamp: string;
  module: 'AUTH' | 'AD-USERS' | 'TERMINAL' | 'SYSTEM' | 'AI' | 'GATEWAY' | 'CLOUD' | 'ACCESS' | 'DEVICES' | 'CA-EXCLUSIONS';
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

export interface ConnectionState {
  isConnected: boolean;
  isBackendVerified: boolean;
  backendUrl: string;
  method: AuthMethod | null;
  domain: string;
  server: string;
  sessionId?: string;
  psVersion: '5.1' | '7.4';
}

export interface CloudConnectionState {
  isConnected: boolean;
  tenantId: string;
  appId: string;
  vaultName: string;
  secretName: string;
  organization: string;
  verifiedDomains: string[];
  tokenExpiry?: number;
  accessToken?: string;
  certificateThumbprint?: string;
}

export interface ExchangeConnectionState {
  isConnected: boolean;
  tenantId?: string;
  appId?: string;
  organization?: string;
  connectedAt?: Date;
  sessionId?: string;
}

export interface TerminalLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'success';
}

export interface OU {
  name: string;
  dn: string;
}

export type AuthMethod = 'AzureKeyVault' | 'Credentials';

export interface Metric {
  name: string;
  value: number;
  change: number;
}

export type Tab = 'dashboard' | 'advanced-analytics' | 'users' | 'azure' | 'security' | 'terminal' | 'cloud-reporting' | 'powerbi-usage' | 'ca-exclusions' | 'device-inventory' | 'access-intelligence' | 'password-tools' | 'exchange-onprem';

export interface AdFetchFilters {
  status: string;
  department: string;
  searchBase: string;
  upnSuffix: string;
  stalledDays: number;
  passwordAge: number;
  searchString: string;
}

export interface ApiResponse {
  status: string;
  error?: string;
  detail?: string;
  code?: string;
  [key: string]: any;
}
