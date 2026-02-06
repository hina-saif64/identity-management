
/**
 * VAPT HARDENED GEMINI SERVICE
 * This service no longer imports @google/genai directly.
 * All AI requests are proxied through the Hyperion Gateway to protect the API key.
 */

const GATEWAY_SECRET = import.meta.env.VITE_API_KEY || 'dev-gateway-key-change-in-production';

export class GeminiService {
  private async callProxy(prompt: string, type: 'powershell' | 'insight'): Promise<string> {
    const gatewayUrl = "http://localhost:3001"; // Fallback if no connection state available

    try {
      const response = await fetch(`${gatewayUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hyperion-Key': GATEWAY_SECRET
        },
        body: JSON.stringify({ prompt, type })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Gateway AI Handshake Failed");
      }

      const data = await response.json();
      return data.text || "No response from AI engine.";
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      return `Hyperion Secure AI failed: ${error.message}. Ensure the local gateway is running and authenticated.`;
    }
  }

  async generatePowerShell(prompt: string): Promise<string> {
    return this.callProxy(prompt, 'powershell');
  }

  async getADInsight(query: string): Promise<string> {
    return this.callProxy(query, 'insight');
  }
}

export const geminiService = new GeminiService();
