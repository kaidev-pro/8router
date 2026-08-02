
// 8Router — MCP (Model Context Protocol) Server
// SSE + Message endpoints for MCP plugin support

import { Request, Response } from 'express';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPPlugin {
  name: string;
  version: string;
  tools: MCPTool[];
}

// Registry of MCP plugins
const mcpPlugins: Map<string, MCPPlugin> = new Map();

// Register a plugin
export function registerMCPPlugin(plugin: MCPPlugin) {
  mcpPlugins.set(plugin.name, plugin);
}

// GET /8router/api/mcp/plugins — list available plugins
export function listMCPPlugins(_req: Request, res: Response) {
  const plugins = Array.from(mcpPlugins.values()).map(p => ({
    name: p.name,
    version: p.version,
    tools: p.tools.length,
  }));
  res.json({ plugins, total: plugins.length });
}

// GET /8router/api/mcp/:plugin/sse — SSE endpoint for MCP
export function mcpSSE(req: Request, res: Response) {
  const { plugin } = req.params;
  const pluginData = mcpPlugins.get(plugin);

  if (!pluginData) {
    return res.status(404).json({ error: `Plugin ${plugin} not found` });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial capabilities
  const capabilities = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: '8router-mcp',
        version: '1.0.0',
      },
    },
  };
  res.write(`data: ${JSON.stringify(capabilities)}\n\n`);

  // Send tools list
  const toolsList = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {
      tools: pluginData.tools,
    },
  };
  res.write(`data: ${JSON.stringify(toolsList)}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
}

// POST /8router/api/mcp/:plugin/message — handle MCP messages
export function mcpMessage(req: Request, res: Response) {
  const { plugin } = req.params;
  const pluginData = mcpPlugins.get(plugin);

  if (!pluginData) {
    return res.status(404).json({ error: `Plugin ${plugin} not found` });
  }

  const message = req.body;
  
  // Handle tool calls
  if (message.method === 'tools/call') {
    const toolName = message.params?.name;
    const tool = pluginData.tools.find(t => t.name === toolName);
    
    if (!tool) {
      return res.json({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: `Tool ${toolName} not found` },
      });
    }

    // Echo back for now (tool execution would happen here)
    res.json({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [{ type: 'text', text: `Tool ${toolName} called (8router MCP)` }],
      },
    });
  } else {
    res.json({
      jsonrpc: '2.0',
      id: message.id,
      result: {},
    });
  }
}

// Register default 8router tools
registerMCPPlugin({
  name: '8router',
  version: '1.0.0',
  tools: [
    {
      name: 'list_models',
      description: 'List available AI models in 8Router',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'chat_completion',
      description: 'Send a chat completion request through 8Router',
      inputSchema: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Model to use' },
          messages: { type: 'array', description: 'Chat messages' },
        },
        required: ['model', 'messages'],
      },
    },
    {
      name: 'list_providers',
      description: 'List configured AI providers',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'health_check',
      description: 'Check 8Router service health',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
});
