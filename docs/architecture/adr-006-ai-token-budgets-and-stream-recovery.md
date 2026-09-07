# ADR-006: AI Token Budgets And Stream Recovery

**Status**: Accepted  
**Date**: 2026-09-05

## Context

Requo's Agent and Assistant use several free-tier providers. Provider limits
are account- or project-scoped and may include RPM, TPM, input TPM, output TPM,
and daily limits. The previous selector tracked requests but not tokens, while
chat turns resent long histories and could run up to five tool steps. A stream
failure could therefore look like a silent no-reply in the UI.

## Decision

1. Use conservative, environment-configurable per-provider TPM budgets with
   20% headroom. Provider dashboards remain authoritative.
2. Estimate request tokens before model selection and account for the estimate
   in the capacity selector. Track reserved tokens with a one-minute counter.
3. Bound conversational context. Keep the opening message and recent turns,
   and insert a small deterministic summary for omitted messages. Do not call a
   second model solely to summarize context.
4. Limit Agent and Assistant turns to three tool steps and use surface-specific
   output budgets (`600` and `900` tokens respectively).
5. Preserve partial streamed output and expose a retry action in the chat UI.
   Retries are bounded by the client and must not duplicate side-effecting
   operations; high-risk tools continue to require confirmation.
6. Log token estimates, actual usage, provider/model, latency, fallback phase,
   and status without logging raw prompts or responses.

## Consequences

This reduces TPM spikes and makes long sessions predictable while keeping
recent conversational context available. Some older detail may be represented
only by the extractive summary. A deployment must tune `AI_TPM_*` values to its
provider dashboards. Retry controls improve recovery without hiding failures,
but cannot make an unavailable provider available.
