# Provider Model Discovery

## Architecture

`ProviderDiscoveryService` with protocol-specific adapters:
- OpenAI-compatible `/models`
- Gemini model list
- Anthropic static/known catalog fallback
- Local provider model list

## Mock Adapters (Phase 5B)

All adapters return deterministic mock data. No real network calls.

## Discovery Flow

1. Build plan from descriptors (only dynamicModels=true)
2. Select adapter by protocol
3. Adapter returns mock models
4. Normalize result
5. Optional persistence (requires feature flag)

## Safety

- Default: dry-run, network disabled, persistence disabled
- Feature flags all false
- No credential access
- No arbitrary URL fetch
- Base URL from catalog only
- Timeout/abort support
- Response size bound
- Error sanitization
