import OpenAI from 'openai';

export class OpenAiProvider {
  private client: OpenAI;

  constructor(private readonly apiKey: string, private readonly model: string) {
    this.client = new OpenAI({ apiKey });
  }

  async completeJson(system: string, user: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: this.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // Enforce JSON-only response when supported
      response_format: { type: 'json_object' } as any,
      temperature: 0,
    });
    const content = res.choices?.[0]?.message?.content ?? '{}';
    return content;
  }
}