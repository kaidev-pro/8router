# Provider Expansion Foundation

## Architecture

Unified provider foundation separating concerns:
- **Descriptor**: Static metadata about each provider
- **Capability Registry**: What each provider can do
- **Model Registry**: Available models (static + dynamic + override)
- **Certification**: Provider readiness status
- **Discovery History**: Model discovery audit trail

## ProviderDescriptor

Unified descriptor built from PROVIDER_CATALOG:
- id, displayName, vendor, protocol, auth, baseUrl, status, tier
- capabilities: chat, vision, image, video, embedding, rerank, speech, tts, moderation, streaming, toolCalling, jsonMode, reasoning
- features: dynamicModels, healthCheck, quota, cost, multiAccount, fallback, benchmark
- metadata: regions, priority, tags, notes, lastDiscovery, lastHealthCheck, lastBenchmark

## Protocol Adapters

Protocols: openai, anthropic, gemini, mistral, cohere, deepseek, xai, together, fireworks, replicate, ollama, lmstudio, vllm, custom, local

Router selects adapter based on ProviderDescriptor.protocol.

## Capability Registry

ProviderCapabilityRegistry:
- supportsChat/Vision/Embedding/Streaming/ToolCalling/JsonMode/Audio/Video/Reasoning
- getProvidersByCapability/Protocol/Status

## Model Registry

ProviderModelRegistry:
- Static catalog from PROVIDER_CATALOG
- Dynamic discovery via addDynamicModel()
- Manual override via addOverride()
- Search by query

## Certification

CertificationStatus: UNKNOWN, EXPERIMENTAL, PARTIAL, CERTIFIED, DEPRECATED, FAILED

Per-provider: chat, streaming, vision, toolCalling, jsonMode, embedding, health, quota, benchmark, discovery

## CLI

- npm run providers:list
- npm run providers:models
- npm run providers:capabilities
- npm run providers:discover (dry-run only)

## Safety

- No routing mutation
- No credential access
- No network calls
- No decrypt
- Static inference only
