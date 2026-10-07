import { GoogleGenAI } from '@google/genai';

export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.gemini_api_key ||
    process.env.google_api_key ||
    null
  );
}

let geminiClientInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }
  if (!geminiClientInstance) {
    geminiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClientInstance;
}
