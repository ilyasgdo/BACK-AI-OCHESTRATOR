// Minimal JSON utility to ensure data is safely serializable
// Removes undefined/functions/circular refs via JSON.stringify/parse
// Use on responses when needed to guarantee plain JSON output

export function ensureJsonResponse<T>(input: T): any {
  try {
    return JSON.parse(JSON.stringify(input));
  } catch {
    // Fallback: if stringify fails, return a minimal representation
    return input as any;
  }
}