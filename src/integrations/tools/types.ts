// 8Router — CLI Tool Integration Types (Phase 2G)

export type ToolCategory = 'ide' | 'cli' | 'webui' | 'sdk' | 'generic';
export type ToolStatus = 'supported' | 'experimental' | 'partial' | 'coming_soon';
export type ConfigFormat = 'json' | 'yaml' | 'env' | 'shell' | 'ui_steps' | 'code';

export interface ToolIntegration {
  id: string;
  name: string;
  category: ToolCategory;
  status: ToolStatus;
  description: string;
  docsUrl?: string;
  supportsCustomBaseUrl: boolean;
  supportsCustomModel: boolean;
  supportsStreaming: boolean;
  supportsToolCalling?: boolean;
  supportsHeaders?: boolean;
  configFormat: ConfigFormat;
  templates: ToolTemplate[];
  notes?: string[];
}

export interface ToolTemplate {
  id: string;
  label: string;
  format: ConfigFormat;
  language?: string;
  content: string;
  description?: string;
}

export interface TemplateVariables {
  BASE_URL: string;
  API_KEY: string;
  MODEL: string;
  TOKEN_SAVER_MODE?: string;
}

export type EnvironmentType = 'hosted' | 'local' | 'custom';

export interface SetupState {
  environment: EnvironmentType;
  baseUrl: string;
  accessKeyId: string;
  rawApiKey: string;
  model: string;
  toolId: string;
}

export interface RenderRequest {
  toolId: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  templateId?: string;
}

export interface RenderResponse {
  toolId: string;
  templateId: string;
  label: string;
  format: ConfigFormat;
  language?: string;
  content: string;
}

export interface TestConnectionRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  testType: 'models' | 'chat';
}

export interface TestConnectionResponse {
  success: boolean;
  endpointReachable: boolean;
  accessKeyValid: boolean;
  modelsAvailable: boolean;
  modelAvailable: boolean;
  latencyMs: number;
  error?: string;
  errorCode?: string;
}

export interface AccessKeyRecord {
  id: string;
  name: string;
  hint: string;
  isRevoked: boolean;
  isEnabled: boolean;
}

export const SMART_ALIASES: Record<string, string[]> = {
  General: ['8router/auto', '8router/smart', '8router/fast', '8router/cheap'],
  Specialized: ['8router/coding', '8router/creative'],
  'Local & Privacy': ['8router/local', '8router/privacy'],
};

export const DEFAULT_MODEL = '8router/auto';
export const HOSTED_BASE_URL = 'https://8router.8agents.xyz/v1';
export const LOCAL_BASE_URL = 'http://localhost:8081/v1';
