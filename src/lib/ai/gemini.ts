// ============================================================
// Gemini Provider — Free tier: 15 RPM, 1500 RPD
// Handles: Evaluation fallback + Audio Understanding fallback
// ============================================================

import {
  type AIProviderInterface,
  type STTResult,
  type EvaluationResult,
  buildEvaluationPrompt,
  clampScore,
  parseEvaluationJSON,
  getDefaultEvaluation,
} from './provider';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MODELS = {
  primary: 'gemini-2.0-flash',
  fallback: 'gemini-1.5-flash',
  lastResort: 'gemini-1.5-pro',
} as const;

async function geminiRequest(
  model: string,
  contents: unknown[],
  generationConfig: Record<string, unknown> = {},
): Promise<string> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        ...generationConfig,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini ${model} error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export const geminiProvider: AIProviderInterface = {
  name: 'gemini',

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<STTResult> {
    const start = Date.now();
    const base64Audio = audioBuffer.toString('base64');

    // Gemini audio understanding — combined transcription
    const models = [MODELS.primary, MODELS.fallback];

    for (const model of models) {
      try {
        const text = await geminiRequest(model, [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe this audio recording exactly as spoken. Return ONLY the transcription text, nothing else. If the audio is silent or unclear, return "[No clear speech detected]".',
              },
            ],
          },
        ]);

        return {
          transcript: text.trim(),
          language: 'en',
          duration_seconds: 0,
          provider: 'gemini',
          model,
          latency_ms: Date.now() - start,
        };
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (model === models[models.length - 1]) {
          throw new Error(`Gemini transcription failed: ${errMsg}`);
        }
        console.warn(`Gemini ${model} transcription failed, trying next:`, errMsg);
      }
    }

    throw new Error('All Gemini transcription models failed');
  },

  async evaluate(
    transcript: string,
    questionText: string,
    rubric: Record<string, string>,
  ): Promise<EvaluationResult> {
    const start = Date.now();
    const prompt = buildEvaluationPrompt(questionText, transcript, rubric);

    const models = [MODELS.primary, MODELS.fallback, MODELS.lastResort];

    for (const model of models) {
      try {
        const text = await geminiRequest(
          model,
          [
            {
              parts: [{ text: prompt }],
              role: 'user',
            },
          ],
          { responseMimeType: 'application/json' },
        );

        const parsed = parseEvaluationJSON(text);
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
            provider: 'gemini',
            model,
            latency_ms: Date.now() - start,
          };
        }
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (model === models[models.length - 1]) {
          console.error('Gemini evaluation failed on all models:', errMsg);
          return getDefaultEvaluation(`Gemini evaluation failed: ${errMsg}`);
        }
        console.warn(`Gemini ${model} eval failed, trying next:`, errMsg);
      }
    }

    return getDefaultEvaluation('All Gemini evaluation models failed');
  },
};
