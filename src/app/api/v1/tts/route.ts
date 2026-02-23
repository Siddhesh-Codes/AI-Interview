// ============================================================
// API: TTS — Generate speech from text
// POST /api/v1/tts
// Uses browser Speech API fallback on client or direct Edge TTS
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ttsRequestSchema } from '@/types/schemas';
import { generateSpeechDirect } from '@/lib/ai/edge-tts-direct';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 30 TTS requests per minute per IP
    const ip = getClientIp(request);
    const rl = rateLimit('tts', ip, 30, 60_000);
    if (rl.limited) return rateLimitResponse(rl.retryAfterMs);

    const body = await request.json();
    const parsed = ttsRequestSchema.parse(body);

    const result = await generateSpeechDirect(parsed.text, parsed.voice);

    return new NextResponse(new Uint8Array(result.audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': result.mimeType,
        'Content-Length': result.audioBuffer.length.toString(),
        'X-Provider': result.provider,
        'X-Latency-Ms': result.latency_ms.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: unknown) {
    console.error('TTS error:', error);
    // Return a helpful error — client should fall back to browser SpeechSynthesis
    return NextResponse.json(
      { error: 'TTS generation failed. The client will use browser speech synthesis as fallback.', fallback: 'speechSynthesis' },
      { status: 500 },
    );
  }
}
