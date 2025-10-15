import { GoogleGenerativeAI } from '@google/generative-ai';

export class GoogleProvider {
  constructor(private readonly apiKey: string, private readonly model: string) {}

  async completeJson(system: string, user: string): Promise<string> {
    const client = new GoogleGenerativeAI(this.apiKey);
    // Default to gemini-1.5-flash (API key supported). 2.5 models typically require OAuth/Vertex.
    const modelName = this.model || 'gemini-1.5-flash';
    const model = client.getGenerativeModel({ model: modelName, systemInstruction: system });
    try {
      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: user }]}],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      } as any);
      const content = (res as any)?.response?.text?.() ?? (res as any)?.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      return content;
    } catch (err: any) {
      const msg = String(err?.message || '');
      const code = (err?.status ?? err?.code ?? '') + '';
      // Provide clearer guidance when API key auth is rejected or a 2.5 model is used with API keys.
      if (
        msg.includes('API keys are not supported') ||
        msg.includes('CREDENTIALS_MISSING') ||
        code === '401' ||
        /gemini-2\.5/i.test(modelName)
      ) {
        throw new Error(
          'GOOGLE_AUTH_ERROR: This endpoint/model requires OAuth (Vertex AI). Use an AI Studio API key with gemini-1.5-* models, or configure Vertex OAuth for 2.5 models.'
        );
      }
      throw err;
    }
  }
}