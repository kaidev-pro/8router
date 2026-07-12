// 8Router — CLI Tool Integrations barrel (Phase 2G)

export type {
  ToolIntegration,
  ToolTemplate,
  ToolCategory,
  ToolStatus,
  ConfigFormat,
  TemplateVariables,
  EnvironmentType,
  SetupState,
  RenderRequest,
  RenderResponse,
  TestConnectionRequest,
  TestConnectionResponse,
  AccessKeyRecord,
} from './types.js';

export {
  SMART_ALIASES,
  DEFAULT_MODEL,
  HOSTED_BASE_URL,
  LOCAL_BASE_URL,
} from './types.js';

export {
  getToolRegistry,
  getToolById,
  getToolsByCategory,
  getAllToolIds,
} from './registry.js';

export {
  renderTemplate,
  renderToolConfig,
} from './render.js';

export {
  validateBaseUrl,
  normalizeBaseUrl,
  validateModel,
  validateAccessKeyFormat,
  type ValidationResult,
} from './validate.js';
