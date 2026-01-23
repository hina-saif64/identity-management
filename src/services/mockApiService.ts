/**
 * Mock API Service - Simulates real API calls with demo data
 */

import { mockDevices, mockDeletedDevices } from '../data/mockDevices';
import { mockUsers } from '../data/mockUsers';
import { mockCAPolicies } from '../data/mockCAPolicies';
import { mockPowerBIUsers, mockPowerBIWorkspaces, mockPowerBIReports } from '../data/mockPowerBI';

// Simulate API delay
const delay = (ms: number = 500 + Math.random() * 1000) => 
  new Promise(resolve => setTimeout(resolve, ms));

export class MockApiService {
  // Device API methods
  static async getDevices(filters?: any) {
    await delay();
    return {
      success: true,
      data: mockDevices,
      total: mockDevices.length
    };
  }

  static async getDeletedDevices(days: number = 30) {
    await delay();
    return {
      success: true,
      data: mockDeletedDevices,
      total: mockDeletedDevices.length
    };
  }

  static async bulkDeviceAction(deviceIds: string[], action: string, options?: any) {
    await delay(2000); // Longer delay for bulk operations
    
    console.log(`Mock API: Executing ${action} on ${deviceIds.length} devices`, { deviceIds, options });
    
    return {
      success: true,
      message: `${action} completed successfully`,
      results: deviceIds.map(id => ({
        deviceId: id,
        success: Math.random() > 0.1, // 90% success rate
        message: Math.random() > 0.1 ? 'Success' : 'Failed - Device not found'
      }))
    };
  }

  // User API methods
  static async getUsers(filters?: any) {
    await delay();
    return {
      success: true,
      data: mockUsers,
      total: mockUsers.length
    };
  }

  static async bulkUserAction(userIds: string[], action: string, options?: any) {
    await delay(2000);
    
    console.log(`Mock API: Executing ${action} on ${userIds.length} users`, { userIds, options });
    
    return {
      success: true,
      message: `${action} completed successfully`,
      results: userIds.map(id => ({
        userId: id,
        success: Math.random() > 0.05, // 95% success rate
        message: Math.random() > 0.05 ? 'Success' : 'Failed - User not found'
      }))
    };
  }

  // CA Policy API methods
  static async getCAPolicies() {
    await delay();
    return {
      success: true,
      data: mockCAPolicies,
      total: mockCAPolicies.length
    };
  }

  static async removeCAExclusion(policyId: string, userIds: string[]) {
    await delay(1500);
    
    console.log(`Mock API: Removing CA exclusions`, { policyId, userIds });
    
    return {
      success: true,
      message: `Removed ${userIds.length} exclusions from policy`,
      results: userIds.map(id => ({
        userId: id,
        success: true,
        message: 'Exclusion removed successfully'
      }))
    };
  }

  // PowerBI API methods
  static async getPowerBIUsers() {
    await delay();
    return {
      success: true,
      data: mockPowerBIUsers,
      total: mockPowerBIUsers.length
    };
  }

  static async getPowerBIWorkspaces() {
    await delay();
    return {
      success: true,
      data: mockPowerBIWorkspaces,
      total: mockPowerBIWorkspaces.length
    };
  }

  static async getPowerBIReports() {
    await delay();
    return {
      success: true,
      data: mockPowerBIReports,
      total: mockPowerBIReports.length
    };
  }

  static async bulkPowerBIAction(itemIds: string[], action: string, itemType: 'users' | 'workspaces' | 'reports') {
    await delay(2000);
    
    console.log(`Mock API: Executing ${action} on ${itemIds.length} ${itemType}`, { itemIds });
    
    return {
      success: true,
      message: `${action} completed successfully`,
      results: itemIds.map(id => ({
        itemId: id,
        success: Math.random() > 0.08, // 92% success rate
        message: Math.random() > 0.08 ? 'Success' : `Failed - ${itemType.slice(0, -1)} not found`
      }))
    };
  }

  // Authentication simulation
  static async authenticateCloud() {
    await delay(1500);
    return {
      success: true,
      connection: {
        isConnected: true,
        tenantId: '12345678-1234-1234-1234-123456789abc',
        appId: '87654321-4321-4321-4321-abcdef123456',
        vaultName: 'hyperion-demo-vault',
        secretName: 'demo-ad-password'
      }
    };
  }

  static async authenticateAD() {
    await delay(1200);
    return {
      success: true,
      connection: {
        isConnected: true,
        server: 'demo.contoso.com',
        sessionId: 'demo-session-12345'
      }
    };
  }

  // System health checks
  static async getSystemHealth() {
    await delay(800);
    return {
      success: true,
      health: {
        entraId: { status: 'healthy', responseTime: 45 },
        intune: { status: 'healthy', responseTime: 52 },
        activeDirectory: { status: 'healthy', responseTime: 38 },
        powerBI: { status: 'healthy', responseTime: 67 },
        keyVault: { status: 'healthy', responseTime: 29 }
      }
    };
  }

  // Export functionality
  static async exportData(dataType: string, format: 'csv' | 'xlsx' | 'json' = 'csv') {
    await delay(1000);
    
    console.log(`Mock API: Exporting ${dataType} as ${format}`);
    
    // Simulate file download
    const filename = `hyperion-demo-${dataType}-${new Date().toISOString().split('T')[0]}.${format}`;
    
    return {
      success: true,
      message: `Export completed: ${filename}`,
      downloadUrl: `#demo-export-${dataType}-${format}`,
      filename
    };
  }
}