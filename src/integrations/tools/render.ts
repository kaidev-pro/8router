// 8Router — Template Renderer (Phase 2G)
// Renders tool config templates with safe variable substitution.
// Never executes templates. Never allows arbitrary template code.

import type { TemplateVariables, RenderRequest, RenderResponse } from './types.js';
import { getToolById } from './registry.js';

const KNOWN_VARIABLES = new Set(['BASE_URL', 'API_KEY', 'MODEL', 'TOKEN_SAVER_MODE']);

/** Escape a value for safe embedding in a given format */
function escapeForFormat(value: string, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(value).slice(1, -1); // escape but don't wrap in quotes
    case 'shell':
      // Single-quote the entire value, escaping internal single quotes
      return "'" + value.replace(/'/g, "'\\''") + "'";
    case 'yaml':
      // Wrap in quotes if it contains special chars
      if (/[:{}\[\],&*?|>!%@`]/.test(value) || value === '') {
        return JSON.stringify(value).slice(1, -1);
      }
      return value;
    case 'env':
      return value;
    case 'code':
      return value;
    default:
      return value;
  }
}

/** Render a template string by replacing {{VAR}} placeholders */
export function renderTemplate(
  template: string,
  vars: TemplateVariables,
  format: string,
): { rendered: string; warnings: string[] } {
  const warnings: string[] = [];

  const rendered = template.replace(/\{\{(\w+)\}\}/g, (match, varName: string) => {
    if (!KNOWN_VARIABLES.has(varName)) {
      warnings.push(`Unknown template variable: ${varName}`);
      return match; // leave unknown variables as-is
    }

    const key = varName as keyof TemplateVariables;
    const value = vars[key];
    if (value === undefined) {
      warnings.push(`Missing template variable: ${varName}`);
      return '';
    }

    return escapeForFormat(value, format);
  });

  return { rendered, warnings };
}

/** Render configuration for a specific tool */
export function renderToolConfig(request: RenderRequest): RenderResponse[] {
  const tool = getToolById(request.toolId);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.toolId}`);
  }

  if (tool.status === 'coming_soon') {
    throw new Error(`Tool "${tool.name}" is coming soon — no templates available`);
  }

  const vars: TemplateVariables = {
    BASE_URL: request.baseUrl,
    API_KEY: request.apiKey,
    MODEL: request.model,
  };

  const results: RenderResponse[] = [];
  const templates = request.templateId
    ? tool.templates.filter(t => t.id === request.templateId)
    : tool.templates;

  if (request.templateId && templates.length === 0) {
    throw new Error(`Unknown template: ${request.templateId} for tool: ${request.toolId}`);
  }

  for (const template of templates) {
    const { rendered } = renderTemplate(template.content, vars, template.format);
    results.push({
      toolId: tool.id,
      templateId: template.id,
      label: template.label,
      format: template.format,
      language: template.language,
      content: rendered,
    });
  }

  return results;
}
