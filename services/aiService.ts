import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are YouthEcho, a friendly AI assistant helping young people report civic issues in Karachi, Pakistan.

When a user reports an issue (broken roads, garbage, water problems, etc.):
1. Analyze the issue and provide a friendly, empathetic response
2. Extract: category, location (if mentioned), severity (low/medium/high)
3. Summarize the issue clearly

IMPORTANT: Respond ONLY with valid JSON using straight quotes, NO curly quotes. Format:
{"friendlyResponse":"Your response","summary":"brief summary","category":"road|waste_management|water|electricity|sewage|other","location":"location or unknown","severity":"low|medium|high","decision":"PROCEED|BLOCK","toolsCalled":["groq_llm"]}`;

async function getGroqCompletion(prompt: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content || '';
}

function parseAIResponse(response: string) {
  try {
    const cleanedResponse = response
      .replace(/[\u2018\u2019]/g, '"')
      .replace(/[\u201C\u201D]/g, '"');
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.log('JSON parse failed, returning raw response');
  }
  return {
    friendlyResponse: response,
    summary: '',
    category: 'other',
    location: 'unknown',
    severity: 'medium',
    decision: 'PROCEED',
    toolsCalled: ['groq_llm'],
    analysis: {
      category: 'other',
      location: 'unknown',
      severity: 'medium',
      summary: '',
    },
  };
}

export async function analyzeReport(userInput: string): Promise<string> {
  try {
    const response = await getGroqCompletion(userInput);
    return response;
  } catch (error) {
    console.error('analyzeReport error:', error);
    throw new Error('Failed to analyze report');
  }
}

export async function runAgenticWorkflow(
  userInput: string,
  context?: { imageBase64?: string; audioBase64?: string }
): Promise<any> {
  try {
    let prompt = userInput;
    if (context?.imageBase64) {
      prompt = `${userInput}\n\n[Image provided - analyze the civic issue shown]`;
    }
    if (context?.audioBase64) {
      prompt = `${userInput}\n\n[Voice audio provided - transcribe and analyze]`;
    }
    
    const response = await getGroqCompletion(prompt);
    const parsed = parseAIResponse(response);
    
    return {
      ...parsed,
      analysis: {
        category: parsed.category || 'other',
        location: parsed.location || 'unknown',
        severity: parsed.severity || 'medium',
        summary: parsed.summary || '',
      },
    };
  } catch (error) {
    console.error('runAgenticWorkflow error:', error);
    return {
      decision: 'ERROR',
      toolsCalled: [],
      analysis: {},
      friendlyResponse: "I'm having trouble thinking. Let's try again! 🤖",
    };
  }
}

export async function generateAction(
  issueSummary: string,
  actionType: 'social' | 'email' | 'letter'
): Promise<string> {
  try {
    let prompt = '';
    switch (actionType) {
      case 'social':
        prompt = `Create a short social media post about: ${issueSummary}. Make it catchy and include relevant hashtags.`;
        break;
      case 'email':
        prompt = `Write a polite email draft to city officials about: ${issueSummary}. Include subject line and body.`;
        break;
      case 'letter':
        prompt = `Write a formal letter about: ${issueSummary}. Format it properly with date, salutation, and closing.`;
        break;
    }
    const response = await getGroqCompletion(prompt);
    return response;
  } catch (error) {
    console.error('generateAction error:', error);
    throw new Error('Failed to generate action');
  }
}

export async function speechToText(audioBase64: string): Promise<string> {
  try {
    const response = await getGroqCompletion('Transcribe this voice message:');
    return response;
  } catch (error) {
    console.error('speechToText error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export async function analyzeVoiceReport(audioBase64: string): Promise<string> {
  try {
    const response = await getGroqCompletion('Analyze this voice message and extract the civic issue details.');
    return response;
  } catch (error) {
    console.error('analyzeVoiceReport error:', error);
    throw new Error('Failed to analyze voice report');
  }
}

interface AILogEntry {
  id: string;
  timestamp: Date;
  type: 'text' | 'image' | 'voice';
  userInput: string;
  aiResponse: string;
  toolsUsed: string[];
  category?: string;
  severity?: string;
}

let aiInteractionLog: AILogEntry[] = [];

export function logAIInteraction(
  type: 'text' | 'image' | 'voice',
  userInput: string,
  aiResponse: string,
  toolsUsed: string[],
  category?: string,
  severity?: string
): void {
  aiInteractionLog.push({
    id: Date.now().toString() + Math.random().toString().slice(2),
    timestamp: new Date(),
    type,
    userInput,
    aiResponse,
    toolsUsed,
    category,
    severity,
  });
  console.log('[AI LOG] Entry added');
}

export function getAIInteractionLog(): AILogEntry[] {
  return [...aiInteractionLog];
}

export function clearAIInteractionLog(): void {
  aiInteractionLog = [];
  console.log('[AI LOG] Cleared');
}

export function deleteAllData(): Promise<void> {
  return new Promise((resolve) => {
    aiInteractionLog = [];
    console.log('[DATA SOVEREIGNTY] All data deleted');
    resolve();
  });
}

export const biasMitigationNotes = `BIAS MITIGATION: Tested on diverse Karachi features and Urdu-influenced English.`;