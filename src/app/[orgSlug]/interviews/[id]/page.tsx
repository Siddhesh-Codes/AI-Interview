'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Star,
  AlertTriangle,
  Shield,
  Volume2,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnswerQuestion {
  id: string;
  question_text: string;
  category: string;
  difficulty: string;
  time_limit_seconds: number;
  order_index: number;
}

interface Answer {
  id: string;
  question_index: number;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  transcript: string | null;
  ai_evaluation: { summary?: string } | null;
  average_score: number | null;
  strengths: string[];
  risks: string[];
  ai_recommendation: string | null;
  question: AnswerQuestion | null;
}

interface SessionDetail {
  id: string;
  status: string;
  total_score: number | null;
  ai_recommendation: string | null;
  ai_summary: string | null;
  tab_switch_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  reviewer_notes: string | null;
  reviewer_decision: string | null;
  video_url: string | null;
  video_expires_at: string | null;
  candidate: { full_name: string; email: string } | null;
  job_role: { title: string } | null;
  answers: Answer[];
}

export default function InterviewReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const [orgSlug, setOrgSlug] = useState('');
  const [id, setId] = useState('');
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDecision, setReviewDecision] = useState('');
  const [activeAnswer, setActiveAnswer] = useState(0);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    params.then(({ orgSlug, id }) => {
      setOrgSlug(orgSlug);
      setId(id);
    });
  }, []);

  useEffect(() => {
    if (id) fetchSession();
  }, [id]);

  async function fetchSession() {
    try {
      const res = await fetch(`/api/v1/interviews/${id}`);
      if (res.ok) {
        const data = await res.json();
        const s = data.session;
        setSession(s);
        setReviewNotes(s?.reviewer_notes || '');
        setReviewDecision(s?.reviewer_decision || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const toggleAudio = (answerId: string, url: string, knownDuration?: number | null) => {
    if (playingId === answerId) {
      audioRef?.pause();
      setPlayingId(null);
      setAudioProgress(0);
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingId(null);
      setAudioProgress(100);
      setTimeout(() => setAudioProgress(0), 300);
    };
    audio.ontimeupdate = () => {
      // WebM files often have duration=Infinity, so use the known duration from the DB
      const totalDuration = (audio.duration && isFinite(audio.duration) && audio.duration > 0)
        ? audio.duration
        : (knownDuration || 0);
      if (totalDuration > 0) {
        setAudioProgress(Math.min(100, (audio.currentTime / totalDuration) * 100));
      }
    };
    audio.play();
    setAudioRef(audio);
    setPlayingId(answerId);
    setAudioProgress(0);
  };

  const handleSubmitReview = async () => {
    if (!reviewDecision) {
      toast.error('Please select a decision');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/interviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_notes: reviewNotes,
          reviewer_decision: reviewDecision,
        }),
      });
      if (res.ok) {
        toast.success('Review submitted successfully');
        fetchSession();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit review');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-white/40';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-white/5';
    if (score >= 80) return 'bg-emerald-500/10';
    if (score >= 60) return 'bg-blue-500/10';
    if (score >= 40) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-96 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          <div className="h-96 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-12 w-12 text-amber-400/50 mb-4" />
        <p className="text-white/40">Interview not found</p>
      </div>
    );
  }

  const currentAnswer = session.answers[activeAnswer];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${orgSlug}/interviews`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{session.candidate?.full_name ?? 'Unknown'}</h1>
            <p className="text-sm text-white/50">
              {session.job_role?.title ?? '—'} · {session.candidate?.email ?? ''}
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className={cn('rounded-2xl px-6 py-3 text-center', getScoreBg(session.total_score))}>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Score</p>
          <p className={cn('text-3xl font-bold', getScoreColor(session.total_score))}>
            {session.total_score !== null ? `${Math.round(session.total_score)}%` : '—'}
          </p>
          {session.ai_recommendation && (
            <Badge
              variant="outline"
              className={cn(
                'mt-1',
                session.ai_recommendation === 'strong_hire'
                  ? 'border-emerald-500/30 text-emerald-400'
                  : session.ai_recommendation === 'hire'
                  ? 'border-blue-500/30 text-blue-400'
                  : session.ai_recommendation === 'maybe'
                  ? 'border-amber-500/30 text-amber-400'
                  : 'border-red-500/30 text-red-400'
              )}
            >
              {session.ai_recommendation.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* Video Recording */}
      {session.video_url && (
        <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
              <Video className="h-4 w-4" />
              Interview Recording
              {session.video_expires_at && (
                <span className="ml-auto text-xs text-white/30 font-normal">
                  Expires {new Date(session.video_expires_at).toLocaleDateString()}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <video
              src={session.video_url}
              controls
              playsInline
              className="w-full max-h-80 rounded-lg bg-black"
            />
          </CardContent>
        </Card>
      )}

      {/* Violations Warning */}
      {session.tab_switch_count > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              {session.tab_switch_count} tab-switch violation{session.tab_switch_count > 1 ? 's' : ''} detected
            </p>
            <p className="text-xs text-white/40">
              The candidate switched away from the interview tab during the session
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Question Navigator */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-white/60 px-1">Questions</h3>
          {session.answers.map((answer, idx) => (
            <button
              key={answer.id}
              onClick={() => setActiveAnswer(idx)}
              className={cn(
                'w-full text-left rounded-xl p-3 border transition-all duration-200',
                idx === activeAnswer
                  ? 'border-violet-500/30 bg-violet-500/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/40 mb-1">
                    Q{idx + 1} · {answer.question?.category ?? ''}
                  </p>
                  <p className="text-sm text-white/80 line-clamp-2">{answer.question?.question_text ?? ''}</p>
                </div>
                <div className={cn('ml-2 text-lg font-bold', getScoreColor(answer.average_score))}>
                  {answer.average_score !== null ? answer.average_score : '—'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Answer Detail */}
        <div className="lg:col-span-2 space-y-4">
          {currentAnswer && (
            <>
              {/* Question */}
              <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
                <CardContent className="p-5">
                  <p className="text-xs font-medium text-violet-400 mb-2">
                    Question {activeAnswer + 1} · {currentAnswer.question?.category ?? ''}
                  </p>
                  <p className="text-white/90">{currentAnswer.question?.question_text ?? ''}</p>
                </CardContent>
              </Card>

              {/* Audio Player */}
              {currentAnswer.audio_url && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleAudio(currentAnswer.id, currentAnswer.audio_url!, currentAnswer.audio_duration_seconds)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors"
                    >
                      {playingId === currentAnswer.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-xs text-white/40">Audio Response</span>
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {currentAnswer.audio_duration_seconds ? `${Math.floor(currentAnswer.audio_duration_seconds / 60)}:${String(Math.floor(currentAnswer.audio_duration_seconds % 60)).padStart(2, '0')}` : '0:00'}
                      </span>
                    </div>
                    <Volume2 className="h-4 w-4 shrink-0 text-white/20" />
                  </div>
                  {/* Progress track */}
                  <div
                    style={{
                      height: '8px',
                      width: '100%',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${playingId === currentAnswer.id ? audioProgress : 0}%`,
                        borderRadius: '9999px',
                        backgroundColor: '#8b5cf6',
                        transition: 'width 0.3s linear',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Transcript */}
              {currentAnswer.transcript && (
                <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Transcript
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                      {currentAnswer.transcript}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* AI Evaluation */}
              {currentAnswer.average_score !== null && (
                <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/60 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      AI Evaluation — Score: {currentAnswer.average_score}/100
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Score Bar */}
                    <div>
                      <Progress
                        value={currentAnswer.average_score}
                        className="h-2"
                      />
                    </div>

                    {/* Feedback */}
                    {currentAnswer.ai_evaluation?.summary && (
                      <p className="text-sm text-white/70 leading-relaxed">
                        {currentAnswer.ai_evaluation.summary}
                      </p>
                    )}

                    {/* Strengths */}
                    {currentAnswer.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Strengths
                        </p>
                        <ul className="space-y-1">
                          {currentAnswer.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-white/60 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-400">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Areas for Improvement */}
                    {currentAnswer.risks?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-400 mb-2 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Areas for Improvement
                        </p>
                        <ul className="space-y-1">
                          {currentAnswer.risks.map((s, i) => (
                            <li key={i} className="text-sm text-white/60 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-amber-400">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Manual Review */}
          <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/60">
                Manual Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/40">Decision</label>
                <Select value={reviewDecision} onValueChange={setReviewDecision}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a25] border-white/10">
                    <SelectItem value="strong_hire">Strong Hire</SelectItem>
                    <SelectItem value="hire">Hire</SelectItem>
                    <SelectItem value="maybe">Maybe</SelectItem>
                    <SelectItem value="no_hire">No Hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/40">Notes</label>
                <Textarea
                  placeholder="Add your review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 resize-none"
                />
              </div>
              <Button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Submit Review
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
