# Grounded AI Quote Generator Implementation Plan

Status: implementation specification
Audience: coding agents and engineers implementing the quote-generation accuracy work

## 1. Objective

Make AI quote generation trustworthy for owner-led service businesses.

The generator must:

- Use business knowledge when relevant and expose the evidence used.
- Never invent a non-zero price.
- Never treat free-form knowledge or an old quote as monetary authority.
- Produce a useful scope-only draft when pricing or requirements are incomplete.
- Preserve review state after the draft is saved and reloaded.
- Require explicit owner acknowledgement before sending when critical uncertainty remains.

The target workflow is:

```text
inquiry -> facts and missing details -> knowledge/pricing retrieval
         -> grounded draft -> deterministic verification
         -> owner review -> acknowledgement -> send
```

This plan covers both initial quote generation and quote improvement/revision.

## 2. Current Problems To Fix

The current implementation in `features/ai/quote-generator.ts` has these correctness gaps:

1. The UI claims that saved knowledge is used, but the quote path assembles only inquiry, brief, revision, current-item, and pricing-library context.
2. Every normalization path passes `hasMemory: false`; model-claimed `business_memory` pricing is therefore rejected, and no memory is retrieved.
3. A model can cite a real pricing-library label while returning an invented price. The server checks the label but not the exact source item price.
4. The prompt encourages “partial name” and “related service” matches, which increases false positives.
5. The full pricing library is string-formatted and truncated at 4,000 characters; later entries can silently disappear.
6. Cache keys include entry IDs but not item values, update timestamps, or content hashes, so edited prices can return stale drafts.
7. The prompt version is based on string length, which can collide for different prompt contents.
8. The current quality gate detects uncertainty phrases in chat responses, not quote grounding failures.
9. AI review metadata is primarily client state. It is not sufficient for later send authorization after a quote is saved and reloaded.
10. There is no direct test suite for source validation, exact price hydration, stale-cache behavior, or hallucination rejection.

Do not solve these by merely changing models or adding prompt text. The model must lose authority over prices and unsupported facts.

## 3. Non-Negotiable Product Rules

### 3.1 Monetary authority

Only active, business-scoped pricing-library records may authorize a non-zero generated price.

Allowed monetary source:

- `quote_library_entries` and `quote_library_entry_items`, with matching business and currency.

Context-only sources:

- `business_memories` content, including legacy `pricing_knowledge` category.
- Prior quotes.
- Inquiry text.
- Owner brief.

Context-only sources may influence wording, scope, exclusions, or clarification questions. They must never directly provide a generated price.

The model must return source identifiers or `null`; it must not author authoritative prices.

### 3.2 Empty knowledge

When the business has no knowledge entries or files, generation must continue if the inquiry or owner brief contains usable facts.

The result must:

- Use only explicitly stated facts.
- Avoid invented deliverables, materials, timelines, terms, exclusions, taxes, discounts, or assumptions.
- Set unmatched prices to zero.
- Ask targeted clarification questions.
- Be marked `scope_only` or `needs_confirmation`, never silently `ready`.

When there is no usable inquiry or brief, return a structured clarification error rather than an empty fake quote.

### 3.3 Incomplete scope and sending

Critical missing information must be persisted with the quote.

The owner may send only after either:

- resolving the critical questions, or
- explicitly acknowledging that the remaining uncertainty is acceptable.

Zero-priced items remain a hard send blocker. Suggested pricing matches require owner confirmation.

### 3.4 Match conservatism

Use exact deterministic matches for automatic verification. Non-exact model-selected candidates are suggestions requiring owner confirmation. No “related service” match may silently become a verified price.

## 4. Target Data Model

### 4.1 Restore existing manual knowledge schema

The initial migration contains a `business_memories` table, but the current schema barrel and feature implementation do not expose it. Restore it in `lib/db/schema` with the existing columns and constraints:

- `id`
- `businessId`
- `title`
- `content`
- `position`
- `category`
- `embedding` as nullable `number[]` JSONB
- `createdAt`
- `updatedAt`

Keep legacy categories readable. The UI should use these contextual categories:

- `business_rules`
- `customer_context`
- `workflow_preferences`
- `pricing_knowledge` (legacy/context-only; never monetary authority)

Do not delete or rewrite existing rows during the initial rollout.

### 4.2 Add uploaded knowledge-file tables

Create a new migration for two business-scoped tables.

#### `business_knowledge_files`

Required fields:

- `id` primary key
- `businessId` foreign key with cascade delete
- `originalFileName`
- `storagePath`
- `mimeType`
- `byteSize`
- `status`: `pending | processing | ready | failed`
- `extractedCharacterCount`
- `failureReason` nullable
- `createdAt`
- `updatedAt`

Constraints and indexes:

- Business/status index.
- Business/created-at index.
- Storage path unique index.
- Maximum file size enforced in the action and repeated in the background processor.

#### `business_knowledge_chunks`

Required fields:

- `id` primary key
- `businessId` foreign key with cascade delete
- `fileId` foreign key with cascade delete
- `position`
- `content`
- `contentHash`
- `embedding` nullable JSONB `number[]`
- `tokenEstimate`
- `createdAt`
- `updatedAt`

Constraints and indexes:

- Business/file/position index.
- Unique file/position index.
- Business/content-hash index for diagnostics and deduplication.

Manual memory rows can be retrieved as one evidence chunk. Uploaded files are represented by ordered chunks.

### 4.3 Persist quote provenance and readiness

Add quote-level AI metadata sufficient to survive reloads:

- `aiReadiness`: `ready | needs_confirmation | scope_only | null`
- `aiMissingInfo`: JSONB array of `{ label, question, critical }`
- `aiAcknowledgedAt` nullable
- `aiAcknowledgedBy` nullable user ID
- `aiGenerationId` nullable correlation ID

Add quote-item-level provenance:

- `aiPricingStatus`: `verified | suggested | unpriced | owner_set | null`
- `aiPricingLibraryEntryId` nullable
- `aiPricingLibraryItemId` nullable
- `aiEvidence` JSONB containing source references and reason

Existing manually created and historical quotes remain valid with null AI metadata.

When a user edits an AI line item description or price, set `aiPricingStatus = owner_set` and clear stale source evidence.

## 5. Knowledge Ingestion

### 5.1 Supported inputs

Support in the first release:

- Manual title/content entries.
- PDF files.
- CSV files.
- Plain text files.
- Markdown files.

Use the existing 5 MB upload convention. Reject DOCX until deterministic extraction is implemented; do not advertise it in the file input accept list.

Use existing `features/importer` extraction and validation patterns where applicable, but do not import pricing automatically from a knowledge upload.

### 5.2 Manual entry flow

Implement business-scoped actions and queries in `features/memory` or the current feature ownership convention:

1. Authenticate with Better Auth and resolve business context.
2. Check the `knowledgeBase` entitlement and source-count limit.
3. Validate title, content, category, and length with Zod.
4. Sanitize content with `sanitizeMemoryContent` before persistence.
5. Generate an embedding for `title + newline + content`.
6. Insert even if embedding generation fails; store a null embedding and expose lexical fallback behavior.
7. Revalidate business knowledge cache tags.

Updates must invalidate the old embedding cache, replace content, and generate a new embedding. Deletes must remove the record and invalidate its embedding cache.

### 5.3 File upload flow

Implement a server action or route handler with this sequence:

1. Resolve authenticated business context.
2. Check source-count and upload-size limits.
3. Validate MIME type, extension, filename length, and byte size.
4. Generate a business-scoped storage path that does not trust the original filename.
5. Upload to the private Supabase `knowledge-files` bucket.
6. Insert a `pending` file row.
7. Send an Inngest processing event containing only the file ID and business ID.
8. Return the file ID and `pending` status.

The action must never expose the service-role key or create public URLs.

### 5.4 Background processing

The Inngest processor must:

1. Re-check business ownership and file existence.
2. Mark the file `processing`.
3. Download the private object server-side.
4. Extract text:
   - CSV/TXT/Markdown: deterministic UTF-8 decoding and normalization.
   - PDF: deterministic server-side text extraction; preserve page boundaries where available.
5. Reject empty or excessively large extracted content.
6. Sanitize extracted text for prompt-injection patterns before indexing.
7. Chunk into approximately 800-token chunks with approximately 100-token overlap.
8. Generate embeddings in batches of no more than 20.
9. Replace previous chunks transactionally.
10. Mark the file `ready` or `failed` with a safe user-facing failure reason.

A processing failure must not delete the uploaded source. The UI must expose retry and delete actions.

### 5.5 Limits

Count manual entries and uploaded files together as knowledge sources:

- Free: 5 sources.
- Pro: 10 sources.
- Business: 50 sources.

The first release uses the existing plan system, adding `knowledgeBase` to all plans. Keep file size at 5 MB per file. Use the existing plan feature/paywall components for limit messaging.

## 6. Retrieval Contracts

### 6.1 Embedding service

Implement `lib/ai/embeddings.ts` with:

```ts
generateEmbedding(text: string): Promise<number[] | null>
generateEmbeddings(texts: string[]): Promise<Array<number[] | null>>
invalidateEmbeddingCache(text: string): Promise<void>
cosineSimilarity(a: number[], b: number[]): number
```

Use Gemini `gemini-embedding-001` with 768 dimensions and a 24-hour content-hash cache. Provider failure is non-fatal.

### 6.2 Knowledge retriever

Implement:

```ts
type KnowledgeEvidence = {
  sourceType: "manual_memory" | "uploaded_file";
  sourceId: string;
  chunkId: string;
  title: string;
  content: string;
  score: number;
  confidence: "high" | "medium" | "low";
};

retrieveBusinessKnowledge(input: {
  businessId: string;
  queryText: string;
  topK?: number;
  tokenBudget?: number;
  categories?: string[];
}): Promise<{
  evidence: KnowledgeEvidence[];
  usedRag: boolean;
}>;
```

Retrieval rules:

- Scope every query by `businessId`.
- Load manual memories and ready file chunks only.
- Generate a query embedding when possible.
- Combine cosine similarity with lexical keyword boost.
- Apply a conservative threshold; do not force a low-quality result.
- Apply category filtering before token budgeting.
- Use top six evidence records and a combined token budget of approximately 1,800.
- Return empty evidence for empty knowledge, blank query, failed embedding, or no qualifying match.
- Include source and chunk IDs in the assembled prompt and final draft.

### 6.3 Pricing candidate retrieval

Do not send the entire pricing library as an unbounded string.

Build normalized candidates from:

- Entry ID and name.
- Entry kind.
- Entry description.
- Item ID and item description.
- Currency.
- Quantity rules.

Retrieve a small candidate set using normalized lexical matching, with optional embeddings for ranking. The candidate payload sent to the model must include identifiers and descriptions, but the model must not be trusted to provide prices.

## 7. Grounded Quote Pipeline

### 7.1 Stage A: requirement extraction

Create a schema-constrained extraction step containing:

- Customer and service facts explicitly present.
- Requested services/items.
- Quantities and units.
- Deadlines and constraints.
- Explicit owner instructions.
- Critical missing information.
- Unsupported assumptions to avoid.

Use inquiry context plus the sanitized owner brief. Do not include unrelated business data.

### 7.2 Stage B: evidence retrieval

Use the extracted requirements and inquiry text to retrieve:

- Knowledge evidence for services, policies, exclusions, wording, and terms.
- Pricing candidates from the pricing library.

Do not use knowledge retrieval as a price lookup.

### 7.3 Stage C: structured draft generation

Replace the current free-form JSON extraction/repair path with schema-native structured output supported by the installed AI SDK. Read the installed Next and AI SDK documentation before implementation.

The model output may contain:

- Quote title.
- Customer-facing notes.
- Internal rationale.
- Line-item description and quantity.
- Selected pricing candidate IDs or null.
- Match type: `exact`, `suggested`, or `none`.
- Reason for the line item.
- Missing-information questions.
- Knowledge citation IDs.

The model output must not contain an authoritative unit price.

### 7.4 Stage D: deterministic hydration and verification

For every item:

1. Validate the selected entry and item IDs against the retrieved business-scoped candidates.
2. Validate currency against the business currency.
3. Load the current price and quantity from the database.
4. Apply the saved price, never the model’s price.
5. Require exact normalized matching for `verified` status.
6. Mark non-exact valid selections as `suggested` and require owner confirmation.
7. Mark missing/invalid candidates as `unpriced` with zero price.
8. Expand packages from canonical saved package items.
9. Reject duplicated package rows and unsupported standalone rows.
10. Validate every knowledge citation against retrieved evidence.

Run a verifier over the final draft to detect unsupported claims, invented terms, invalid IDs, invalid prices, wrong currency, and missing source evidence. Attempt one constrained repair only; otherwise return a safe failure.

### 7.5 Readiness calculation

Calculate readiness on the server:

- `ready`: all line items have verified or owner-set prices, no critical questions, and no pending evidence.
- `needs_confirmation`: suggested matches or critical questions remain.
- `scope_only`: one or more required line items are unpriced or the request lacks sufficient pricing coverage.

Do not trust a model-provided readiness value.

## 8. Quote Editor And Send UX

### 8.1 Editor

Show separate states for:

- Verified pricing: source name and saved price.
- Suggested pricing: source candidate, reason, and owner confirmation control.
- Unpriced scope: zero price, reason, and action to insert/save pricing.
- Knowledge citations: expandable evidence title and excerpt.
- Missing information: critical versus non-critical questions.

When the owner edits a generated item description or price, clear AI verification and mark the item owner-set. Preserve the owner’s current value.

### 8.2 Save behavior

Persist AI metadata with the quote and quote items. Do not rely on `aiReview` client state for later safety decisions.

Save the generation correlation ID for observability and support diagnostics.

### 8.3 Send behavior

The existing hard block for zero-priced items remains.

Before sending a quote with suggested prices or critical questions:

- Show the unresolved items/questions.
- Require an explicit acknowledgement checkbox.
- Persist acknowledgement user ID and timestamp.
- Write an audit event.

Manual historical quotes with null AI metadata follow existing send behavior.

## 9. Cache And Invalidation

Replace the current cache key inputs with:

- Fixed semantic prompt version.
- Hash of the complete prompt template.
- Inquiry ID plus updated timestamp and relevant content hash.
- Owner brief and revision comment hash.
- Current item JSON hash.
- Pricing entry/item IDs, update timestamps, currency, descriptions, quantities, and prices.
- Retrieved knowledge source/chunk content hashes.

Cache only the final verified draft. Do not cache an unverified raw model response as the authoritative result.

Invalidate quote-generation caches when:

- A pricing entry or item is created, updated, or deleted.
- A manual memory changes.
- A file changes processing status or chunks.
- The linked inquiry changes.

Use existing business cache-tag helpers and add a knowledge tag alongside pricing tags.

## 10. API And Type Changes

Add or update these contracts:

```ts
type AiQuoteReadiness = "ready" | "needs_confirmation" | "scope_only";
type AiPricingStatus = "verified" | "suggested" | "unpriced" | "owner_set";

type AiQuotePricingEvidence = {
  entryId: string | null;
  itemId: string | null;
  sourceLabel: string | null;
  matchType: "exact" | "suggested" | "none";
  reason: string;
};

type AiQuoteKnowledgeCitation = {
  sourceType: "manual_memory" | "uploaded_file";
  sourceId: string;
  chunkId: string;
  title: string;
};
```

Update `AiQuoteDraft`, `AiQuoteDraftItem`, quote editor values, quote mutation input, quote send validation, and server action state to carry readiness, citations, pricing evidence, and acknowledgement state.

Add business-scoped knowledge actions/queries and file-processing events. Every external input uses Zod validation.

## 11. Migration And Rollout Order

### Phase 1: schema and dormant-memory restoration

- Restore the `business_memories` Drizzle module and barrel export.
- Add file/chunk tables and quote provenance columns in a new migration.
- Add indexes, constraints, and business-scoped query helpers.
- Add `knowledgeBase` entitlement and plan limits.

### Phase 2: knowledge CRUD and files

- Implement manual-memory CRUD.
- Implement private upload/delete/list actions.
- Implement asynchronous extraction and embedding.
- Build the settings knowledge UI.
- Backfill existing memory embeddings.

### Phase 3: retrieval and grounded generator

- Implement embedding service and hybrid retriever.
- Implement pricing candidate retrieval.
- Replace model-authored prices with source-ID output and deterministic hydration.
- Add final verifier and readiness calculation.
- Apply the same pipeline to quote improvement/revision.

### Phase 4: persistence and send safety

- Persist quote/item provenance.
- Update editor review states and citation display.
- Add acknowledgement flow and audit events.
- Correct generator copy and empty-state messaging.

### Phase 5: cache, metrics, and evaluation

- Replace stale cache fingerprints.
- Add cache invalidation hooks.
- Add structured AI grounding metrics.
- Run the evaluation fixture set and enable rollout gates.

## 12. Failure Modes And Required Behavior

| Failure | Required behavior |
|---|---|
| No knowledge sources | Continue with explicit inquiry facts; return scope-only or clarification state. |
| File still processing | Exclude it from retrieval and show processing status. |
| File extraction fails | Keep the source, show retryable failure, continue without it. |
| Embedding provider fails | Use lexical retrieval; never fail the whole quote solely because embeddings failed. |
| No pricing candidates | Add zero-priced scope items and targeted pricing questions. |
| Model selects unknown source ID | Mark item unpriced and log verifier failure. |
| Model returns a price | Ignore it; hydrate from the selected library item or zero it. |
| Candidate currency differs | Mark unpriced; do not convert automatically. |
| Package selected | Expand from canonical package rows and discard model package rows. |
| Stale cache detected | Content/version fingerprints force a fresh generation. |
| Knowledge contains prompt injection | Sanitize before persistence/retrieval and keep evidence out if unsafe. |
| User edits generated price | Mark owner-set and clear stale AI source status. |
| Critical questions unresolved | Require acknowledgement before send. |

## 13. Testing Requirements

### Unit tests

- Manual memory validation and sanitization.
- File type, filename, and size validation.
- Chunking and token-budget behavior.
- Cosine similarity and lexical boost ranking.
- Empty retrieval and embedding-failure fallback.
- Exact versus suggested pricing match classification.
- Source ID, business ID, and currency validation.
- Deterministic price hydration and package expansion.
- Unsupported model prices are ignored.
- Cache keys change when prices, descriptions, prompts, or knowledge content change.
- Readiness calculation for every state.

### Integration tests

- Business-scoped manual-memory CRUD.
- Plan source limits across free/pro/business.
- Private upload, processing, retry, and deletion.
- Cross-business source rejection.
- Existing memory embedding backfill.
- Quote provenance persistence and reload.
- Owner acknowledgement audit event.
- Send rejection for zero-priced items.
- Send acknowledgement requirement for suggested/critical states.
- Pricing mutation invalidates generated-draft cache.

### Component tests

- Knowledge list, upload, processing, retry, and failure states.
- Verified/suggested/unpriced line-item presentation.
- Citation display.
- Critical-question acknowledgement.
- Clearing verification when an owner edits an item.

### E2E tests

Cover this smoke journey:

1. Create or use a business with empty knowledge and pricing.
2. Generate a scope-only draft from an inquiry.
3. Add a manual knowledge entry and pricing-library item.
4. Generate again and verify citation plus exact saved price.
5. Upload a supported knowledge file and wait for ready state.
6. Generate a draft using file evidence.
7. Confirm a suggested pricing match.
8. Resolve or acknowledge a critical question.
9. Save, reload, and send.

### Evaluation fixture

Create at least 40 anonymized quote cases covering:

- Exact library match.
- Similar but wrong service.
- No pricing.
- Empty knowledge.
- Conflicting knowledge.
- Package expansion.
- Changed pricing after a prior generation.
- Missing quantities.
- Ambiguous deadlines.
- Prompt-injection text in inquiry and knowledge.
- File extraction failures.
- Cross-currency candidates.

Release gates:

- Zero accepted non-zero prices without a valid pricing-library source.
- Zero cross-business evidence.
- 100% stale-price cache invalidation.
- All uncertain matches classified as suggested or unpriced.
- No unsupported critical terms silently presented as facts.

## 14. Verification Commands

After implementation, run in this order:

```bash
npm run db:generate -- --name grounded_quote_knowledge
npm run db:migrate
npm run check
npm run test
npm run test:integration
npm run build
npm run test:e2e:smoke
```

For route and instant-navigation changes, read the relevant guides under `node_modules/next/dist/docs/` before implementation and confirm every new page has a synchronous structural shell with Suspense-wrapped data regions.

## 15. Assumptions

- Text entries and PDF/CSV/TXT/Markdown files are the first supported knowledge inputs.
- DOCX is intentionally deferred until deterministic extraction is available.
- All plans receive knowledge access with source-count limits of 5/10/50.
- Gemini `gemini-embedding-001` is the primary embedding model; lexical fallback is mandatory.
- Pricing-library records are the only monetary authority.
- Past quotes and knowledge remain contextual only.
- Existing historical quotes are not retroactively assigned AI readiness.
- Existing manually created quotes remain sendable under current behavior.
- File processing is eventually consistent; files not yet ready are excluded from retrieval.
- AI output is never accepted solely because it is syntactically valid JSON or because a source label exists.
