/**
 * Mock Conditional Access Policies Data for Demo
 */

export interface MockCAPolicy {
  id: string;
  displayName: string;
  state: 'enabled' | 'disabled' | 'enabledForReportingButNotEnforced';
  createdDateTime: string;
  modifiedDateTime: string;
  conditions: {
    users: {
      includeUsers: string[];
      excludeUsers: string[];
      includeGroups: string[];
      excludeGroups: string[];
    };
    applications: {
      includeApplications: string[];
      excludeApplications: string[];
    };
    locations: {
      includeLocations: string[];
      excludeLocations: string[];
    };
  };
  grantControls: {
    operator: 'AND' | 'OR';
    builtInControls: string[];
  };
  sessionControls: any;
  excludedUsers: MockExcludedUser[];
  riskScore: number;
  complianceScore: number;
}

export interface MockExcludedUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  department: string;
  excludedDate: string;
  excludedBy: string;
  reason: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  lastSignIn: string;
  location: string;
  deviceCount: number;
}

const generateMockExcludedUsers = (count: number): MockExcludedUser[] => {
  const users: MockExcludedUser[] = [];
  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Legal', 'R&D'];
  const locations = ['New York', 'London', 'Tokyo', 'Sydney', 'Toronto', 'Berlin', 'Paris', 'Singapore'];
  const reasons = [
    'Legacy application access required',
    'VIP user - business critical',
    'Temporary exclusion for testing',
    'Third-party integration needs',
    'Emergency access requirement',
    'Compliance exception approved',
    'Service account exclusion',
    'Pilot program participant'
  ];

  for (let i = 1; i <= count; i++) {
    const firstName = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily'][Math.floor(Math.random() * 8)];
    const lastName = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'][Math.floor(Math.random() * 8)];
    const displayName = `${firstName} ${lastName}`;
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    
    const excludedDaysAgo = Math.floor(Math.random() * 180);
    const lastSignInDaysAgo = Math.floor(Math.random() * 30);
    
    users.push({
      id: `excluded-user-${i}`,
      displayName,
      userPrincipalName: `${username}@demo.contoso.com`,
      department: departments[Math.floor(Math.random() * departments.length)],
      excludedDate: new Date(Date.now() - excludedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      excludedBy: 'admin@demo.contoso.com',
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      riskLevel: Math.random() < 0.7 ? 'Low' : Math.random() < 0.9 ? 'Medium' : 'High',
      lastSignIn: new Date(Date.now() - lastSignInDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      location: locations[Math.floor(Math.random() * locations.length)],
      deviceCount: Math.floor(Math.random() * 5) + 1
    });
  }

  return users;
};

const generateMockCAPolicies = (): MockCAPolicy[] => {
  const policies: MockCAPolicy[] = [];
  
  const policyTemplates = [
    {
      name: 'Block Legacy Authentication',
      state: 'enabled' as const,
      riskScore: 95,
      complianceScore: 98,
      excludedCount: 12
    },
    {
      name: 'Require MFA for All Users',
      state: 'enabled' as const,
      riskScore: 88,
      complianceScore: 92,
      excludedCount: 8
    },
    {
      name: 'Block High Risk Sign-ins',
      state: 'enabled' as const,
      riskScore: 92,
      complianceScore: 89,
      excludedCount: 5
    },
    {
      name: 'Require Compliant Device for Office 365',
      state: 'enabled' as const,
      riskScore: 85,
      complianceScore: 87,
      excludedCount: 15
    },
    {
      name: 'Block Access from Unknown Locations',
      state: 'enabledForReportingButNotEnforced' as const,
      riskScore: 78,
      complianceScore: 82,
      excludedCount: 22
    },
    {
      name: 'Require MFA for Admin Roles',
      state: 'enabled' as const,
      riskScore: 96,
      complianceScore: 99,
      excludedCount: 3
    },
    {
      name: 'Block Risky Users',
      state: 'enabled' as const,
      riskScore: 90,
      complianceScore: 94,
      excludedCount: 7
    },
    {
      name: 'Require Approved Client Apps',
      state: 'disabled' as const,
      riskScore: 65,
      complianceScore: 70,
      excludedCount: 0
    },
    {
      name: 'Session Control for Sensitive Apps',
      state: 'enabled' as const,
      riskScore: 82,
      complianceScore: 85,
      excludedCount: 18
    },
    {
      name: 'Block Downloads on Unmanaged Devices',
      state: 'enabledForReportingButNotEnforced' as const,
      riskScore: 75,
      complianceScore: 78,
      excludedCount: 25
    }
  ];

  policyTemplates.forEach((template, index) => {
    const createdDaysAgo = Math.floor(Math.random() * 365) + 30;
    const modifiedDaysAgo = Math.floor(Math.random() * 30);
    
    policies.push({
      id: `policy-${index + 1}`,
      displayName: template.name,
      state: template.state,
      createdDateTime: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      modifiedDateTime: new Date(Date.now() - modifiedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      conditions: {
        users: {
          includeUsers: ['All'],
          excludeUsers: [],
          includeGroups: [],
          excludeGroups: []
        },
        applications: {
          includeApplications: ['All'],
          excludeApplications: []
        },
        locations: {
          includeLocations: ['All'],
          excludeLocations: ['Trusted Locations']
        }
      },
      grantControls: {
        operator: 'OR',
        builtInControls: ['mfa', 'compliantDevice']
      },
      sessionControls: {},
      excludedUsers: generateMockExcludedUsers(template.excludedCount),
      riskScore: template.riskScore,
      complianceScore: template.complianceScore
    });
  });

  return policies;
};

export const mockCAPolicies = generateMockCAPolicies();

export const mockCASummary = {
  totalPolicies: mockCAPolicies.length,
  enabledPolicies: mockCAPolicies.filter(p => p.state === 'enabled').length,
  disabledPolicies: mockCAPolicies.filter(p => p.state === 'disabled').length,
  reportOnlyPolicies: mockCAPolicies.filter(p => p.state === 'enabledForReportingButNotEnforced').length,
  totalExcludedUsers: mockCAPolicies.reduce((sum, policy) => sum + policy.excludedUsers.length, 0),
  highRiskExclusions: mockCAPolicies.reduce((sum, policy) => 
    sum + policy.excludedUsers.filter(user => user.riskLevel === 'High').length, 0
  ),
  averageRiskScore: Math.round(mockCAPolicies.reduce((sum, policy) => sum + policy.riskScore, 0) / mockCAPolicies.length),
  averageComplianceScore: Math.round(mockCAPolicies.reduce((sum, policy) => sum + policy.complianceScore, 0) / mockCAPolicies.length)
};