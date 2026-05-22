# Implementation Plan: Assistant UI Migration

## Overview

Migrate Requo's AI assistant from a custom SSE streaming protocol and bespoke chat UI to assistant-ui (`@assistant-ui/react`, `@assistant-ui/react-ai-sdk`, `@assistant-ui/react-markdown`). The implementation replaces the streaming wire format, client-side rendering layer, and conversation management UI while preserving all server-side logic unchanged.

## Tasks

- [ ] 1. Install dependencies and set up scaffold structure
  - [ ] 1.1 Install assistant-ui packages and create scaffold directory
    - Install `@assistant-ui/react`, `@assistant-ui/react-ai-sdk`, `@assistant-ui/react-markdown`
    - Create `components/assistant-ui/` directory
    - Create `features/ai/components/tool-ui/` directory
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 2. Implement scaffold components
  - [ ] 2.1 Create `components/assistant-ui/markdown-text.tsx`
    - Configure `@assistant-ui/react-markdown` with GFM support (tables, fenced code blocks, task lists, strikethrough)
    - Add syntax highlighting for code blocks with copy-to-clipboard button
    - Apply `ai-prose` class with Requo typography tokens
    - Sanitize raw HTML by stripping disallowed tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<style>`, `<link>`)
    - Render links as clickable anchors opening in new tabs
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ] 2.2 Create `components/assistant-ui/thread.tsx`
    - Wrap assistant-ui's Thread primitive with Requo design tokens (`surface-*`, `control-*`, `overlay-*`)
    - Configure composer with 4000 character limit, Enter to submit, Shift+Enter for newline
    - Include animated loading indicator during streaming
    - Support auto-scroll to bottom on new messages with scroll-away detection
    - Integrate `markdown-text.tsx` for message content rendering
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 11.1_

  - [ ] 2.3 Create `components/assistant-ui/thread-list.tsx`
    - Wrap assistant-ui's ThreadList primitive
    - Render each entry with conversation title and truncated last-message preview (80 chars)
    - Display fallback label from first user message (60 chars) or "New conversation" if no messages
    - _Requirements: 5.6, 5.7, 11.2_

  - [ ] 2.4 Create `components/assistant-ui/tool-fallback.tsx`
    - Render unrecognized tool calls as read-only card with tool name and JSON args
    - Display visual indicator that tool has no dedicated UI
    - Use Card and Badge primitives from shadcn/ui
    - _Requirements: 11.4_

  - [ ] 2.5 Create `components/assistant-ui/assistant-modal.tsx`
    - Wrap assistant-ui's AssistantModal primitive for collapsible side-panel
    - Implement open/close toggling with session state persistence
    - Render circular trigger button (max 56×56px) when closed
    - _Requirements: 7.1, 7.3, 7.4, 11.5_

  - [ ]* 2.6 Write unit tests for markdown-text HTML sanitization
    - Test that disallowed tags are stripped while preserving safe text content
    - Test code block copy-to-clipboard functionality
    - _Requirements: 9.6, 9.7_

  - [ ]* 2.7 Write property test for HTML sanitization (Property 7)
    - **Property 7: Markdown HTML sanitization strips disallowed tags**
    - **Validates: Requirements 9.7**

  - [ ]* 2.8 Write property test for text truncation (Property 6)
    - **Property 6: Text truncation preserves prefix and respects length limits**
    - **Validates: Requirements 5.6, 5.7**

- [ ] 3. Implement surface detection and transport layer
  - [ ] 3.1 Create `features/ai/hooks/use-ai-surface.ts`
    - Implement URL path matching for inquiry, quote, and dashboard surfaces
    - Extract entity ID from route segments
    - Default to dashboard surface with business ID when no pattern matches
    - _Requirements: 8.1, 8.2, 1.2_

  - [ ] 3.2 Create `features/ai/transport.ts`
    - Implement `sendChatMessage` function with surface metadata in request body
    - Include `message`, `surface`, `entityId`, `businessSlug`, and `conversationId` fields
    - Exclude system prompts, surface instructions, and model config from request
    - Implement `TransportError` class with status code and message
    - Handle HTTP 401, 403, 429, 400 error propagation
    - Handle network connection drops preserving partial content
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]* 3.3 Write property test for surface detection (Property 1)
    - **Property 1: Surface detection resolves correctly for all valid URL paths**
    - **Validates: Requirements 1.2, 8.1, 8.2**

  - [ ]* 3.4 Write property test for transport request construction (Property 3)
    - **Property 3: Transport request contains required metadata and excludes sensitive fields**
    - **Validates: Requirements 2.1, 2.2, 2.6**

  - [ ]* 3.5 Write unit tests for transport error handling
    - Test 401, 403, 429, 400 error scenarios
    - Test network connection drop handling
    - _Requirements: 2.4, 2.5, 2.8, 2.9_

- [ ] 4. Implement runtime provider and conversation management
  - [ ] 4.1 Create `features/ai/components/assistant-runtime-provider.tsx`
    - Set up `useExternalStoreRuntime` with Conversation_Store message conversion
    - Implement `convertMessage` function mapping DB messages to `ThreadMessageLike`
    - Load conversation history on mount for active surface and entity
    - Initialize empty thread when no messages exist
    - Display error indication on database query failure
    - Render disabled state when no authenticated session
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 4.2 Implement `ExternalStoreThreadListAdapter` in runtime provider
    - Load conversations for current surface and entity sorted by `lastMessageAt` descending
    - Support switching between conversations
    - Support creating new conversations (persist on first message)
    - Support deleting conversations with fallback to most recent remaining
    - Display empty state when last conversation is deleted
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 4.3 Wire surface detection to runtime provider
    - Connect `useAiSurface` hook output to runtime scoping
    - Switch entity context on navigation within same surface within 1 second
    - _Requirements: 8.1, 8.5_

  - [ ]* 4.4 Write property test for message format mapping (Property 2)
    - **Property 2: Message format mapping preserves all fields**
    - **Validates: Requirements 1.5**

  - [ ]* 4.5 Write property test for conversation list ordering (Property 5)
    - **Property 5: Conversation list ordering is correct**
    - **Validates: Requirements 5.1**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Migrate chat API route
  - [ ] 6.1 Update `app/api/ai/chat/route.ts` to use `toUIMessageStreamResponse()`
    - Replace custom SSE encoding (`encodeStreamEvent`) with `toUIMessageStreamResponse(result)`
    - Preserve all existing auth, access control, context building, model selection logic
    - Preserve `streamText()` configuration including tools, temperature, maxOutputTokens, abortSignal
    - Preserve `onFinish` callback for message persistence
    - Preserve rate limiting via `assertPublicActionRateLimit()`
    - Preserve request body validation against `aiChatRequestSchema`
    - Ensure tool call and tool result data is included in stream
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

  - [ ]* 6.2 Write property test for request body validation (Property 4)
    - **Property 4: Chat route rejects invalid request bodies**
    - **Validates: Requirements 3.10**

  - [ ]* 6.3 Write integration tests for chat route
    - Test authentication enforcement (401 for unauthenticated)
    - Test business-scoping (404 for unauthorized conversation access)
    - Test rate limiting (429 when exceeded)
    - Test stream format content-type header
    - _Requirements: 3.5, 3.6, 3.8, 3.10_

- [ ] 7. Implement tool UI components
  - [ ] 7.1 Create `features/ai/components/tool-ui/action-tool-ui.tsx`
    - Register Tool UIs for `draft_quote`, `draft_inquiry`, `schedule_follow_up`, `update_inquiry_status` using `makeAssistantToolUI`
    - Render confirmation card with action type label, icon, payload summary (max 5 lines, 80 char truncation)
    - Implement "Confirm" button that calls `/api/ai/actions`
    - Show loading indicator while executing, disable button to prevent duplicates
    - Show success indicator with entity URL link on completion
    - Show error card with "Retry" button on failure
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.7_

  - [ ] 7.2 Create `features/ai/components/tool-ui/data-tool-ui.tsx`
    - Register Tool UIs for `list_inquiries`, `get_quote_details`, `get_inquiry_details`, `search_inquiries`, `search_quotes`, `get_business_stats`, `get_follow_ups`, `get_recent_activity`
    - Render compact data display for returned records
    - Fall back to assistant's text response when data is empty or fewer than 1 record
    - Use Requo design tokens and shared UI primitives (Card, Badge)
    - _Requirements: 6.3, 6.4_

  - [ ]* 7.3 Write component tests for tool UI
    - Test confirmation card rendering for each action tool
    - Test loading/success/error state transitions
    - Test data display rendering for read-only tools
    - _Requirements: 6.1, 6.3, 6.5, 6.6, 6.7_

- [ ] 8. Implement assistant surfaces (modal and full-page)
  - [ ] 8.1 Integrate assistant modal on inquiry and quote detail pages
    - Render collapsible floating panel on `/businesses/<slug>/inquiries/<id>` and `/businesses/<slug>/quotes/<id>`
    - Persist open/closed state for browser session duration
    - Close panel automatically on surface type navigation change
    - Hide trigger button when user lacks AI feature access
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.7_

  - [ ] 8.2 Integrate full-page assistant view
    - Render full-width thread on `/businesses/<slug>/assistant`
    - Set surface to "dashboard" with business context as entity
    - Use AssistantRuntimeProvider with Thread filling available content area
    - Hide when user lacks AI feature access
    - _Requirements: 7.2, 7.6, 7.7_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Remove legacy components
  - [ ] 10.1 Remove legacy chat UI files
    - Delete `features/ai/components/ai-chat-panel.tsx`
    - Delete `features/ai/components/ai-chat-popover.tsx`
    - Delete `features/ai/components/assistant-full-page.tsx`
    - Remove custom SSE stream consumer logic from `features/ai/components/ai-chat-helpers.ts` (preserve non-streaming utilities still imported elsewhere)
    - Remove custom SSE event type definitions from streaming protocol module
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ] 10.2 Evaluate and clean up conversation CRUD routes
    - Check if `/api/ai/conversation`, `/api/ai/conversations`, `/api/ai/conversations/[id]/messages` are still imported by ExternalStoreRuntime adapter
    - Preserve routes if still used; remove if zero remaining import references
    - _Requirements: 12.6, 12.7_

  - [ ] 10.3 Verify zero new TypeScript and lint errors
    - Run `npm run typecheck` and `npm run lint` to confirm no regressions from removals
    - Fix any broken imports or references from deleted files
    - _Requirements: 12.8_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Server-side logic (capacity router, surface context builder, tool definitions, DB schema) is preserved unchanged per Requirement 10
- The migration boundary is the streaming wire format and client-side rendering layer

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.4", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "2.6", "2.7", "2.8", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["4.1", "4.2", "6.1"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5", "6.2", "6.3", "7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3", "8.1", "8.2"] },
    { "id": 6, "tasks": ["10.1"] },
    { "id": 7, "tasks": ["10.2"] },
    { "id": 8, "tasks": ["10.3"] }
  ]
}
```
