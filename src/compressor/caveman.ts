// 8Router — Caveman Mode
// Output token compression by injecting terse system prompts
// Saves up to 65% output tokens

import type { ChatCompletionRequest } from '../types.js';

const CAVEMAN_PROMPTS: Record<number, string> = {
  1: 'Be concise. Use short sentences.',
  2: 'Be very brief. One-line answers preferred. Skip pleasantries.',
  3: 'Ultra-concise mode. Single words or short phrases. No full sentences. No explanations unless asked.',
  4: 'Caveman mode. Grunt-style answers. Keywords only. Think telegram charges per word.',
  5: 'Wenyan mode. Classical Chinese terseness. Single character answers where possible. Maximum compression.',
};

export function applyCaveman(req: ChatCompletionRequest, level: number): ChatCompletionRequest {
  if (level < 1 || level > 5) return req;
  
  const cavemanPrompt = CAVEMAN_PROMPTS[level] || CAVEMAN_PROMPTS[3];
  
  // Add caveman instruction to system message
  const messages = [...req.messages];
  const systemIdx = messages.findIndex(m => m.role === 'system');
  
  if (systemIdx >= 0) {
    messages[systemIdx] = {
      ...messages[systemIdx],
      content: `${messages[systemIdx].content}\n\n${cavemanPrompt}`
    };
  } else {
    messages.unshift({
      role: 'system',
      content: cavemanPrompt
    });
  }
  
  return { ...req, messages };
}

export function getCavemanDescription(level: number): string {
  const descriptions: Record<number, string> = {
    0: 'Disabled',
    1: 'Mild — Short sentences',
    2: 'Medium — One-line answers',
    3: 'Aggressive — Keywords only',
    4: 'Extreme — Caveman grunts',
    5: 'Maximum — Classical Chinese compression',
  };
  return descriptions[level] || 'Unknown';
}
