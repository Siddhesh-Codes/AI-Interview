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
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Speech-to-Text Pipeline ----
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
): Promise<STTResult> {
  // 1. Try Groq Whisper (fastest, free)
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await groqProvider.transcribe!(audioBuffer, mimeType);
      if (result.transcript && result.transcript.trim().length > 0) {
        return result;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Groq STT attempt ${attempt + 1} failed:`, errMsg);
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
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Gemini STT attempt ${attempt + 1} failed:`, errMsg);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  // 3. All providers failed
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
