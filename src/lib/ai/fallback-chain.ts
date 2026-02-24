// ============================================================
// AI Fallback Chain — Orchestrates provider failover
// Pipeline: Groq (free) → Gemini (free) → Default scores
// ============================================================

import { groqProvider } from './groq';
import { geminiProvider } from './gemini';
import {
  type STTResult,
  type EvaluationResult,
  getDefaultEvaluation,
} from './provider';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500; // Keep low — Vercel function timeout is the bottleneck

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Speech-to-Text Pipeline ----
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
): Promise<STTResult> {
  const errors: string[] = [];

  console.log(`[STT Pipeline] Starting: buffer=${audioBuffer?.length ?? 0} bytes, mime=${mimeType}`);

  // Reject empty/tiny audio early
  if (!audioBuffer || audioBuffer.length < 100) {
    console.error(`[STT Pipeline] Audio buffer too small (${audioBuffer?.length ?? 0} bytes), skipping transcription`);
    return {
      transcript: '[Transcription unavailable — pending manual review]',
      language: 'en',
      duration_seconds: 0,
      provider: 'fallback',
      model: 'none',
      latency_ms: 0,
    };
  }

  // 1. Try Groq Whisper (fastest, free)
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await groqProvider.transcribe!(audioBuffer, mimeType);
      if (result.transcript && result.transcript.trim().length > 0) {
        return result;
      }
      errors.push(`Groq attempt ${attempt + 1}: empty transcript`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Groq attempt ${attempt + 1}: ${errMsg}`);
      console.error(`[STT Pipeline] Groq attempt ${attempt + 1}/${MAX_RETRIES} failed:`, errMsg);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  // 2. Fallback to Gemini audio understanding
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await geminiProvider.transcribe!(audioBuffer, mimeType);
      if (result.transcript && result.transcript.trim().length > 0) {
        return result;
      }
      errors.push(`Gemini attempt ${attempt + 1}: empty transcript`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Gemini attempt ${attempt + 1}: ${errMsg}`);
      console.error(`[STT Pipeline] Gemini attempt ${attempt + 1}/${MAX_RETRIES} failed:`, errMsg);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  // 3. All providers failed — log all errors for debugging
  console.error(`[STT Pipeline] ALL PROVIDERS FAILED. Errors:\n${errors.join('\n')}`);
  return {
    transcript: '[Transcription unavailable — pending manual review]',
    language: 'en',
    duration_seconds: 0,
    provider: 'fallback',
    model: 'none',
    latency_ms: 0,
  };
}

// ---- Evaluation Pipeline ----
export async function evaluateAnswer(
  transcript: string,
  questionText: string,
  rubric: Record<string, string> = {},
): Promise<EvaluationResult> {
  // Skip evaluation if no transcript
  if (!transcript || transcript.includes('[Transcription unavailable')) {
    return getDefaultEvaluation('No transcript available for evaluation');
  }

  // 1. Try Groq Llama 3.3 70B (fastest, free, structured JSON)
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await groqProvider.evaluate!(transcript, questionText, rubric);
      if (result.score && result.summary) {
        return result;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Groq eval attempt ${attempt + 1} failed:`, errMsg);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  // 2. Fallback to Gemini
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await geminiProvider.evaluate!(transcript, questionText, rubric);
      if (result.score && result.summary) {
        return result;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Gemini eval attempt ${attempt + 1} failed:`, errMsg);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  // 3. All failed — return default scores for manual review
  return getDefaultEvaluation('All AI providers failed — requires manual review');
}

// ---- Combined: Transcribe + Evaluate ----
export async function processAnswer(
  audioBuffer: Buffer,
  mimeType: string,
  questionText: string,
  rubric: Record<string, string> = {},
): Promise<{ stt: STTResult; evaluation: EvaluationResult }> {
  // Step 1: Transcribe
  const stt = await transcribeAudio(audioBuffer, mimeType);

  // Step 2: Evaluate transcript
  const evaluation = await evaluateAnswer(stt.transcript, questionText, rubric);
  evaluation.transcript = stt.transcript; // Ensure transcript is from STT

  return { stt, evaluation };
}
