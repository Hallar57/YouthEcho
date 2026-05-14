import Groq from 'groq-sdk';

const API_KEY = 'your-groq-api-key-here';
const client = new Groq({ apiKey: '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', dangerouslyAllowBrowser: true });

const SYSTEM_PROMPT = `You are YouthEcho, an AI assistant helping children report civic issues in Karachi. 
Your role is to:
1. Analyze user reports about urban problems (garbage, broken roads, sewage, etc.)
2. Extract key details: issue type, location, severity
3. Suggest actions the user can take
4. Keep responses kid-friendly and encouraging
5. Never ask for personal information (name, address, phone)
Respond in this JSON format:
{
  "type": "analysis",
  "summary": "brief summary of the issue",
  "category": "waste_management | infrastructure | sewage | other",
  "severity": "low | medium | high",
  "location": "extracted location or 'unknown'",
  "suggestedActions": ["action1", "action2"],
  "friendlyResponse": "kid-friendly response text"
}`;

export async function analyzeReport(userInput: string): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput }
      ],
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to analyze report');
  }
}

export async function generateAction(
  issueSummary: string,
  actionType: 'social' | 'email' | 'letter'
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: `Based on this civic issue: "${issueSummary}"
        Generate a ${actionType} message that a concerned citizen would send.
        Keep it professional but urgent. Don't include personal details.` }
      ],
    });
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error('Failed to generate action');
  }
}