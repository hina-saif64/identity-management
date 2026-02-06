
import { ADUser, AuthMethod, AdFetchFilters, ApiResponse } from '../types';

const GATEWAY_SECRET = import.meta.env.VITE_API_KEY;
console.log('🔍 GATEWAY_SECRET loaded:', GATEWAY_SECRET ? 'PRESENT' : 'MISSING');
if (!GATEWAY_SECRET) {
  console.error("⚠️ VITE_API_KEY missing! API calls will fail.");
}

export interface AdTestParams {
  method: AuthMethod;
  server?: string;
  domain?: string;
  username?: string;
  password?: string;
  // Azure Key Vault fields
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  vaultName?: string;
  secretName?: string;
}

export class ApiService {
  /**
   * Normalizes URLs to ensure they target the backend gateway (port 3002)
   * and not the frontend dev server (port 3001).
   */
  private normalizeUrl(baseUrl: string, endpoint: string): string {
    const base = baseUrl || 'http://localhost:3002'; // Backend on port 3002
    // Ensure the URL is absolute
    const absoluteBase = base.startsWith('http') ? base : `http://${base}`;
    return `${absoluteBase.replace(/\/$/, '')}${endpoint}`;
  }

  async checkHealth(baseUrl: string) {
    try {
      const res = await fetch(this.normalizeUrl(baseUrl, '/api/health'));
      return res.ok ? await res.json() : null;
    } catch { return null; }
  }

  async getDomainInfo(baseUrl: string, sessionId: string) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/ad/domain-info'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ sessionId })
    });
    return res.json();
  }

  async testAdConnection(baseUrl: string, params: AdTestParams) {
    console.log('🔍 Sending AD test request with key:', GATEWAY_SECRET ? 'PRESENT' : 'MISSING');
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/ad/test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify(params)
    });
    console.log('🔍 AD test response status:', res.status);
    const result = await res.json();
    console.log('🔍 AD test response body:', JSON.stringify(result, null, 2));
    return result;
  }

  async fetchUsers(baseUrl: string, sessionId: string, filters?: AdFetchFilters) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/ad/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ sessionId, filters })
    });
    return res.json();
  }

  async fetchUnifiedUsers(baseUrl: string, sessionId: string, cloudCredentials?: any, exchangeCredentials?: any) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/users/unified'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ sessionId, cloudCredentials, exchangeCredentials })
    });
    return res.json();
  }

  async fetchUsersPaginated(
    baseUrl: string,
    sessionId: string,
    filters: AdFetchFilters,
    pageSize: number = 50,
    pageNumber: number = 1,
    signal?: AbortSignal
  ) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/ad/users-paginated'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ sessionId, filters, pageSize, pageNumber }),
      signal
    });
    return res.json();
  }

  async fetchUsersLdap(
    baseUrl: string,
    sessionId: string,
    filters: AdFetchFilters,
    pageSize: number = 50,
    pageNumber: number = 1,
    signal?: AbortSignal
  ) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/ldap/users-paginated'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ sessionId, filters, pageSize, pageNumber }),
      signal
    });
    return res.json();
  }

  async bulkAction(baseUrl: string, sessionId: string, action: string, ids: string[], targetValue?: string) {
    // OPTIMIZATION: Use Batch Endpoint if multiple IDs selected (Single-Session)
    const endpoint = ids.length > 1 ? '/api/ad/bulk-action-batch' : '/api/ad/bulk-action';

    // Log intent for audit
    if (ids.length > 1) {
      console.log(`🚀 TURBO: Routing ${ids.length} users to Batch Endpoint (${endpoint})`);
    }

    const res = await fetch(this.normalizeUrl(baseUrl, endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ sessionId, action, ids, targetValue })
    });
    return res.json();
  }

  async executePs(baseUrl: string, command: string) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/ps/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({ command })
    });
    const result = await res.json();
    if (result.status === 'success') {
      return result.output;
    }
    throw new Error(result.detail || result.error || 'Execution failed');
  }

  /**
   * CLOUD REPORTING METHODS
   */
  async connectCloud(baseUrl: string, params: { tenantId: string, appId: string, vaultName: string, secretName: string, organization: string, certificateThumbprint?: string }) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/cloud/connect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify(params)
    });
    return res.json();
  }

  async fetchCloudUsage(baseUrl: string) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/cloud/usage-report'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET }
    });
    return res.json();
  }

  async connectUnified(baseUrl: string, params: { tenantId: string, appId: string, vaultName: string, secretName: string, organization: string, certificateThumbprint?: string }) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/cloud/connect-unified'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify(params)
    });
    return res.json();
  }

  async connectExchangeOnline(baseUrl: string, params: { tenantId: string, appId: string, vaultName: string, secretName: string, organization: string, certificateThumbprint?: string }) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/powerbi/connect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify(params)
    });
    return res.json();
  }

  async getExchangeStatus(baseUrl: string) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/powerbi/status'), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET }
    });
    return res.json();
  }

  async fetchPowerBIUsage(baseUrl: string, daysBack: number = 90, credentials?: { tenantId: string, appId: string, vaultName: string, secretName: string, organization: string, certificateThumbprint?: string }) {
    const res = await fetch(this.normalizeUrl(baseUrl, '/api/powerbi/usage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hyperion-Key': GATEWAY_SECRET },
      body: JSON.stringify({
        daysBack,
        // Flatten credentials for backend (expects appId, organization, certificateThumbprint at top level)
        ...credentials
      })
    });
    return res.json();
  }
}

export const apiService = new ApiService();
