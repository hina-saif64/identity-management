/**
 * Mock User Data for Demo
 */

export interface MockUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string;
  department: string;
  jobTitle: string;
  officeLocation: string;
  manager: string;
  accountEnabled: boolean;
  lastSignInDateTime: string;
  createdDateTime: string;
  licenses: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  mfaStatus: 'Enabled' | 'Disabled' | 'Enforced';
  deviceCount: number;
  lastActivity: string;
  userType: 'Member' | 'Guest';
  onPremisesSyncEnabled: boolean;
}

const generateMockUsers = (): MockUser[] => {
  const users: MockUser[] = [];
  
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily',
    'James', 'Maria', 'William', 'Jennifer', 'Christopher', 'Amanda', 'Matthew',
    'Stephanie', 'Daniel', 'Jessica', 'Anthony', 'Ashley', 'Mark', 'Melissa',
    'Steven', 'Michelle', 'Paul', 'Kimberly', 'Andrew', 'Amy', 'Joshua', 'Angela'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
  ];

  const departments = [
    'Information Technology', 'Human Resources', 'Finance', 'Marketing', 
    'Sales', 'Operations', 'Legal', 'Research & Development', 'Customer Service',
    'Quality Assurance', 'Business Development', 'Administration'
  ];

  const jobTitles = {
    'Information Technology': ['Software Engineer', 'System Administrator', 'IT Manager', 'DevOps Engineer', 'Security Analyst'],
    'Human Resources': ['HR Manager', 'Recruiter', 'HR Business Partner', 'Compensation Analyst', 'Training Coordinator'],
    'Finance': ['Financial Analyst', 'Accountant', 'Finance Manager', 'Controller', 'Budget Analyst'],
    'Marketing': ['Marketing Manager', 'Content Creator', 'Digital Marketing Specialist', 'Brand Manager', 'Marketing Coordinator'],
    'Sales': ['Sales Representative', 'Account Manager', 'Sales Director', 'Business Development Manager', 'Sales Coordinator'],
    'Operations': ['Operations Manager', 'Process Analyst', 'Operations Coordinator', 'Supply Chain Manager', 'Logistics Coordinator'],
    'Legal': ['Legal Counsel', 'Paralegal', 'Compliance Officer', 'Contract Manager', 'Legal Assistant'],
    'Research & Development': ['Research Scientist', 'Product Manager', 'R&D Engineer', 'Innovation Manager', 'Technical Writer'],
    'Customer Service': ['Customer Service Representative', 'Support Manager', 'Customer Success Manager', 'Help Desk Technician'],
    'Quality Assurance': ['QA Engineer', 'Test Analyst', 'QA Manager', 'Quality Control Specialist'],
    'Business Development': ['Business Analyst', 'Strategy Manager', 'Partnership Manager', 'Market Research Analyst'],
    'Administration': ['Executive Assistant', 'Office Manager', 'Administrative Coordinator', 'Facilities Manager']
  };

  const offices = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
  
  const licenses = ['Microsoft 365 E3', 'Microsoft 365 E5', 'Office 365 E1', 'Office 365 E3', 'Enterprise Mobility + Security E3', 'Enterprise Mobility + Security E5'];

  // Generate 500+ users
  for (let i = 1; i <= 650; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const displayName = `${firstName} ${lastName}`;
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const department = departments[Math.floor(Math.random() * departments.length)];
    const jobTitle = jobTitles[department][Math.floor(Math.random() * jobTitles[department].length)];
    const office = offices[Math.floor(Math.random() * offices.length)];
    
    // Generate manager (some users don't have managers)
    const hasManager = Math.random() < 0.85;
    const managerFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const managerLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const manager = hasManager ? `${managerFirstName} ${managerLastName}` : '';

    // Account status
    const accountEnabled = Math.random() < 0.95; // 95% enabled

    // Dates
    const createdDaysAgo = Math.floor(Math.random() * 1000) + 30;
    const lastSignInDaysAgo = accountEnabled ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 180) + 30;
    const lastActivityDaysAgo = Math.floor(Math.random() * 7);

    const createdDateTime = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString();
    const lastSignInDateTime = new Date(Date.now() - lastSignInDaysAgo * 24 * 60 * 60 * 1000).toISOString();
    const lastActivity = new Date(Date.now() - lastActivityDaysAgo * 24 * 60 * 60 * 1000).toISOString();

    // Risk level based on activity
    let riskLevel: MockUser['riskLevel'];
    if (lastSignInDaysAgo > 90) riskLevel = 'High';
    else if (lastSignInDaysAgo > 30) riskLevel = 'Medium';
    else riskLevel = 'Low';

    // MFA status
    const mfaStatus: MockUser['mfaStatus'] = Math.random() < 0.8 ? 'Enabled' : Math.random() < 0.9 ? 'Enforced' : 'Disabled';

    // Licenses
    const userLicenses = [];
    const licenseCount = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < licenseCount; j++) {
      const license = licenses[Math.floor(Math.random() * licenses.length)];
      if (!userLicenses.includes(license)) {
        userLicenses.push(license);
      }
    }

    // Device count
    const deviceCount = Math.floor(Math.random() * 5) + 1;

    // User type
    const userType: MockUser['userType'] = Math.random() < 0.95 ? 'Member' : 'Guest';

    // On-premises sync
    const onPremisesSyncEnabled = Math.random() < 0.8;

    users.push({
      id: `user-${i}`,
      displayName,
      userPrincipalName: `${username}@demo.contoso.com`,
      mail: `${username}@demo.contoso.com`,
      department,
      jobTitle,
      officeLocation: office,
      manager,
      accountEnabled,
      lastSignInDateTime,
      createdDateTime,
      licenses: userLicenses,
      riskLevel,
      mfaStatus,
      deviceCount,
      lastActivity,
      userType,
      onPremisesSyncEnabled
    });
  }

  return users;
};

export const mockUsers = generateMockUsers();

export const mockUserSummary = {
  total: mockUsers.length,
  enabled: mockUsers.filter(u => u.accountEnabled).length,
  disabled: mockUsers.filter(u => !u.accountEnabled).length,
  guests: mockUsers.filter(u => u.userType === 'Guest').length,
  members: mockUsers.filter(u => u.userType === 'Member').length,
  mfaEnabled: mockUsers.filter(u => u.mfaStatus === 'Enabled' || u.mfaStatus === 'Enforced').length,
  mfaDisabled: mockUsers.filter(u => u.mfaStatus === 'Disabled').length,
  highRisk: mockUsers.filter(u => u.riskLevel === 'High').length,
  mediumRisk: mockUsers.filter(u => u.riskLevel === 'Medium').length,
  lowRisk: mockUsers.filter(u => u.riskLevel === 'Low').length,
  staleUsers: mockUsers.filter(u => {
    const daysSinceLastSignIn = Math.floor((Date.now() - new Date(u.lastSignInDateTime).getTime()) / (24 * 60 * 60 * 1000));
    return daysSinceLastSignIn > 90;
  }).length,
  syncEnabled: mockUsers.filter(u => u.onPremisesSyncEnabled).length
};