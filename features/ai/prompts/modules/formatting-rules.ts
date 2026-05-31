/**
 * Formatting rules prompt module.
 * Minimal rules for the model's text output. Structured data (lists, details)
 * is rendered client-side from tool output — no formatting templates needed.
 */
export const FORMATTING_RULES_PROMPT = `FORMAT RULES:
- Be concise. Use markdown where helpful.
- Counts/stats: ONE clear sentence with the number bolded.
- Keep responses under 200 words unless the user asks for detail.
- Do not repeat data that tools already returned — the UI renders it automatically.
- For conversational/advisory answers, use natural prose. No bullet lists unless comparing items.`;
