# Changelog

All notable changes to 8Router will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2025-07-05

### Fixed
- Dashboard JavaScript syntax errors (TypeScript annotations in inline scripts)
- Template literal escaping for `provLogo()` onerror attribute
- Test count inconsistency (41 → 43)
- Security headers in nginx (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy)
- X-Powered-By header now hidden

### Added
- Systemd service for 8Router (`8router.service`)
- Prominent security warning for public deployments
- Demo Data label on landing page dashboard preview
- Exponential backoff for circuit breaker (3min base, capped at 30min)
- Secret masking in logger error paths
- Changelog (this file)
- License disclosure (MIT)

### Changed
- Headline now highlights: Circuit Breaker, Key Pool Health, Latency Benchmark
- "Soon" providers are visually faded (opacity 0.5)
- Beta features now have descriptive tooltip

## [0.6.0] - 2025-07-01

### Added
- Initial release
- 12 provider support (Active: OpenAI, Anthropic, Gemini, Groq, OpenRouter, Mistral)
- Beta providers: DeepSeek, Together AI
- Local providers: Ollama, LM Studio, vLLM
- Circuit breaker pattern
- Key pool health monitoring
- Latency benchmarking (p50/p95/p99)
- 3-tier fallback (Premium → Efficient → Local)
- Dashboard with usage analytics
- i18n support (EN, ID, JA)

## [Unreleased]

### Planned
- xAI provider support
- Cohere provider support
- Perplexity provider support
- Embeddings support
- Image generation support
