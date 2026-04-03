<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project
This repository contains **QuoteFlow**, a SaaS web app for small service businesses.

### Product summary
QuoteFlow helps small businesses collect customer inquiries, manage them in one dashboard, generate quotations, upload business knowledge files, and use AI to draft practical replies.

### Core stack 
- Next.js (App Router, TypeScript)
- Tailwind CSS
- ShadCN UI
- Supabase (database, storage)
- Better Auth (authentication and sessions)
- Resend (transactional email)
- OpenRouter (AI features)

## Working style
When making changes in this repo:

1. Plan before coding when the task is multi-step or affects architecture.
2. Prefer small, reviewable changes over giant rewrites.
3. Keep code production-minded, typed, and modular.
4. Reuse existing utilities and components where possible.
5. Do not invent fake implementations if a real one can be built.
6. If a feature is too large, implement the MVP slice first.
7. After coding, run relevant checks and summarize what changed.

## Product constraints
This is an MVP. Do not add:
- billing/subscriptions
- team collaboration beyond owner-first flows
- marketplace features
- mobile app
- live chat
- advanced RAG infrastructure unless explicitly requested
- over-engineered abstractions

## UX bar
The app should feel like a polished SaaS product, not a raw admin panel.

Prioritize:
- clean layout
- good spacing
- consistent typography
- strong empty states
- useful defaults
- responsive UI
- clear forms and actions

## Design rules
- Use the existing design system and design tokens.
- Do not replace the visual language.
- Keep the UI modern, minimalist, calm, polished, and practical.
- Avoid clutter, heavy decoration, random gradients, and flashy animation.
- Prefer clean layout, strong spacing, crisp cards, soft borders, clear hierarchy, and responsive behavior.

## Authentication
Use **Better Auth**, not Supabase Auth.

Requirements:
- email/password auth
- session handling
- protected app routes
- forgot/reset password flow
- workspace creation on first signup
- secure server-side auth handling

## Data ownership and security
- Users must only access their own workspace data.
- Public inquiry submission must be tightly scoped.
- Protect server-only secrets.
- Validate all inputs with Zod.
- Use safe storage rules and file validation.

## Code quality
- TypeScript strict
- clear naming
- feature-oriented structure where practical
- avoid giant files
- no dead code
- no unnecessary comments
- no any unless justified

## Expected architecture
Prefer separating:
- validation schemas
- database queries
- server actions / route handlers
- UI components
- email utilities
- AI utilities

## Done means
A task is done when:
1. the requested feature is implemented,
2. the code compiles,
3. lint/type issues are addressed where relevant,
4. the change is consistent with the current codebase,
5. a short summary of touched files and follow-ups is provided.

## For every implementation task
Codex should:
1. inspect relevant existing files first,
2. produce a short plan,
3. implement only the requested slice,
4. avoid unrelated refactors,
5. mention any assumptions clearly.

# AGENTS.md

## Project
This repository contains a modern SaaS-style web app built with Next.js, Tailwind, and ShadCN UI.

## UI goal
The UI should feel modern, minimalist, polished, calm, and production-ready.

## Existing system
- The repo already has a design system
- The repo already has design tokens
- Reuse the existing visual language
- Do not replace the design system
- Do not invent a new style direction from scratch

## Working rules
1. Inspect relevant existing files before editing.
2. For multi-step UI tasks, propose a short plan first.
3. Keep diffs scoped to the requested UI slice.
4. Reuse existing tokens, utilities, and shared components.
5. Avoid unrelated refactors.
6. Keep code production-minded and componentized.
7. Summarize touched files after implementation.

## UI rules
- Keep the UI modern, minimalist, calm, polished, and practical
- Prefer clean layout, strong spacing, soft borders, subtle depth, and clear hierarchy
- Avoid clutter, noisy decoration, random gradients, and flashy animation
- Use cards intentionally, not everywhere
- Keep forms, tables, and detail pages clean and easy to scan
- Preserve responsive behavior and improve it where needed

## Do not do
- do not change backend logic unless absolutely necessary for UI wiring
- do not redesign the product into a different visual language
- do not add unrelated features
- do not over-animate

## Done means
A task is done when:
1. the requested UI slice is implemented,
2. layout and styling are consistent with the design system,
3. the code remains reusable and maintainable,
4. changed files are summarized clearly.
