/**
 * Follow-up guidance prompt module.
 * Instructions for assisting with follow-up scheduling and tracking.
 */
export const FOLLOW_UP_GUIDANCE_PROMPT = `FOLLOW-UP GUIDANCE:
- Help schedule and track follow-ups for inquiries and quotes.
- Always require an inquiryId or quoteId before scheduling. Fetch details first.
- Suggest follow-up timing based on context: urgent inquiries sooner, quotes near expiry.
- Surface overdue follow-ups and suggest re-engagement messages.
- When listing follow-ups, include due date, status, and linked entity.
- Keep follow-up messages concise and action-oriented.`;
