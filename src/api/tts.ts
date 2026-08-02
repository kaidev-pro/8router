
// 8Router — TTS Media Provider
// Lists available voices from TTS providers

import { Request, Response } from 'express';
import https from 'https';
import http from 'http';

interface Voice {
  id: string;
  name: string;
  provider: string;
  language?: string;
  gender?: string;
  preview_url?: string;
}

// ElevenLabs voices
async function getElevenLabsVoices(apiKey: string): Promise<Voice[]> {
  return new Promise((resolve) => {
    const req = https.get('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const voices = (parsed.voices || []).map((v: any) => ({
            id: v.voice_id,
            name: v.name,
            provider: 'elevenlabs',
            language: v.labels?.language,
            gender: v.labels?.gender,
            preview_url: v.preview_url,
          }));
          resolve(voices);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(5000, () => { req.destroy(); resolve([]); });
  });
}

// Deepgram voices (models)
async function getDeepgramVoices(apiKey: string): Promise<Voice[]> {
  const models = [
    { id: 'aura-asteria-en', name: 'Asteria (EN)', language: 'en', gender: 'female' },
    { id: 'aura-orion-en', name: 'Orion (EN)', language: 'en', gender: 'male' },
    { id: 'aura-luna-en', name: 'Luna (EN)', language: 'en', gender: 'female' },
    { id: 'aura-arcas-en', name: 'Arcas (EN)', language: 'en', gender: 'male' },
    { id: 'aura-athena-en', name: 'Athena (EN)', language: 'en', gender: 'female' },
    { id: 'aura-hermes-en', name: 'Hermes (EN)', language: 'en', gender: 'male' },
    { id: 'aura-orpheus-en', name: 'Orpheus (EN)', language: 'en', gender: 'male' },
    { id: 'aura-zeus-en', name: 'Zeus (EN)', language: 'en', gender: 'male' },
  ];
  return models.map(m => ({ ...m, provider: 'deepgram' }));
}

// MiniMax voices
async function getMiniMaxVoices(apiKey: string): Promise<Voice[]> {
  const voices = [
    { id: 'female-shaonv', name: 'Sweet Girl', language: 'zh', gender: 'female' },
    { id: 'female-yujie', name: 'Elegant Lady', language: 'zh', gender: 'female' },
    { id: 'male-qn-qingse', name: 'Young Man', language: 'zh', gender: 'male' },
    { id: 'male-qn-jingying', name: 'Elite Male', language: 'zh', gender: 'male' },
    { id: 'presenter_male', name: 'Male Presenter', language: 'zh', gender: 'male' },
    { id: 'presenter_female', name: 'Female Presenter', language: 'zh', gender: 'female' },
  ];
  return voices.map(v => ({ ...v, provider: 'minimax' }));
}

// GET /8router/api/tts/voices — list all TTS voices
export async function listTTSVoices(_req: Request, res: Response) {
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;

  const results: Record<string, Voice[]> = {};

  const promises: Promise<void>[] = [];
  
  if (elevenKey) {
    promises.push(getElevenLabsVoices(elevenKey).then(v => { results['elevenlabs'] = v; }));
  }
  if (deepgramKey) {
    promises.push(getDeepgramVoices(deepgramKey).then(v => { results['deepgram'] = v; }));
  }
  if (minimaxKey) {
    promises.push(getMiniMaxVoices(minimaxKey).then(v => { results['minimax'] = v; }));
  }

  await Promise.all(promises);

  const total = Object.values(results).reduce((sum, v) => sum + v.length, 0);

  res.json({
    total_voices: total,
    providers: Object.keys(results).length,
    voices: results,
    available_providers: Object.keys(results),
    missing_providers: ['elevenlabs', 'deepgram', 'minimax'].filter(p => !results[p]),
  });
}

// GET /8router/api/tts/voices/:provider — list voices for specific provider
export async function listProviderVoices(req: Request, res: Response) {
  const { provider } = req.params;
  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];

  if (!apiKey) {
    return res.status(400).json({ error: `No API key for ${provider}` });
  }

  let voices: Voice[] = [];
  switch (provider) {
    case 'elevenlabs': voices = await getElevenLabsVoices(apiKey); break;
    case 'deepgram': voices = await getDeepgramVoices(apiKey); break;
    case 'minimax': voices = await getMiniMaxVoices(apiKey); break;
    default: return res.status(400).json({ error: `Unknown provider: ${provider}` });
  }

  res.json({ provider, voices: voices.length, data: voices });
}
