// ============================================================
// AI Provider Interface — Abstract contract for all AI providers
// ============================================================

export interface STTResult {
  transcript: string;
  language: string;
  duration_seconds: number;
  provider: string;
  model: string;
  latency_ms: number;
}

export interface EvaluationResult {
  transcript: string;
  score: {
    clarity: number;
    relevance: number;
    confidence: number;
    technical_fit: number;
    communication: number;
  };
  scoreJustification: Record<string, string>;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
  provider: string;
  model: string;
  latency_ms: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  provider: string;
  latency_ms: number;
}

export interface AIProviderInterface {
  name: string;

  transcribe?(audioBuffer: Buffer, mimeType: string): Promise<STTResult>;

  evaluate?(
    transcript: string,
    questionText: string,
    rubric: Record<string, string>,
  ): Promise<EvaluationResult>;

  generateSpeech?(text: string, voice?: string): Promise<TTSResult>;
}

export function getDefaultEvaluation(reason: string): EvaluationResult {
  return {
    transcript: '',
    score: { clarity: 3, relevance: 3, confidence: 3, technical_fit: 3, communication: 3 },
    scoreJustification: {
      clarity: reason,
      relevance: reason,
      confidence: reason,
      technical_fit: reason,
      communication: reason,
    },
    summary: `Evaluation pending manual review. Reason: ${reason}`,
    strengths: ['Unable to evaluate automatically'],
    risks: ['Requires manual review'],
    recommendation: 'maybe',
    provider: 'fallback',
    model: 'none',
    latency_ms: 0,
  };
}

export function clampScore(value: unknown): number {
  const num = Number(value);
  if (isNaN(num)) return 3;
  return Math.max(0, Math.min(5, Math.round(num * 10) / 10));
}

export function parseEvaluationJSON(text: string): Record<string, unknown> | null {
  try {
    // Try to extract JSON from markdown code blocks or raw text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}

export function buildEvaluationPrompt(
  questionText: string,
  transcript: string,
  rubric: Record<string, string>,
): string {
  return `You are an expert HR interviewer evaluating a candidate's spoken response to an interview question.

INTERVIEW QUESTION:
"${questionText}"

CANDIDATE'S RESPONSE (transcript):
"${transcript}"

SCORING GUIDELINES (be strict and fair — do NOT give everyone high scores):

**Clarity (0-5):** ${rubric.clarity || 'How well-structured and articulate is the response?'}
  5: Exceptionally clear, well-organized, easy to follow
  3: Adequate but could be more structured
  0: No meaningful response or incoherent

**Relevance (0-5):** ${rubric.relevance || 'Does the answer directly address the question?'}
  5: Directly and completely addresses all aspects
  3: Partially relevant, misses key points
  0: Completely off-topic

**Confidence (0-5):** ${rubric.confidence || 'How confident does the candidate sound?'}
  5: Very confident, authoritative
  3: Moderately confident with some hesitation
  0: Extremely nervous, unable to respond

**Technical Fit (0-5):** ${rubric.technical_fit || 'Does the answer demonstrate relevant skills?'}
  5: Demonstrates excellent domain knowledge with specific examples
  3: Shows basic understanding
  0: No relevant skills demonstrated

**Communication (0-5):** ${rubric.communication || 'How effective is the candidate\'s communication?'}
  5: Excellent vocabulary, professional tone, engaging delivery
  3: Adequate communication
  0: Very poor communication

IMPORTANT RULES:
- Base scores ONLY on the transcript content
- If the response is very short or lacks substance, give lower scores
- If the candidate gives a generic answer without specifics, score lower
- Provide honest justifications for each score
- recommendation must be one of: "strong_hire", "hire", "maybe", "no_hire", "strong_no_hire"

Return ONLY valid JSON (no markdown, no extra text):
{
  "transcript": "${transcript.slice(0, 50)}...",
  "score": {
    "clarity": <number 0-5>,
    "relevance": <number 0-5>,
    "confidence": <number 0-5>,
    "technical_fit": <number 0-5>,
    "communication": <number 0-5>
  },
  "scoreJustification": {
    "clarity": "<why this score>",
    "relevance": "<why this score>",
    "confidence": "<why this score>",
    "technical_fit": "<why this score>",
    "communication": "<why this score>"
  },
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "recommendation": "<strong_hire|hire|maybe|no_hire|strong_no_hire>"
}`;
}
