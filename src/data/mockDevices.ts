/**
 * Mock Device Data for Demo
 */

export interface MockDevice {
  displayName: string;
  deviceId: string;
  entra: boolean;
  intune: boolean;
  ad: boolean;
  entraId?: string;
  intuneId?: string;
  adDistinguishedName?: string;
  os: string;
  osVersion: string;
  osCategory: 'Windows 10' | 'Windows 11' | 'Windows Server' | 'Other Windows';
  systemPresence: 'Entra Only' | 'Intune Only' | 'AD Only' | 'Entra + AD' | 'Entra + Intune' | 'Intune + AD' | 'All Systems';
  healthStatus: 'Active' | 'Warning' | 'Stale' | 'Disabled';
  defenderStatus: 'Onboarded' | 'Not Onboarded' | 'Unsupported';
  lastSeen: string;
  lastUser: string;
  recommendation: string;
}

const generateMockDevices = (): MockDevice[] => {
  const devices: MockDevice[] = [];
  const osVersions = {
    'Windows 10': ['10.0.19044', '10.0.19043', '10.0.19042'],
    'Windows 11': ['10.0.22621', '10.0.22000', '10.0.22631'],
    'Windows Server': ['10.0.20348', '10.0.17763', '10.0.14393'],
    'Other Windows': ['10.0.18362', '10.0.17134']
  };

  const users = [
    'john.doe', 'jane.smith', 'mike.johnson', 'sarah.wilson', 'david.brown',
    'lisa.davis', 'robert.miller', 'emily.garcia', 'james.martinez', 'maria.lopez',
    'william.anderson', 'jennifer.taylor', 'michael.thomas', 'elizabeth.jackson',
    'christopher.white', 'amanda.harris', 'matthew.martin', 'stephanie.thompson'
  ];

  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Legal', 'R&D'];
  
  // Generate 1000+ devices
  for (let i = 1; i <= 1200; i++) {
    const deviceNum = i.toString().padStart(4, '0');
    const baseName = `WS${deviceNum}`;
    
    // Create some duplicates (with A, $, etc.)
    const isDuplicate = Math.random() < 0.15;
    const displayName = isDuplicate ? 
      `${baseName}${Math.random() < 0.5 ? 'A' : '$'}` : 
      baseName;

    const osCategory = Math.random() < 0.6 ? 'Windows 11' : 
                     Math.random() < 0.8 ? 'Windows 10' : 
                     Math.random() < 0.95 ? 'Windows Server' : 'Other Windows';

    const osVersion = osVersions[osCategory][Math.floor(Math.random() * osVersions[osCategory].length)];

    // System presence logic
    const entra = Math.random() < 0.85;
    const intune = Math.random() < 0.75;
    const ad = Math.random() < 0.90;

    let systemPresence: MockDevice['systemPresence'];
    if (entra && intune && ad) systemPresence = 'All Systems';
    else if (entra && intune) systemPresence = 'Entra + Intune';
    else if (entra && ad) systemPresence = 'Entra + AD';
    else if (intune && ad) systemPresence = 'Intune + AD';
    else if (entra) systemPresence = 'Entra Only';
    else if (intune) systemPresence = 'Intune Only';
    else systemPresence = 'AD Only';

    // Health status based on system presence and age
    let healthStatus: MockDevice['healthStatus'];
    const daysSinceLastSeen = Math.floor(Math.random() * 180);
    
    if (daysSinceLastSeen < 7) healthStatus = 'Active';
    else if (daysSinceLastSeen < 30) healthStatus = 'Warning';
    else if (daysSinceLastSeen < 90) healthStatus = 'Stale';
    else healthStatus = 'Disabled';

    // Defender status
    const defenderStatus: MockDevice['defenderStatus'] = 
      osCategory === 'Windows Server' ? 'Unsupported' :
      Math.random() < 0.7 ? 'Onboarded' : 'Not Onboarded';

    const lastSeen = new Date(Date.now() - daysSinceLastSeen * 24 * 60 * 60 * 1000).toISOString();
    const lastUser = users[Math.floor(Math.random() * users.length)];

    // Generate recommendation
    let recommendation = '';
    if (healthStatus === 'Stale') recommendation = 'Consider disabling or removing';
    else if (systemPresence !== 'All Systems') recommendation = 'Sync across all systems';
    else if (defenderStatus === 'Not Onboarded') recommendation = 'Enable Defender ATP';
    else recommendation = 'No action required';

    devices.push({
      displayName,
      deviceId: `device-${i}`,
      entra,
      intune,
      ad,
      entraId: entra ? `entra-${i}` : undefined,
      intuneId: intune ? `intune-${i}` : undefined,
      adDistinguishedName: ad ? `CN=${displayName},OU=Computers,DC=demo,DC=contoso,DC=com` : undefined,
      os: `${osCategory} Pro`,
      osVersion,
      osCategory,
      systemPresence,
      healthStatus,
      defenderStatus,
      lastSeen,
      lastUser,
      recommendation
    });
  }

  return devices;
};

export const mockDevices = generateMockDevices();

export const mockDeviceSummary = {
  total: mockDevices.length,
  entra: mockDevices.filter(d => d.entra).length,
  intune: mockDevices.filter(d => d.intune).length,
  ad: mockDevices.filter(d => d.ad).length,
  active: mockDevices.filter(d => d.healthStatus === 'Active').length,
  warning: mockDevices.filter(d => d.healthStatus === 'Warning').length,
  stale: mockDevices.filter(d => d.healthStatus === 'Stale').length,
  disabled: mockDevices.filter(d => d.healthStatus === 'Disabled').length,
  unknown: 0,
  windows10: mockDevices.filter(d => d.osCategory === 'Windows 10').length,
  windows11: mockDevices.filter(d => d.osCategory === 'Windows 11').length,
  windowsServer: mockDevices.filter(d => d.osCategory === 'Windows Server').length,
  otherOs: mockDevices.filter(d => d.osCategory === 'Other Windows').length,
  compliance: Math.floor(mockDevices.length * 0.85),
  allSystems: mockDevices.filter(d => d.systemPresence === 'All Systems').length,
  defenderOnboarded: mockDevices.filter(d => d.defenderStatus === 'Onboarded').length,
  defenderNotOnboarded: mockDevices.filter(d => d.defenderStatus === 'Not Onboarded').length
};

export const mockDeletedDevices = [
  {
    id: 'del-1',
    deviceId: 'device-del-1',
    displayName: 'WS9999',
    os: 'Windows 11 Pro',
    osVersion: '10.0.22621',
    deletedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastSignIn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    deletedBy: 'admin@demo.contoso.com',
    correlationId: 'corr-1',
    source: 'entra-deleted' as const,
    daysAgo: 2
  },
  {
    id: 'del-2',
    deviceId: 'device-del-2',
    displayName: 'WS9998',
    os: 'Windows 10 Pro',
    osVersion: '10.0.19044',
    deletedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastSignIn: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    deletedBy: 'system',
    correlationId: 'corr-2',
    source: 'entra-deleted' as const,
    daysAgo: 5
  }
];