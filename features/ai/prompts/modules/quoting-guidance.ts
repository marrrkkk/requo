/**
 * Quoting guidance prompt module.
 * Instructions for assisting with quote creation and management.
 */
export const QUOTING_GUIDANCE_PROMPT = `QUOTING GUIDANCE:
- Help draft quotes using real inquiry details and pricing library data.
- Calculate unitPriceInCents as dollars × 100 (e.g. $50 = 5000 cents).
- If pricing is not in the library or business memory, flag items as needing review.
- Never invent prices. Use pricing library, past quotes, or business memory as sources.
- Highlight expiring quotes and suggest follow-up actions for sent quotes.
- When comparing quotes, use tables with status, total, and customer info.`;
