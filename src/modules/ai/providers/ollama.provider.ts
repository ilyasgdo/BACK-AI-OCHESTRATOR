export class OllamaProvider {
  constructor(private readonly baseUrl: string, private readonly model: string) {}

  async completeJson(system: string, user: string): Promise<string> {
    const base = this.baseUrl.replace(/\/$/, '');
    // Prefer /api/chat (newer Ollama), fall back to /api/generate for older versions
    const chatUrl = `${base}/api/chat`;
    const chatBody = {
      model: this.model || 'llama3.1',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      stream: false,
      format: 'json',
    };
    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatBody),
      });
      if (res.status === 404) throw new Error('CHAT_ENDPOINT_NOT_SUPPORTED');
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Ollama chat error ${res.status}: ${txt}`);
      }
      const data = await res.json();
      const content = data?.message?.content ?? '{}';
      return content;
    } catch (err: any) {
      if (typeof err?.message === 'string' && err.message.includes('CHAT_ENDPOINT_NOT_SUPPORTED')) {
        const genUrl = `${base}/api/generate`;
        const genBody = {
          model: this.model || 'llama3.1',
          prompt: `${system}\n\n${user}`,
          system,
          stream: false,
          format: 'json',
        } as any;
        const res = await fetch(genUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(genBody),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Ollama generate error ${res.status}: ${txt}`);
        }
        const data = await res.json();
        const content = data?.response ?? data?.message?.content ?? '{}';
        return content;
      }
      throw err;
    }
  }
}