// ============================================================
// Free TTS Provider — Google Translate TTS (unlimited, no API key)
// Uses the same public endpoint that Google Translate uses.
// Supports all major languages and produces natural-sounding speech.
// ============================================================

import { type TTSResult } from './provider';
import https from 'https';

/**
 * Generate speech using Google Translate's free TTS endpoint.
 * Splits text into chunks (max 200 chars per request) and concatenates.
 * Reliable, free, no API key needed.
 */
export async function generateSpeechDirect(
  text: string,
  voice: string = 'en-US-AndrewMultilingualNeural',
): Promise<TTSResult> {
  const start = Date.now();

  // Determine language from voice name
  const lang = voice.startsWith('en-IN') ? 'en-in'
    : voice.startsWith('en-GB') ? 'en-gb'
    : voice.startsWith('en-AU') ? 'en-au'
    : 'en-us';

  // Split text into chunks for Google TTS (max ~200 chars per request)
  const chunks = splitTextIntoChunks(text, 200);
  const audioChunks: Buffer[] = [];

  for (const chunk of chunks) {
    const audioData = await fetchGoogleTTS(chunk, lang);
    audioChunks.push(audioData);
  }

  const audioBuffer = Buffer.concat(audioChunks);

  return {
    audioBuffer,
    mimeType: 'audio/mpeg',
    provider: 'google-tts',
    latency_ms: Date.now() - start,
  };
}

function splitTextIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Find the last sentence boundary within maxLen
    let splitIdx = maxLen;
    const lastPeriod = remaining.lastIndexOf('.', maxLen);
    const lastQuestion = remaining.lastIndexOf('?', maxLen);
    const lastExclaim = remaining.lastIndexOf('!', maxLen);
    const lastComma = remaining.lastIndexOf(',', maxLen);
    const lastSpace = remaining.lastIndexOf(' ', maxLen);

    const best = Math.max(lastPeriod, lastQuestion, lastExclaim);
    if (best > maxLen * 0.3) {
      splitIdx = best + 1;
    } else if (lastComma > maxLen * 0.3) {
      splitIdx = lastComma + 1;
    } else if (lastSpace > 0) {
      splitIdx = lastSpace;
    }

    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }

  return chunks.filter(c => c.length > 0);
}

function fetchGoogleTTS(text: string, lang: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const path = `/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

    const options = {
      hostname: 'translate.google.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    };

    const req = https.request(options, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (location) {
          const url = new URL(location);
          fetchGoogleTTSFromURL(url).then(resolve).catch(reject);
          return;
        }
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode === 200 && chunks.length > 0) {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 100) {
            resolve(buffer);
          } else {
            reject(new Error(`TTS response too small: ${buffer.length} bytes`));
          }
        } else {
          reject(new Error(`Google TTS failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Google TTS request timed out'));
    });

    req.end();
  });
}

function fetchGoogleTTSFromURL(url: URL): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`TTS redirect failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Available professional voices (mapped to browser SpeechSynthesis names)
// Server-side uses Google TTS with language variants
// Client-side falls back to browser's built-in voices
export const INTERVIEW_VOICES: Record<string, string> = {
  'en-US-AndrewMultilingualNeural': 'Andrew (Male, Professional)',
  'en-US-AvaMultilingualNeural': 'Ava (Female, Professional)',
  'en-US-BrianMultilingualNeural': 'Brian (Male, Conversational)',
  'en-US-EmmaMultilingualNeural': 'Emma (Female, Conversational)',
  'en-US-GuyNeural': 'Guy (US Male)',
  'en-US-JennyNeural': 'Jenny (US Female)',
  'en-GB-RyanNeural': 'Ryan (British Male)',
  'en-GB-SoniaNeural': 'Sonia (British Female)',
  'en-AU-WilliamNeural': 'William (Australian Male)',
  'en-AU-NatashaNeural': 'Natasha (Australian Female)',
  'en-IN-PrabhatNeural': 'Prabhat (Indian Male)',
  'en-IN-NeerjaNeural': 'Neerja (Indian Female)',
} as const;
