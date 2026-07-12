# Phase 3A — Production Evidence

## Overview

This directory contains sanitized aggregated evidence for Phase 3A: Shadow Production Validation.

All evidence is aggregated and sanitized — no raw logs, user IDs, access key IDs, provider credentials, IP addresses, or request/response content is stored.

## Evidence Files

| File | Description |
|------|-------------|
| `deployment-summary.md` | Pre-deploy checklist, smoke test results, environment verification |
| `daily-summary-template.md` | Template for daily evidence collection |
| `daily-summary-2026-07-12.md` | Day 1 — Deployment day |
| `kill-switch-drill.md` | Manual kill-switch drill results (pending) |
| `auto-disable-drill.md` | Auto-disable drill results (pending) |
| `retention-validation.md` | Retention cleanup validation (pending) |
| `coverage-summary.md` | Provider/alias/request-type coverage (pending) |
| `final-readiness-report.md` | Final readiness report (pending) |

## Validation Window

| Field | Value |
|-------|-------|
| Start | 2026-07-12 |
| Minimum duration | 7 days |
| Deployed commit | `e951af5` |
| Pre-deploy tag | `pre-phase3a-shadow-production-20260712-151039` |

## Sample Rate History

| Date | Rate | Notes |
|------|------|-------|
| 2026-07-12 | 0.01 (1%) | Stage 1 — Initial deployment |

## Current Status

Phase 3A — Production Validation In Progress

## Requirements for Final Lock

- Validation duration ≥ 7 days
- Compared requests ≥ 10,000
- Unique access keys ≥ 20
- All active providers covered
- All active aliases covered
- Tool-call comparisons ≥ 500
- Streaming comparisons ≥ 1,000
- Critical mismatches = 0
- Non-critical mismatch rate ≤ 0.50%
- p99 comparison overhead ≤ 25 ms
- Experiment-induced failures = 0
- Manual kill-switch drill: PASS
- Auto-disable drill: PASS
- Retention cleanup: PASS
- Security review: PASS
- Readiness report status: READY_FOR_PHASE_3B
