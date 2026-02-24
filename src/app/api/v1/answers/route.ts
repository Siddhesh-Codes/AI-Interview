// ============================================================
// API: Submit Answer (candidate-facing, during interview)
// POST /api/v1/answers — Upload audio + AI evaluation
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { d1QueryFirst, d1Run, generateId, nowISO, parseJsonColumn } from '@/lib/db/d1';
import { uploadToR2, generateAudioKey } from '@/lib/storage/r2';
import { processAnswer } from '@/lib/ai/fallback-chain';
import { rateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

// Allow up to 60s for AI transcription + evaluation (Vercel default is 10s)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 answer submissions per minute per IP
    const ip = getClientIp(request);
    if (ip) {
      const rl = rateLimit('answers', ip, 20, 60_000);
      if (rl.limited) return rateLimitResponse(rl.retryAfterMs);
    }

    const formData = await request.formData();
    const sessionId = formData.get('session_id') as string;
    const questionId = formData.get('question_id') as string;
    const questionIndex = parseInt(formData.get('question_index') as string, 10);
    const audioFile = formData.get('audio') as Blob | null;
    const tabSwitches = parseInt(formData.get('tab_switches') as string || '0', 10);

    if (!sessionId || !questionId || isNaN(questionIndex)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify session
    const session = await d1QueryFirst<Record<string, unknown>>(
      "SELECT id, org_id, status FROM interview_sessions WHERE id = ? AND status = 'in_progress'",
      [sessionId],
    );
    if (!session) {
      return NextResponse.json({ error: 'Invalid or inactive session' }, { status: 400 });
    }

    // Get the question text for evaluation context
    const question = await d1QueryFirst<Record<string, unknown>>(
      'SELECT question_text, category, difficulty FROM question_templates WHERE id = ?',
      [questionId],
    );

    // Upload audio to R2
    let audioKey: string | null = null;
    let audioDuration = 0;
    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      audioKey = generateAudioKey(session.org_id as string, sessionId, questionIndex);
      await uploadToR2(audioKey, buffer, audioFile.type || 'audio/webm');
      audioDuration = buffer.length / 16000; // rough estimate
    }

    // Create the answer record first
    const answerId = generateId();
    await d1Run(
      `INSERT INTO answers (id, session_id, question_id, question_index, audio_url, audio_duration_seconds, tab_switches_during, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(session_id, question_index) DO UPDATE SET
         audio_url = excluded.audio_url,
         audio_duration_seconds = excluded.audio_duration_seconds,
         tab_switches_during = excluded.tab_switches_during,
         submitted_at = excluded.submitted_at`,
      [answerId, sessionId, questionId, questionIndex, audioKey, audioDuration, tabSwitches, nowISO()],
    );

    // Get the actual answer ID (might be different if ON CONFLICT hit)
    const answer = await d1QueryFirst<{ id: string }>(
      'SELECT id FROM answers WHERE session_id = ? AND question_index = ?',
      [sessionId, questionIndex],
    );
    const finalAnswerId = answer?.id || answerId;

    // Run AI transcription + evaluation (async but we wait)
    if (audioFile) {
      try {
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        console.log(`[Answers] AI pipeline: audio=${audioBuffer.length} bytes, type=${audioFile.type}, question=${questionId}`);
        const result = await processAnswer(
          audioBuffer,
          audioFile.type || 'audio/webm',
          (question?.question_text as string) || 'Unknown question',
          {
            role: 'candidate',
            category: (question?.category as string) || 'behavioral',
            difficulty: (question?.difficulty as string) || 'medium',
          },
        );

        if (result) {
          // Normalize scores from 0-5 to 0-100 scale
          const rawScores = result.evaluation?.score || {};
          const normalizedScores: Record<string, number> = {};
          let scoreSum = 0;
          let scoreCount = 0;

          for (const [key, val] of Object.entries(rawScores)) {
            const normalizedVal = Math.round(((val as number) / 5) * 100);
            normalizedScores[key] = normalizedVal;
            scoreSum += normalizedVal;
            scoreCount++;
          }

          const avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

          await d1Run(
            `UPDATE answers SET
              transcript = ?, ai_evaluation = ?, scores = ?,
              average_score = ?, strengths = ?, risks = ?,
              ai_recommendation = ?, evaluated_at = ?
            WHERE id = ?`,
            [
              result.stt.transcript || result.evaluation?.transcript || '',
              JSON.stringify(result.evaluation),
              JSON.stringify(normalizedScores),
              avgScore,
              JSON.stringify(result.evaluation?.strengths || []),
              JSON.stringify(result.evaluation?.risks || []),
              result.evaluation?.recommendation || null,
              nowISO(),
              finalAnswerId,
            ],
          );

          // Update session total score (average of all answer scores)
          const allScores = await d1QueryFirst<{ avg: number | null }>(
            'SELECT AVG(average_score) as avg FROM answers WHERE session_id = ? AND average_score IS NOT NULL',
            [sessionId],
          );

          if (allScores?.avg !== null && allScores?.avg !== undefined) {
            // Determine AI recommendation based on average
            let recommendation = 'maybe';
            const avg = allScores.avg;
            if (avg >= 80) recommendation = 'strong_hire';
            else if (avg >= 65) recommendation = 'hire';
            else if (avg >= 45) recommendation = 'maybe';
            else if (avg >= 25) recommendation = 'no_hire';
            else recommendation = 'strong_no_hire';

            await d1Run(
              `UPDATE interview_sessions SET total_score = ?, ai_recommendation = ?, ai_summary = ?
               WHERE id = ?`,
              [
                Math.round(avg * 10) / 10,
                recommendation,
                result.evaluation?.summary || null,
                sessionId,
              ],
            );
          }

          return NextResponse.json({
            success: true,
            transcript: result.stt.transcript,
            scores: normalizedScores,
            average_score: avgScore,
          });
        }
      } catch (evalErr) {
        const errDetail = evalErr instanceof Error ? evalErr.message : String(evalErr);
        console.error('[Answers] AI evaluation error:', errDetail, evalErr);
        // Answer saved but evaluation failed — return success with error info
        return NextResponse.json({ success: true, transcript: null, ai_error: errDetail });
      }
    }

    return NextResponse.json({ success: true, transcript: null });
  } catch (err) {
    console.error('[Answers] POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
