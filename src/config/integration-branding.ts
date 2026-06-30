// 8Router — Integration Branding Registry
// Central source of truth for integration/tool logos, names, and metadata

export interface IntegrationBrand {
  id: string;
  name: string;
  logo: string;
  fallback: string;
  brandColor: string;
  status: 'tested' | 'compatible' | 'coming-soon';
  category: 'ide' | 'cli' | 'web' | 'agent';
  sourceType: 'simple-icons' | 'custom-branded' | 'custom-fallback';
}

export const INTEGRATION_BRANDS: Record<string, IntegrationBrand> = {
  cursor: {
    id: 'cursor', name: 'Cursor', logo: '/assets/integrations/cursor.svg',
    fallback: 'Cu', brandColor: '#00D4AA', status: 'tested', category: 'ide', sourceType: 'simple-icons',
  },
  cline: {
    id: 'cline', name: 'Cline', logo: '/assets/integrations/cline.svg',
    fallback: 'CL', brandColor: '#6C63FF', status: 'tested', category: 'ide', sourceType: 'simple-icons',
  },
  continue: {
    id: 'continue', name: 'Continue', logo: '/assets/integrations/continue.svg',
    fallback: 'Co', brandColor: '#22C55E', status: 'tested', category: 'ide', sourceType: 'custom-branded',
  },
  roocode: {
    id: 'roocode', name: 'Roo Code', logo: '/assets/integrations/roo-code.svg',
    fallback: 'RC', brandColor: '#F97316', status: 'tested', category: 'ide', sourceType: 'custom-branded',
  },
  openwebui: {
    id: 'openwebui', name: 'Open WebUI', logo: '/assets/integrations/open-webui.svg',
    fallback: 'OW', brandColor: '#0EA5E9', status: 'tested', category: 'web', sourceType: 'custom-branded',
  },
  claudecode: {
    id: 'claudecode', name: 'Claude Code', logo: '/assets/integrations/claude-code.svg',
    fallback: 'CC', brandColor: '#D4A27F', status: 'compatible', category: 'cli', sourceType: 'simple-icons',
  },
  codexcli: {
    id: 'codexcli', name: 'Codex CLI', logo: '/assets/integrations/codex-cli.svg',
    fallback: 'Cx', brandColor: '#10A37F', status: 'compatible', category: 'cli', sourceType: 'custom-branded',
  },
  hermesagent: {
    id: 'hermesagent', name: 'Hermes Agent', logo: '/assets/integrations/hermes-agent.svg',
    fallback: 'H', brandColor: '#84ABFF', status: 'tested', category: 'agent', sourceType: 'custom-branded',
  },
};

export function getIntegrationBrand(id: string): IntegrationBrand {
  const key = id.toLowerCase().replace(/[\s-]/g, '');
  return INTEGRATION_BRANDS[key] ?? {
    id: key,
    name: id,
    logo: '',
    fallback: id.slice(0, 2).toUpperCase(),
    brandColor: '#94A3B8',
    status: 'coming-soon',
    category: 'cli',
    sourceType: 'custom-fallback',
  };
}

export function integrationLogoHTML(id: string, size: number = 28): string {
  const brand = getIntegrationBrand(id);
  return `<img src="${brand.logo}" alt="${brand.name}" width="${size}" height="${size}" style="border-radius:6px;object-fit:contain" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'" /><span style="display:none;width:${size}px;height:${size}px;border-radius:6px;background:${brand.brandColor}20;color:${brand.brandColor};font-size:${Math.round(size * 0.38)}px;font-weight:700;align-items:center;justify-content:center">${brand.fallback}</span>`;
}

export function getIntegrationStats() {
  const brands = Object.values(INTEGRATION_BRANDS);
  return {
    total: brands.length,
    tested: brands.filter(b => b.status === 'tested').length,
    compatible: brands.filter(b => b.status === 'compatible').length,
    ide: brands.filter(b => b.category === 'ide').length,
    cli: brands.filter(b => b.category === 'cli').length,
    web: brands.filter(b => b.category === 'web').length,
    agent: brands.filter(b => b.category === 'agent').length,
  };
}
