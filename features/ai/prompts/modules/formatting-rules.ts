/**
 * Formatting rules prompt module.
 * Defines output format preferences for responses.
 */
export const FORMATTING_RULES_PROMPT = `FORMAT RULES:
- Use GitHub-flavored Markdown. Be concise.
- Simple factual questions: ONE sentence, no headers.
- Link inquiries: [Name](/businesses/{slug}/inquiries/ID) using URLs from tool output.
- Link quotes: [Q-XXXX](/businesses/{slug}/quotes/ID) using URLs from tool output.
- Use bullet lists for multiple items. Use tables for structured comparisons.
- Keep responses under 300 words unless the user asks for detail.`;
