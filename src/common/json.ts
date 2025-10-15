export function ensureJsonResponse(raw: string): any {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const jsonStr = raw.slice(start, end + 1);
    return JSON.parse(jsonStr);
  }
  throw new Error('Invalid JSON response from LLM');
}

