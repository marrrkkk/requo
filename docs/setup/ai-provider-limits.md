# AI Provider Limits

Requo routes free-tier traffic using conservative local budgets. These values
are intentionally below provider limits and can be overridden with `AI_TPM_*`
environment variables. The provider dashboard for the active project or
organization is authoritative.

| Provider | Requo default TPM budget | Limit source |
| --- | ---: | --- |
| Groq | 8,000 | [Rate limits](https://console.groq.com/docs/rate-limits) |
| Cerebras | 200,000 | [Inference docs](https://inference-docs.cerebras.ai/) |
| Gemini | 32,000 | [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) |
| Mistral | 500,000 | [La Plateforme tiers](https://docs.mistral.ai/deployment/laplateforme/tier/) |
| Cloudflare Workers AI | 10,000 | [Platform limits](https://developers.cloudflare.com/workers-ai/platform/limits/) |
| NVIDIA NIM | 20,000 | [NVIDIA API docs](https://docs.api.nvidia.com/nim/) |
| OpenRouter | 20,000 | [OpenRouter docs](https://openrouter.ai/docs) |

Provider model catalogs and free-model availability change frequently. Keep
model IDs in `lib/ai/model-options.ts` and `lib/ai/capacity-selector.ts` aligned
with the provider's current catalog; a model that appears in a public catalog
may still be unavailable to a specific account.

## Tuning

Set only the providers you use, for example:

```text
AI_TPM_GROQ=6000
AI_TPM_CEREBRAS=100000
```

Requo reserves 20% headroom from each configured value, compacts long chat
context, and tracks estimated tokens for one-minute routing decisions. This is
protection against avoidable bursts, not a replacement for provider-side quota
handling.
