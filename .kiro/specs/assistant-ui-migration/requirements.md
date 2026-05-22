# Requirements Document

## Introduction

Refactor Requo's AI assistant system to use assistant-ui (`@assistant-ui/react`, `@assistant-ui/react-ai-sdk`, `@assistant-ui/react-markdown`). This migration replaces the custom SSE streaming protocol, custom chat panel UI, custom message rendering, and custom conversation management with assistant-ui's primitives and runtime while preserving all existing server-side logic, DB schema, access control, and business-scoping.

## Glossary

- **Assistant_UI**: The `@assistant-ui/react` library providing composable chat primitives (Thread, ThreadList, AssistantModal, etc.) and runtime adapters for building AI assistant interfaces.
- **ExternalStoreRuntime**: An assistant-ui runtime adapter that connects to an external data source (Requo's PostgreSQL-backed conversation history) rather than managing state internally.
- **Thread**: An assistant-ui primitive component that renders a conversation's messages, input composer, and streaming state.
- **ThreadList**: An assistant-ui primitive that renders a list of conversations for selection.
- **AssistantRuntimeProvider**: A React context provider from assistant-ui that supplies the runtime to all nested assistant-ui primitives.
- **Transport**: A custom adapter layer that handles communication between the assistant-ui client runtime and the server-side chat API route.
- **Surface**: A URL-derived context scope (inquiry, quote, or dashboard) that determines which business data and tools the AI assistant can access.
- **Chat_Route**: The Next.js App Router POST endpoint at `app/api/ai/chat/route.ts` that processes AI chat requests and returns streamed responses.
- **Tool_UI**: A client-side React component registered with assistant-ui to render tool call results inline within the conversation thread.
- **Capacity_Router**: The existing multi-provider model selection system (`lib/ai/capacity-selector.ts`) that tries models with fallback based on provider availability.
- **UI_Message_Stream**: The Vercel AI SDK stream format produced by `toUIMessageStreamResponse()` that assistant-ui natively consumes.
- **Conversation_Store**: The existing PostgreSQL tables (`ai_conversations` and `ai_messages`) managed via Drizzle ORM that persist all AI conversation history.

## Requirements

### Requirement 1: Runtime Provider Integration

**User Story:** As a developer, I want a single runtime provider component that bridges assistant-ui with Requo's existing conversation persistence, so that all assistant-ui primitives can access conversation state from our database.

#### Acceptance Criteria

1. THE Runtime_Provider SHALL use ExternalStoreRuntime to connect assistant-ui primitives with the Conversation_Store.
2. WHEN a Surface is detected from the current URL, THE Runtime_Provider SHALL scope the runtime to the conversation history matching the authenticated user's ID, the active business ID, the detected surface type, and the entity ID extracted from the route.
3. THE Runtime_Provider SHALL expose conversation messages from the Conversation_Store to assistant-ui primitives without requiring schema changes to the `ai_conversations` or `ai_messages` tables.
4. WHEN the Runtime_Provider mounts, THE Runtime_Provider SHALL load existing conversation history for the active surface and entity from the Conversation_Store and present messages to assistant-ui within 2 seconds of mount on a standard connection.
5. THE Runtime_Provider SHALL map each Conversation_Store message field (`role` as user|assistant|system, `content` as text, `status` as completed|generating|failed, `metadata` as JSON object, and `createdAt` as timestamp) to the corresponding assistant-ui internal message format, preserving message order by `createdAt` ascending.
6. IF the Conversation_Store returns no messages for the active surface and entity, THEN THE Runtime_Provider SHALL initialize the runtime with an empty thread without displaying an error state.
7. IF the Conversation_Store query fails due to a network or database error, THEN THE Runtime_Provider SHALL display an error indication to the user and prevent message submission until the connection is recovered.
8. IF no authenticated user session exists when the Runtime_Provider mounts, THEN THE Runtime_Provider SHALL not attempt to load conversation history and SHALL render assistant-ui primitives in a disabled state.

### Requirement 2: Custom Transport Layer

**User Story:** As a developer, I want a custom transport that sends chat requests with Requo's business context to the server, so that assistant-ui can communicate with our existing AI pipeline without exposing system prompts or business logic to the client.

#### Acceptance Criteria

1. WHEN the user sends a message, THE Transport SHALL send the message to the Chat_Route with surface, entityId, businessSlug, and conversationId metadata, where the message is a string of 1 to 6000 characters.
2. THE Transport SHALL NOT send system prompts, surface instructions, or AI model configuration from the client to the server.
3. WHEN the Chat_Route returns a streamed response, THE Transport SHALL forward the stream to assistant-ui's runtime for incremental rendering until the stream completes or the connection closes.
4. IF the Chat_Route returns HTTP 401 or 403, THEN THE Transport SHALL propagate an error to assistant-ui's error handling indicating the user is unauthenticated or lacks plan access.
5. IF the Chat_Route returns HTTP 429, THEN THE Transport SHALL propagate a rate-limit error to assistant-ui's error handling indicating the user should retry after 60 seconds.
6. THE Transport SHALL include the active conversationId so the server can append messages to the correct Conversation_Store record.
7. WHEN no conversation exists for the current surface and entity, THE Transport SHALL send the request without a prior conversation context, and WHEN the server responds with a conversation ID, THE Transport SHALL store and reuse that ID for subsequent messages in the same session.
8. IF the Chat_Route returns HTTP 400 due to invalid request body or validation failure, THEN THE Transport SHALL propagate a validation error to assistant-ui's error handling indicating the request was malformed.
9. IF the network connection drops while streaming a response, THEN THE Transport SHALL propagate a connection error to assistant-ui's error handling and preserve any partially received content.

### Requirement 3: Chat API Route Migration

**User Story:** As a developer, I want the chat API route rewritten to use `toUIMessageStreamResponse()`, so that the server produces a stream format that assistant-ui natively understands without custom SSE parsing.

#### Acceptance Criteria

1. THE Chat_Route SHALL return responses using `toUIMessageStreamResponse()` from the Vercel AI SDK, replacing the current custom SSE encoding via `encodeStreamEvent()`.
2. THE Chat_Route SHALL preserve server-side system prompt assembly using the existing `getSurfaceInstructions()` and `buildAiSurfaceContext()` builder, combining surface instructions and context into the system prompt passed to `streamText()`.
3. THE Chat_Route SHALL preserve the Capacity_Router for model selection and fallback behavior, including `selectToolCallingModels()`, `selectSimpleTextModels()`, `selectComplexTextModels()`, `recordModelUsage()`, and `markModelExhausted()` with retry on rate-limit errors.
4. THE Chat_Route SHALL persist user messages via `createAiUserMessage()` and assistant responses via `createAiAssistantMessage()` and `updateAiAssistantMessage()` to the Conversation_Store, preserving the existing schema including status transitions (generating → completed/failed) and metadata fields (provider, model, latencyMs, errorReason, userMessageId).
5. THE Chat_Route SHALL enforce authentication via `getCurrentUser()` and return a 401 status with a JSON error body for unauthenticated requests.
6. THE Chat_Route SHALL enforce business-scoping via `resolveAiSurfaceAccess()` and `getAuthorizedAiConversation()` so users can only access conversations belonging to their own businesses, returning 404 for unauthorized conversation access.
7. WHEN a tool call is made during streaming, THE Chat_Route SHALL include tool call and tool result data in the UI_Message_Stream by passing the tools object (from `createDashboardTools()` and `createActionTools()`) to `streamText()` so that `toUIMessageStreamResponse()` serializes tool invocations for assistant-ui Tool_UI components.
8. THE Chat_Route SHALL enforce the existing rate limiter via `assertPublicActionRateLimit()` with a limit of 20 requests per 60-second window per user-entity scope, returning a 429 status when exceeded.
9. IF the `streamText()` call produces no content and all fallback models are exhausted, THEN THE Chat_Route SHALL persist the assistant message with status "failed" and return an error indication in the stream response.
10. WHEN a request is received, THE Chat_Route SHALL validate the request body against `aiChatRequestSchema` and return a 400 status with a JSON error body if validation fails.

### Requirement 4: Thread Component Integration

**User Story:** As a user, I want the AI chat conversation rendered using assistant-ui's Thread component, so that I get consistent streaming UX, message rendering, and input handling without custom implementation.

#### Acceptance Criteria

1. THE Thread component SHALL render conversation messages with GitHub-flavored Markdown support including tables, fenced code blocks with syntax highlighting, and ordered/unordered lists.
2. WHILE an assistant response is streaming, THE Thread component SHALL append tokens to the message in real time so that text appears incrementally as it is received from the UI_Message_Stream.
3. THE Thread component SHALL provide a composer input that supports multi-line text entry up to 4000 characters, submits on Enter, and inserts a newline on Shift+Enter.
4. WHILE an assistant response is generating, THE Thread component SHALL display an animated loading indicator within the message area.
5. IF a message fails to generate, THEN THE Thread component SHALL display an error state indicating the failure reason and preserve any user input that was submitted.
6. THE Thread component SHALL apply Requo's design system using semantic tokens from DESIGN.md including `surface-*` tokens for message containers, `control-*` tokens for the composer input, and `overlay-*` tokens for any popover elements.
7. THE Thread component SHALL support scrolling through conversation history and automatically scroll to the bottom when a new message is added or streaming content extends beyond the visible area.
8. WHEN the user scrolls up away from the bottom of the conversation, THE Thread component SHALL stop auto-scrolling until the user scrolls back to the bottom or a new user message is submitted.

### Requirement 5: Conversation List and Management

**User Story:** As a user, I want to view, create, and switch between AI conversations, so that I can organize my interactions by topic.

#### Acceptance Criteria

1. THE ThreadList SHALL display all conversations for the current surface and entity, ordered by most recent `lastMessageAt` timestamp descending, with conversations that have no messages appearing at the top sorted by `createdAt` descending.
2. WHEN a user selects a conversation from the ThreadList, THE Runtime_Provider SHALL load that conversation's messages from the Conversation_Store and display them within 2 seconds.
3. WHEN a user creates a new conversation, THE Runtime_Provider SHALL initialize an empty thread in the UI and persist a new record in the Conversation_Store upon sending the first message.
4. WHEN a user deletes a conversation, THE Runtime_Provider SHALL remove the conversation and its associated messages from the Conversation_Store and switch to the most recently active remaining conversation for the same surface and entity.
5. IF a user deletes the only conversation for a surface and entity, THEN THE Runtime_Provider SHALL display an empty state prompting the user to start a new conversation.
6. THE ThreadList SHALL display the conversation title and a plain-text preview of the last message truncated to 100 characters for each entry.
7. IF a conversation has no title, THEN THE ThreadList SHALL display a fallback label derived from the first user message truncated to 60 characters, or "New conversation" if no messages exist.

### Requirement 6: Tool UI Components

**User Story:** As a user, I want AI tool calls (like drafting quotes, scheduling follow-ups) rendered as interactive cards within the conversation, so that I can review and confirm AI-proposed actions inline.

#### Acceptance Criteria

1. WHEN the assistant calls an action tool (draft_quote, draft_inquiry, schedule_follow_up, update_inquiry_status), THE Tool_UI SHALL render a confirmation card displaying the action type label, an icon, a summary of proposed payload fields (maximum 5 summary lines, each truncated to 80 characters), and a "Confirm" button that the user must click to execute the action.
2. THE Tool_UI components SHALL register with assistant-ui's tool rendering system using `makeAssistantToolUI` or equivalent registration, such that each action tool name maps to exactly one registered renderer.
3. WHEN a read-only tool (list_inquiries, get_quote_details, get_inquiry_details, search_inquiries, search_quotes, get_business_stats, get_follow_ups, get_recent_activity) returns data, THE Tool_UI SHALL render a compact data display showing the returned records, OR fall back to the assistant's text response if the returned data is empty or contains fewer than 1 record.
4. THE Tool_UI components SHALL use Requo's design system semantic tokens (surface-*, control-*, overlay-* utilities) and shared UI primitives (Button, Card, Badge) without introducing custom color palette values or new visual patterns.
5. IF a tool call fails with a network error or a non-2xx HTTP response, THEN THE Tool_UI SHALL display an error state card containing an error icon, an error message indicating the failure reason, and a "Retry" button that re-executes the same tool call when clicked.
6. WHILE the tool call is executing after the user clicks "Confirm", THE Tool_UI SHALL display a loading indicator within the action card and disable the confirm button to prevent duplicate submissions.
7. WHEN a tool call succeeds, THE Tool_UI SHALL replace the confirm button with a success indicator and, if the response includes an entity URL, a link to navigate to the created or updated entity.

### Requirement 7: Assistant Modal and Popover Surfaces

**User Story:** As a user, I want the AI assistant available as both a slide-out panel and a full-page view depending on my current surface, so that the assistant adapts to the context I'm working in.

#### Acceptance Criteria

1. WHEN the user is on an inquiry or quote detail page (matching route pattern `/businesses/<slug>/inquiries/<id>` or `/businesses/<slug>/quotes/<id>`), THE Assistant_UI SHALL render as a collapsible floating panel anchored to the bottom-right of the viewport (replacing the current `ai-chat-popover.tsx`).
2. WHEN the user is on the dedicated assistant page (matching route pattern `/businesses/<slug>/assistant`), THE Assistant_UI SHALL render as a full-width thread view that fills the available content area below the page header (replacing the current `assistant-full-page.tsx`).
3. WHEN the user toggles the side panel open or closed, THE Assistant_UI SHALL persist the open/closed state for the duration of the browser session and restore that state when navigating between pages within the same surface type (inquiry or quote).
4. WHEN the side panel is in the closed state, THE Assistant_UI SHALL display only the circular trigger button (maximum 56×56 pixels) and SHALL NOT overlay, shift, or obscure any primary page content.
5. WHEN the user navigates from one surface type to another (e.g., from an inquiry detail page to the dashboard), THE Assistant_UI SHALL close the side panel automatically so the user starts fresh on the new context.
6. THE full-page variant SHALL use the AssistantRuntimeProvider with Thread to fill the available content area with the surface set to "dashboard" and entityId set to the current business context.
7. IF the user does not have feature access to the AI assistant (plan gating), THEN THE Assistant_UI SHALL NOT render the panel trigger button or the full-page thread view.

### Requirement 8: Surface-Scoped Context Preservation

**User Story:** As a user, I want the AI assistant to automatically know about the inquiry or quote I'm viewing, so that I get contextual help without repeating information.

#### Acceptance Criteria

1. THE Runtime_Provider SHALL detect the current Surface from the URL path by matching the route segment to one of the valid surfaces ("inquiry", "quote", or "dashboard") and pass the resolved surface and entity ID to the Transport layer in every chat request.
2. IF the URL path does not match any valid surface, THEN THE Runtime_Provider SHALL default to the "dashboard" surface with the current business ID as the entity ID.
3. THE Chat_Route SHALL call the existing `buildAiSurfaceContext()` function with the detected surface, entity ID, business ID, and the user's message text to assemble context including RAG-based memory retrieval.
4. THE Chat_Route SHALL call the existing `getSurfaceInstructions()` function with the detected surface to generate surface-specific system prompt instructions prepended to the AI completion request.
5. WHEN the user navigates to a different entity within the same surface, THE Runtime_Provider SHALL resolve the new entity ID from the URL path and switch to that entity's conversation within 1 second of navigation completing.
6. IF `buildAiSurfaceContext()` returns null for the given surface and entity, THEN THE Chat_Route SHALL respond with an error indicating the assistant context could not be loaded and SHALL NOT send a request to the AI provider.

### Requirement 9: Markdown Rendering

**User Story:** As a user, I want AI responses rendered with rich formatting including tables, code blocks, and links, so that complex information is readable and actionable.

#### Acceptance Criteria

1. THE Markdown renderer SHALL use `@assistant-ui/react-markdown` for message content rendering.
2. THE Markdown renderer SHALL support GitHub-flavored Markdown including tables, fenced code blocks, task lists, and strikethrough.
3. WHEN a link appears in a response, THE Markdown renderer SHALL render it as a clickable anchor that opens in a new browser tab, styled using the `ai-prose` link token (underlined, primary color, with hover state transition).
4. WHEN a fenced code block appears, THE Markdown renderer SHALL render it with syntax highlighting and a copy-to-clipboard button that copies the full code block content.
5. THE Markdown renderer SHALL wrap rendered content with the `ai-prose` class to apply Requo's existing typography tokens (font-heading for headings, font-mono for code, semantic color tokens, and spacing scale) for consistent visual style within the thread.
6. WHEN a code block copy button is activated, THE Markdown renderer SHALL copy the block content to the clipboard within 200ms and display a visual confirmation indicator for 2 seconds.
7. IF the Markdown content contains raw HTML tags, THEN THE Markdown renderer SHALL sanitize them by stripping disallowed tags and rendering only safe text content.

### Requirement 10: Existing Server Logic Preservation

**User Story:** As a developer, I want all existing server-side AI logic preserved unchanged, so that the migration is purely a client-side and streaming-protocol concern.

#### Acceptance Criteria

1. THE migration SHALL NOT modify the multi-provider model router (`lib/ai/registry.ts`).
2. THE migration SHALL NOT modify the capacity-aware fallback selector (`lib/ai/capacity-selector.ts`).
3. THE migration SHALL NOT modify server-side tool definitions (`features/ai/tools/`).
4. THE migration SHALL NOT modify the surface context builder (`features/ai/surface-service.ts`).
5. THE migration SHALL NOT modify the DB schema for `ai_conversations` or `ai_messages` tables.
6. THE migration SHALL NOT modify the usage limiter, token logger, AI cache, or history summarizer.
7. THE migration SHALL NOT add new AI providers or models.
8. THE migration SHALL preserve the existing access control checks that scope conversations to authenticated users and their businesses.
9. WHEN the migration is complete, THE system SHALL produce identical server-side behavior for AI requests as verified by the existing AI-related unit and integration tests passing without modification.
10. THE migration SHALL NOT modify server-side route handler logic in `app/api/ai/` beyond replacing the streaming response encoding (e.g., switching from one wire format to another), preserving all request validation, authentication, tool invocation, and model-routing logic unchanged.

### Requirement 11: Scaffold Component Library

**User Story:** As a developer, I want a standard set of assistant-ui scaffold components in `components/assistant-ui/`, so that the assistant UI is modular, maintainable, and follows assistant-ui conventions.

#### Acceptance Criteria

1. THE scaffold SHALL include a `thread.tsx` component that wraps assistant-ui's Thread primitive, applies Requo's design system tokens for message bubbles, input composer, and scroll area, and exports a single named React component.
2. THE scaffold SHALL include a `thread-list.tsx` component that wraps assistant-ui's ThreadList primitive and renders each conversation entry with the conversation title and a truncated last-message preview of up to 80 characters.
3. THE scaffold SHALL include a `markdown-text.tsx` component that configures `@assistant-ui/react-markdown` with GitHub-flavored Markdown support (tables, fenced code blocks, task lists, strikethrough) and applies Requo's typography tokens.
4. THE scaffold SHALL include a `tool-fallback.tsx` component that renders unrecognized tool calls as a read-only card displaying the tool name, a JSON-formatted arguments summary, and a visual indicator that the tool has no dedicated UI.
5. THE scaffold SHALL include an `assistant-modal.tsx` component that wraps assistant-ui's AssistantModal primitive to provide the collapsible side-panel variant with open/close toggling.
6. THE scaffold components SHALL use Requo's design system tokens (surface-*, control-*, overlay-* utilities) and shadcn/ui primitives (Card, Button, ScrollArea) as the base building blocks, without introducing new styling patterns.
7. IF a scaffold component receives invalid or missing runtime context from AssistantRuntimeProvider, THEN the component SHALL render nothing and SHALL NOT throw an unhandled exception.
8. THE scaffold SHALL export each component as a named export from its respective file, with each file containing exactly one primary component.

### Requirement 12: Legacy Component Removal

**User Story:** As a developer, I want the custom SSE streaming and chat UI code removed after migration, so that the codebase has a single chat implementation without dead code.

#### Acceptance Criteria

1. WHEN the assistant-ui integration is complete and all acceptance criteria in Requirements 1–11 pass, THE migration SHALL remove `features/ai/components/ai-chat-panel.tsx`.
2. WHEN the assistant-ui integration is complete and all acceptance criteria in Requirements 1–11 pass, THE migration SHALL remove `features/ai/components/ai-chat-popover.tsx`.
3. WHEN the assistant-ui integration is complete and all acceptance criteria in Requirements 1–11 pass, THE migration SHALL remove `features/ai/components/assistant-full-page.tsx`.
4. WHEN the assistant-ui integration is complete and all acceptance criteria in Requirements 1–11 pass, THE migration SHALL remove the custom SSE stream consumer logic from `features/ai/components/ai-chat-helpers.ts` while preserving any non-streaming utility functions that are still imported by other modules.
5. WHEN the assistant-ui integration is complete and all acceptance criteria in Requirements 1–11 pass, THE migration SHALL remove the custom SSE event type definitions (conversation, messages, meta, status, delta, done, error, debug) from the streaming protocol module.
6. IF the conversation CRUD routes (`/api/ai/conversation`, `/api/ai/conversations`, `/api/ai/conversations/[id]/messages`) have zero remaining import references outside of removed files, THEN THE migration SHALL remove those route files.
7. IF the conversation CRUD routes are still imported by the assistant-ui ExternalStoreRuntime adapter for history loading, THEN THE migration SHALL preserve those routes unchanged.
8. WHEN a legacy file is removed, THE migration SHALL verify that the project produces zero new TypeScript compilation errors and zero new lint errors attributable to the removal.
