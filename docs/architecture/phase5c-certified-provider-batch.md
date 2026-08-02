# Phase 5C — Certified Provider Batch Expansion

## Target Providers
- OpenAI Direct (adapter: openai)
- Gemini Direct (adapter: gemini)
- xAI (adapter: xai)
- Cerebras (adapter: openai-compatible)

## Endpoint Policy (SSRF-safe)
Each provider has an allowlist of:
- allowedHosts (e.g., api.openai.com)
- allowedPaths (e.g., /v1/chat/completions)
- requireHttps (true for cloud, false for local)
- maxRedirects (0)
- timeoutMs (30000 cloud, 60000 local)

validateEndpoint() rejects non-HTTPS, non-allowed hosts/paths.

## Certification Profiles
| Profile | Network | Credential | Billable |
|---------|---------|------------|----------|
| dry-run | No | No | No |
| mock | No | No | No |
| live | Yes | Yes | Yes |

11 certification checks defined. Authentication, model_listing, simple_completion, error_mapping are required.

## Discovery Flags
All default false:
- PROVIDER_MODEL_DISCOVERY_ENABLED
- PROVIDER_MODEL_DISCOVERY_NETWORK_ENABLED
- PROVIDER_MODEL_DISCOVERY_PERSIST_ENABLED

canRunDiscovery() checks all flags + provider support.

## Safety
- No routing mutation
- No credential access
- No network calls
- No decrypt
- Endpoint validation is pure function
