
import { GoogleGenAI } from '@google/genai';

/**
 * AI Proxy Service - V2.1
 * Handles proxied requests to Google Gemini for PowerShell script generation and AD insights.
 */
export const generateAIContent = async (req, res) => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return res.status(500).json({ error: "AI Engine Offline", detail: "API_KEY not found in environment." });
    
    const { prompt, type } = req.body;
    if (!prompt) return res.status(400).json({ error: "Empty Prompt", detail: "A valid prompt is required for AI generation." });

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
            model: type === 'powershell' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: type === 'powershell' 
                    ? "You are a master Active Directory administrator. Return ONLY valid PowerShell code blocks without markdown formatting or preamble." 
                    : "You are the Hyperion AI assistant. Provide concise, expert advice on Active Directory and Cloud Governance."
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("AI returned empty content");
        
        res.json({ text });
    } catch (err) {
        console.error("[AI] Proxy Error:", err.message);
        res.status(502).json({ error: "AI Engine Protocol Error", detail: err.message });
    }
};
