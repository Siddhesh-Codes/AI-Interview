// ============================================================
// Groq Provider — Free tier: 30 RPM, 14.4K req/day
// Handles: STT (Whisper) + Evaluation (Llama 3.3 70B)
// ============================================================

import Groq from 'groq-sdk';
import {
  type AIProviderInterface,
  type STTResult,
  type EvaluationResult,
  buildEvaluationPrompt,
  clampScore,
  parseEvaluationJSON,
  getDefaultEvaluation,
} from './provider';

const MODELS = {
  stt: 'whisper-large-v3-turbo',
  evaluation: 'llama-3.3-70b-versatile',
  evaluationFallback: 'llama-3.1-8b-instant',
} as const;

const EVAL_TIMEOUT_MS = 15_000; // 15-second timeout per AI call

function getClient(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export const groqProvider: AIProviderInterface = {
  name: 'groq',

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<STTResult> {
    const start = Date.now();
    const client = getClient();

    // Groq Whisper expects a File-like object
    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp3') ? 'mp3' : 'webm';
    const file = new File([new Uint8Array(audioBuffer)], `audio.${ext}`, { type: mimeType });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: MODELS.stt,
      response_format: 'verbose_json',
      language: 'en',
    });

    return {
      transcript: transcription.text,
      language: (transcription as any).language ?? 'en',
      duration_seconds: (transcription as any).duration ?? 0,
      provider: 'groq',
      model: MODELS.stt,
      latency_ms: Date.now() - start,
    };
  },

  async evaluate(
    transcript: string,
    questionText: string,
    rubric: Record<string, string>,
  ): Promise<EvaluationResult> {
    const start = Date.now();
    const client = getClient();
    const prompt = buildEvaluationPrompt(questionText, transcript, rubric);

    // Try primary model first, fall back to smaller model
    const models = [MODELS.evaluation, MODELS.evaluationFallback];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EVAL_TIMEOUT_MS);

        const completion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert HR interview evaluator. Return ONLY valid JSON, no markdown. Keep justifications to 1 sentence each.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.15,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        }, { signal: controller.signal });

        clearTimeout(timeout);

        const text = completion.choices[0]?.message?.content ?? '';
        const parsed = parseEvaluationJSON(text) ?? JSON.parse(text);

        if (parsed && parsed.score) {
          const score = parsed.score as Record<string, unknown>;
          return {
            transcript,
            score: {
              clarity: clampScore(score.clarity),
              relevance: clampScore(score.relevance),
              confidence: clampScore(score.confidence),
              technical_fit: clampScore(score.technical_fit ?? score.technicalFit),
              communication: clampScore(score.communication),
            },
            scoreJustification: (parsed.scoreJustification ?? parsed.score_justification ?? {}) as Record<string, string>,
            summary: String(parsed.summary ?? ''),
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
            risks: Array.isArray(parsed.risks) ? parsed.risks.map(String) : [],
            recommendation: String(parsed.recommendation ?? 'maybe'),
            provider: 'groq',
            model,
            latency_ms: Date.now() - start,
          };
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        const label = isTimeout ? 'TIMEOUT' : 'ERROR';
        // If rate limited or server error on primary, try fallback
        if (model === MODELS.evaluationFallback) {
          console.error(`[AI][${label}] Groq evaluation failed on all models (${Date.now() - start}ms):`, errMsg);
          return getDefaultEvaluation(`Groq evaluation failed: ${errMsg}`);
        }
        console.warn(`[AI][${label}] Groq ${model} failed (${Date.now() - start}ms), trying fallback:`, errMsg);
      }
    }

    return getDefaultEvaluation('All Groq models failed');
  },
};
