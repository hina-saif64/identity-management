/**
 * Mock PowerBI Usage Data for Demo
 */

export interface MockPowerBIUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  department: string;
  lastActivityDate: string;
  reportViewCount: number;
  dashboardViewCount: number;
  datasetRefreshCount: number;
  licenseType: 'Pro' | 'Premium' | 'Free';
  isActive: boolean;
  creationDate: string;
  lastSignIn: string;
}

export interface MockPowerBIWorkspace {
  id: string;
  name: string;
  type: 'Personal' | 'Group' | 'Premium';
  isOnDedicatedCapacity: boolean;
  capacityId?: string;
  state: 'Active' | 'Orphaned' | 'Deleted';
  users: number;
  reports: number;
  datasets: number;
  dashboards: number;
  dataflows: number;
  lastActivity: string;
  storageUsage: number; // in MB
}

export interface MockPowerBIReport {
  id: string;
  name: string;
  workspaceName: string;
  createdBy: string;
  createdDate: string;
  modifiedDate: string;
  viewCount: number;
  uniqueViewers: number;
  datasetId: string;
  isPublished: boolean;
  size: number; // in MB
}

const generateMockPowerBIUsers = (): MockPowerBIUser[] => {
  const users: MockPowerBIUser[] = [];
  
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Maria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const departments = ['Finance', 'Sales', 'Marketing', 'Operations', 'IT', 'HR', 'Legal', 'R&D'];
  const licenseTypes: MockPowerBIUser['licenseType'][] = ['Pro', 'Premium', 'Free'];

  for (let i = 1; i <= 150; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const displayName = `${firstName} ${lastName}`;
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    
    const createdDaysAgo = Math.floor(Math.random() * 365) + 30;
    const lastActivityDaysAgo = Math.floor(Math.random() * 30);
    const lastSignInDaysAgo = Math.floor(Math.random() * 7);
    
    const licenseType = licenseTypes[Math.floor(Math.random() * licenseTypes.length)];
    const isActive = Math.random() < 0.85; // 85% active users
    
    users.push({
      id: `pbi-user-${i}`,
      displayName,
      userPrincipalName: `${username}@demo.contoso.com`,
      department: departments[Math.floor(Math.random() * departments.length)],
      lastActivityDate: new Date(Date.now() - lastActivityDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      reportViewCount: Math.floor(Math.random() * 500) + 10,
      dashboardViewCount: Math.floor(Math.random() * 200) + 5,
      datasetRefreshCount: Math.floor(Math.random() * 100) + 1,
      licenseType,
      isActive,
      creationDate: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      lastSignIn: new Date(Date.now() - lastSignInDaysAgo * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  return users;
};

const generateMockPowerBIWorkspaces = (): MockPowerBIWorkspace[] => {
  const workspaces: MockPowerBIWorkspace[] = [];
  
  const workspaceNames = [
    'Finance Analytics', 'Sales Dashboard', 'Marketing Insights', 'Operations KPIs',
    'Executive Reports', 'HR Analytics', 'Customer Analytics', 'Product Performance',
    'Regional Sales', 'Compliance Reports', 'IT Metrics', 'Quality Assurance',
    'Supply Chain', 'Risk Management', 'Business Intelligence', 'Data Science Lab'
  ];
  
  const types: MockPowerBIWorkspace['type'][] = ['Personal', 'Group', 'Premium'];
  const states: MockPowerBIWorkspace['state'][] = ['Active', 'Orphaned', 'Deleted'];

  workspaceNames.forEach((name, index) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const state = Math.random() < 0.9 ? 'Active' : Math.random() < 0.95 ? 'Orphaned' : 'Deleted';
    const isOnDedicatedCapacity = type === 'Premium' && Math.random() < 0.7;
    
    const lastActivityDaysAgo = Math.floor(Math.random() * 30);
    
    workspaces.push({
      id: `workspace-${index + 1}`,
      name,
      type,
      isOnDedicatedCapacity,
      capacityId: isOnDedicatedCapacity ? `capacity-${Math.floor(Math.random() * 5) + 1}` : undefined,
      state,
      users: Math.floor(Math.random() * 50) + 5,
      reports: Math.floor(Math.random() * 25) + 2,
      datasets: Math.floor(Math.random() * 15) + 1,
      dashboards: Math.floor(Math.random() * 10) + 1,
      dataflows: Math.floor(Math.random() * 5),
      lastActivity: new Date(Date.now() - lastActivityDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      storageUsage: Math.floor(Math.random() * 5000) + 100 // MB
    });
  });

  return workspaces;
};

const generateMockPowerBIReports = (workspaces: MockPowerBIWorkspace[]): MockPowerBIReport[] => {
  const reports: MockPowerBIReport[] = [];
  
  const reportNames = [
    'Monthly Sales Report', 'Financial Dashboard', 'Customer Segmentation', 'Product Analysis',
    'Regional Performance', 'Quarterly Review', 'Budget vs Actual', 'Market Trends',
    'Operational Metrics', 'Employee Analytics', 'Compliance Overview', 'Risk Assessment',
    'Inventory Report', 'Campaign Performance', 'Service Quality', 'Cost Analysis'
  ];

  const creators = [
    'john.smith@demo.contoso.com', 'jane.doe@demo.contoso.com', 'mike.johnson@demo.contoso.com',
    'sarah.wilson@demo.contoso.com', 'david.brown@demo.contoso.com'
  ];

  let reportId = 1;
  workspaces.forEach(workspace => {
    const numReports = workspace.reports;
    for (let i = 0; i < numReports; i++) {
      const name = reportNames[Math.floor(Math.random() * reportNames.length)];
      const createdDaysAgo = Math.floor(Math.random() * 180) + 10;
      const modifiedDaysAgo = Math.floor(Math.random() * 30);
      
      reports.push({
        id: `report-${reportId++}`,
        name: `${name} ${i > 0 ? i + 1 : ''}`.trim(),
        workspaceName: workspace.name,
        createdBy: creators[Math.floor(Math.random() * creators.length)],
        createdDate: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
        modifiedDate: new Date(Date.now() - modifiedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: Math.floor(Math.random() * 1000) + 50,
        uniqueViewers: Math.floor(Math.random() * 100) + 10,
        datasetId: `dataset-${Math.floor(Math.random() * 50) + 1}`,
        isPublished: Math.random() < 0.9,
        size: Math.floor(Math.random() * 50) + 5 // MB
      });
    }
  });

  return reports;
};

export const mockPowerBIUsers = generateMockPowerBIUsers();
export const mockPowerBIWorkspaces = generateMockPowerBIWorkspaces();
export const mockPowerBIReports = generateMockPowerBIReports(mockPowerBIWorkspaces);

export const mockPowerBISummary = {
  totalUsers: mockPowerBIUsers.length,
  activeUsers: mockPowerBIUsers.filter(u => u.isActive).length,
  proLicenses: mockPowerBIUsers.filter(u => u.licenseType === 'Pro').length,
  premiumLicenses: mockPowerBIUsers.filter(u => u.licenseType === 'Premium').length,
  freeLicenses: mockPowerBIUsers.filter(u => u.licenseType === 'Free').length,
  totalWorkspaces: mockPowerBIWorkspaces.length,
  activeWorkspaces: mockPowerBIWorkspaces.filter(w => w.state === 'Active').length,
  orphanedWorkspaces: mockPowerBIWorkspaces.filter(w => w.state === 'Orphaned').length,
  totalReports: mockPowerBIReports.length,
  publishedReports: mockPowerBIReports.filter(r => r.isPublished).length,
  totalViews: mockPowerBIReports.reduce((sum, report) => sum + report.viewCount, 0),
  totalStorage: mockPowerBIWorkspaces.reduce((sum, workspace) => sum + workspace.storageUsage, 0),
  averageReportSize: Math.round(mockPowerBIReports.reduce((sum, report) => sum + report.size, 0) / mockPowerBIReports.length)
};