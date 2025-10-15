import OpenAI from 'openai';

export class PerplexityProvider {
  private client: OpenAI;

  constructor(private readonly apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey, baseURL: 'https://api.perplexity.ai' });
  }

  async completeJson(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model || 'pplx-70b-online',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
    });
    const content = res.choices?.[0]?.message?.content ?? '{}';
    return content;
  }
}