
// 8Router — CLI Tool Settings
// Provides settings endpoints for various CLI tools

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CLIToolConfig {
  name: string;
  configDir: string;
  configFile: string;
  checkCmd: string;
  installed: boolean;
  has8Router: boolean;
  settings: any;
}

// Tool definitions
const TOOLS: Record<string, { configDir: string; configFile: string; checkCmd: string }> = {
  claude: { configDir: '.claude', configFile: 'settings.json', checkCmd: 'which claude' },
  codex: { configDir: '.codex', configFile: 'config.toml', checkCmd: 'which codex' },
  copilot: { configDir: '.config/github-copilot', configFile: 'hosts.json', checkCmd: 'which gh' },
  cline: { configDir: '.config/cline', configFile: 'settings.json', checkCmd: 'which cline' },
  hermes: { configDir: '.hermes', configFile: 'config.yaml', checkCmd: 'which hermes' },
  kilo: { configDir: '.kilo', configFile: 'config.json', checkCmd: 'which kilo' },
  openclaw: { configDir: '.openclaw', configFile: 'openclaw.json', checkCmd: 'which openclaw' },
  opencode: { configDir: '.opencode', configFile: 'config.json', checkCmd: 'which opencode' },
  'deepseek-tui': { configDir: '.deepseek', configFile: 'config.toml', checkCmd: 'which deepseek' },
  droid: { configDir: '.factory', configFile: 'settings.json', checkCmd: 'which droid' },
  jcode: { configDir: '.jcode', configFile: 'config.toml', checkCmd: 'which jcode' },
};

async function checkTool(toolName: string): Promise<CLIToolConfig> {
  const tool = TOOLS[toolName];
  if (!tool) throw new Error(`Unknown tool: ${toolName}`);

  const configDir = path.join(os.homedir(), tool.configDir);
  const configPath = path.join(configDir, tool.configFile);
  
  let installed = false;
  try {
    await execAsync(tool.checkCmd);
    installed = true;
  } catch {
    try {
      await fs.promises.access(configDir);
      installed = true;
    } catch {}
  }

  let settings: any = null;
  let has8Router = false;
  try {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    if (tool.configFile.endsWith('.json')) {
      settings = JSON.parse(content);
    } else {
      settings = { raw: content };
    }
    has8Router = content.includes('8router') || content.includes('8Router') || content.includes('localhost:8080');
  } catch {}

  return { name: toolName, configDir, configFile: configPath, checkCmd: tool.checkCmd, installed, has8Router, settings };
}

// GET /8router/api/cli-tools/:tool
export async function getToolSettings(req: Request, res: Response) {
  try {
    const { tool } = req.params;
    const config = await checkTool(tool);
    res.json(config);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// POST /8router/api/cli-tools/:tool
export async function configureTool(req: Request, res: Response) {
  try {
    const { tool } = req.params;
    const { baseUrl, apiKey } = req.body;
    
    if (!baseUrl) {
      return res.status(400).json({ error: 'baseUrl required' });
    }

    const toolDef = TOOLS[tool];
    if (!toolDef) return res.status(400).json({ error: `Unknown tool: ${tool}` });

    const configDir = path.join(os.homedir(), toolDef.configDir);
    const configPath = path.join(configDir, toolDef.configFile);
    
    await fs.promises.mkdir(configDir, { recursive: true });

    const apiBase = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
    const key = apiKey || 'your-8router-api-key';

    // Generate config based on tool type
    let configContent: string;
    
    if (tool === 'claude') {
      configContent = JSON.stringify({
        apiUrl: apiBase,
        apiKey: key,
        model: '8router/auto'
      }, null, 2);
    } else if (tool === 'codex') {
      configContent = `# 8Router Codex Config\napi_base = "${apiBase}"\napi_key = "${key}"\nmodel = "8router/auto"\n`;
    } else if (tool === 'hermes') {
      configContent = `model:\n  base_url: ${apiBase}\n  api_key: ${key}\n  default: 8router/auto\n  provider: custom\n`;
    } else {
      configContent = JSON.stringify({
        baseUrl: apiBase,
        apiKey: key,
        model: '8router/auto',
        provider: '8router'
      }, null, 2);
    }

    await fs.promises.writeFile(configPath, configContent);

    res.json({ 
      success: true, 
      message: `${tool} configured with 8Router`,
      configPath,
      baseUrl: apiBase
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /8router/api/cli-tools/:tool
export async function removeToolConfig(req: Request, res: Response) {
  try {
    const { tool } = req.params;
    const toolDef = TOOLS[tool];
    if (!toolDef) return res.status(400).json({ error: `Unknown tool: ${tool}` });

    const configPath = path.join(os.homedir(), toolDef.configDir, toolDef.configFile);
    
    try {
      await fs.promises.unlink(configPath);
    } catch {}

    res.json({ success: true, message: `${tool} 8Router config removed` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// GET /8router/api/cli-tools — list all tools
export async function listTools(_req: Request, res: Response) {
  const tools = Object.keys(TOOLS);
  const results = await Promise.all(tools.map(t => checkTool(t).catch(() => ({ name: t, installed: false, has8Router: false }))));
  res.json(results);
}
