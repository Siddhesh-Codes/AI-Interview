// ============================================================
// Edge TTS Provider — Unlimited, free, no API key
// Uses Microsoft Edge's neural TTS voices
// ============================================================

import { type TTSResult } from './provider';

// Dynamic loader that bypasses Turbopack static analysis
// (edge-tts ships .ts source files that Turbopack cannot process)
async function loadEdgeTTS(): Promise<any> {
  const mod = 'edge-tts';
  // eslint-disable-next-line no-eval
  return eval(`import('${mod}')`);
}

export async function generateSpeech(
  text: string,
  voice: string = 'en-US-GuyNeural',
): Promise<TTSResult> {
  const start = Date.now();

  const { MsEdgeTTS } = await loadEdgeTTS();

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, 'audio-24khz-96kbitrate-mono-mp3');

  const readable = tts.toStream(text);
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    }
  }

  const audioBuffer = Buffer.concat(chunks);

  return {
    audioBuffer,
    mimeType: 'audio/mpeg',
    provider: 'edge-tts',
    latency_ms: Date.now() - start,
  };
}

// Available professional voices for interviews
export const INTERVIEW_VOICES = {
  'en-US-GuyNeural': 'Guy (US Male, Professional)',
  'en-US-JennyNeural': 'Jenny (US Female, Professional)',
  'en-US-AriaNeural': 'Aria (US Female, Conversational)',
  'en-US-DavisNeural': 'Davis (US Male, Conversational)',
  'en-GB-RyanNeural': 'Ryan (UK Male, Professional)',
  'en-GB-SoniaNeural': 'Sonia (UK Female, Professional)',
  'en-AU-WilliamNeural': 'William (AU Male)',
  'en-IN-PrabhatNeural': 'Prabhat (IN Male)',
} as const;
