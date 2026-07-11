// 8Router — GET /v1/models
// OpenAI-compatible model list

import type { Request, Response } from 'express';
import { authenticateRequest } from './auth.js';
import { isAlias, resolveModelAlias, getDefaultModel } from './provider-select.js';
import { getAllCredentials } from '../security/credentials/credential-manager.js';

const MODEL_ALIASES = [
  '8router/auto',
  '8router/cheap',
  '8router/fast',
  '8router/smart',
  '8router/coding',
  '8router/local',
  '8router/creative',
  '8router/privacy',
];

// Common direct models to expose
const KNOWN_MODELS: Array<{ id: string; provider: string }> = [
  { id: 'gpt-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', provider: 'openai' },
  { id: 'gpt-4.1-mini', provider: 'openai' },
  { id: 'gpt-4.1-nano', provider: 'openai' },
  { id: 'claude-3.5-sonnet', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic' },
  { id: 'llama-3.1-8b-instant', provider: 'groq' },
  { id: 'llama-3.3-70b-versatile', provider: 'groq' },
  { id: 'deepseek-chat', provider: 'deepseek' },
  { id: 'deepseek-reasoner', provider: 'deepseek' },
  { id: 'mistral-large-latest', provider: 'mistral' },
  { id: 'llama3.1', provider: 'ollama' },
];

export function handleModels(req: Request, res: Response): void {
  // Auth
  const auth = authenticateRequest(req);
  if (!auth.ok) {
    res.status(auth.httpStatus).json(auth.error);
    return;
  }

  const ctx = auth.ctx;
  const data: any[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Add model aliases
  for (const alias of MODEL_ALIASES) {
    data.push({
      id: alias,
      object: 'model',
      created: now,
      owned_by: '8router',
    });
  }

  // Get user's connected providers
  const creds = getAllCredentials();
  const enabledProviders = new Set(
    creds.filter(c => c.isEnabled && c.status !== 'disabled').map(c => c.provider)
  );

  // Add known models for connected providers
  for (const m of KNOWN_MODELS) {
    if (enabledProviders.has(m.provider)) {
      // Skip allowedModels check for direct models — aliases handle policy
      data.push({
        id: m.id,
        object: 'model',
        created: now,
        owned_by: m.provider,
      });
    }
  }

  res.json({ object: 'list', data });
}
