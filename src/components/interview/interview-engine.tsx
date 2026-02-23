'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Play,
  Square,
  ChevronRight,
  Volume2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Camera,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { blobToBase64 } from '@/lib/utils';
import { useInterviewStore } from '@/stores/interview-store';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useInterviewTimer } from '@/hooks/use-interview-timer';
import { useAntiCheat } from '@/hooks/use-anti-cheat';

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { candidateName, jobRoleTitle, orgName, questions, maxViolations } = useInterviewStore();
  const hasQuestions = questions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-auto max-w-lg text-center"
    >
      <div className="mb-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600">
          <Volume2 className="h-10 w-10 text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">
          Welcome, {candidateName}
        </h1>
        <p className="text-white/50">
          {orgName} — {jobRoleTitle}
        </p>
      </div>

      {!hasQuestions ? (
        <div className="glass-card p-6 text-center mb-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400/60 mb-3" />
          <h3 className="text-base font-semibold text-white mb-2">Interview Not Ready</h3>
          <p className="text-sm text-white/50">
            No interview questions have been set up for this role yet. Please contact the recruiter.
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card p-6 text-left space-y-4 mb-8">
            <h3 className="text-sm font-semibold text-white/80">Before you begin:</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="flex items-start gap-3">
                <Mic className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span>You'll answer <strong className="text-white/80">{questions.length} questions</strong> by speaking into your microphone</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span>Each question has a time limit. The timer starts when the question is read aloud</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span className="text-amber-400/80">
                  Do NOT switch tabs or leave this window. You have a maximum of{' '}
                  <strong>{maxViolations}</strong> violations before automatic termination
                </span>
              </li>
            </ul>
          </div>

          <Button
            onClick={onStart}
            size="lg"
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8"
          >
            Start Interview
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}
    </motion.div>
  );
}

function MicCheckScreen({ onReady }: { onReady: () => void }) {
  const [testing, setTesting] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;

      // Mic check
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) setMicOk(true);

      // Camera check
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraOk(true);
      }
    } catch (err) {
      // Camera is mandatory — show error
      setCameraError('Camera and microphone access is required for the interview. Please allow access in your browser settings and try again.');
      setMicOk(false);
      setCameraOk(false);
    } finally {
      setTesting(false);
    }
  };

  // Cleanup stream when component unmounts or user proceeds
  useEffect(() => {
    return () => {
      // Don't stop stream here — it gets passed to the main engine
    };
  }, []);

  const handleReady = () => {
    // Store the stream globally so QuestionScreen can access it
    if (streamRef.current) {
      (window as any).__interviewVideoStream = streamRef.current;
    }
    onReady();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="mb-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10">
          <Camera className="h-8 w-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Camera & Mic Check</h2>
        <p className="mt-2 text-sm text-white/50">
          We need access to your camera and microphone for the interview
        </p>
      </div>

      {/* Camera Preview */}
      <div className="glass-card p-4 mb-4">
        <div className="relative w-full aspect-video rounded-xl bg-black/40 overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'w-full h-full object-cover rounded-xl transition-opacity',
              cameraOk ? 'opacity-100' : 'opacity-0'
            )}
          />
          {!cameraOk && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30">
              <Video className="h-8 w-8 mb-2" />
              <span className="text-xs">Camera preview will appear here</span>
            </div>
          )}
          {cameraOk && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-1 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-300">LIVE</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-6">
          {/* Mic status */}
          <div className={cn('flex items-center gap-2 text-sm', micOk ? 'text-emerald-400' : 'text-white/40')}>
            {micOk ? <CheckCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            <span>{micOk ? 'Mic ready' : 'Microphone'}</span>
          </div>
          {/* Camera status */}
          <div className={cn('flex items-center gap-2 text-sm', cameraOk ? 'text-emerald-400' : 'text-white/40')}>
            {cameraOk ? <CheckCircle className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            <span>{cameraOk ? 'Camera ready' : 'Camera'}</span>
          </div>
        </div>
      </div>

      {cameraError && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-500/8 border border-red-500/15 rounded-xl text-red-400 text-sm">
          <Camera className="h-4 w-4 shrink-0" />
          {cameraError}
        </div>
      )}

      {!micOk || !cameraOk ? (
        <Button
          onClick={handleTest}
          disabled={testing}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {cameraError ? 'Retry Access' : 'Test Camera & Mic'}
        </Button>
      ) : (
        <Button
          onClick={handleReady}
          size="lg"
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          I&apos;m Ready
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

function QuestionScreen() {
  const {
    questions,
    currentQuestionIndex,
    answers,
    nextQuestion,
    saveAnswer,
    markAnswerUploaded,
    setPhase,
  } = useInterviewStore();

  const question = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // ALL hooks must be called before any early return (React Rules of Hooks)
  const [uploading, setUploading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const ttsAbortRef = useRef(false);

  const {
    isRecording,
    recordedBlob: audioBlob,
    duration,
    analyserNode,
    startRecording,
    stopRecording,
    resetRecording,
    error: recorderError,
  } = useAudioRecorder();

  // Real-time frequency data from analyserNode for visualizer
  useEffect(() => {
    if (!analyserNode || !isRecording) {
      setAnalyserData(null);
      return;
    }
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    let raf: number;
    const tick = () => {
      analyserNode.getByteFrequencyData(dataArray);
      setAnalyserData(new Uint8Array(dataArray));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyserNode, isRecording]);

  // Attach camera stream from MicCheckScreen (do NOT stop tracks in cleanup —
  // the video recorder needs them for the entire interview duration)
  useEffect(() => {
    const stream = (window as any).__interviewVideoStream as MediaStream | undefined;
    if (stream && cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = stream;
      setCameraActive(true);
    }
    // No cleanup here — stream is managed by the main InterviewEngine component
  }, []);

  const {
    timerState: timerStateRaw,
    formattedTime,
    startTimer,
    resetTimer,
    isExpired,
  } = useInterviewTimer({
    timeLimit: question?.time_limit_seconds || 120,
    onExpired: () => {
      if (isRecording) stopRecording();
    },
  });

  // Cancel any playing TTS (both server audio and browser speech)
  const cancelTTS = useCallback(() => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.onended = null;
      ttsAudioRef.current.onerror = null;
      ttsAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    ttsAbortRef.current = true;
  }, []);

  const playBrowserTTS = useCallback((text: string) => {
    if (ttsAbortRef.current) { setTtsPlaying(false); startTimer(); return; }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Microsoft') || v.lang.startsWith('en')
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.onend = () => {
        setTtsPlaying(false);
        startTimer();
      };
      utterance.onerror = () => {
        setTtsPlaying(false);
        startTimer();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTtsPlaying(false);
      startTimer();
    }
  }, [startTimer]);

  const playTTS = useCallback(async (text: string) => {
    // Cancel any running TTS first
    cancelTTS();
    ttsAbortRef.current = false;
    setTtsPlaying(true);
    try {
      const res = await fetch('/api/v1/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'en-US-AndrewMultilingualNeural' }),
      });

      if (ttsAbortRef.current) { setTtsPlaying(false); return; }

      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 100) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          ttsAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            ttsAudioRef.current = null;
            setTtsPlaying(false);
            if (!ttsAbortRef.current) startTimer();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            ttsAudioRef.current = null;
            playBrowserTTS(text);
          };
          audio.play();
          return;
        }
      }

      playBrowserTTS(text);
    } catch {
      if (!ttsAbortRef.current) playBrowserTTS(text);
    }
  }, [cancelTTS, playBrowserTTS, startTimer]);

  const handleRecord = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!audioBlob || !question) return;
    setUploading(true);

    // Stop the timer immediately when user clicks submit
    cancelTTS();
    resetTimer();

    try {
      const formData = new FormData();
      formData.append('session_id', useInterviewStore.getState().sessionId!);
      formData.append('question_id', question.id);
      formData.append('question_index', String(currentQuestionIndex));
      formData.append('audio', audioBlob, `answer-${currentQuestionIndex}.webm`);
      formData.append('tab_switches', '0');

      const res = await fetch('/api/v1/answers', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        markAnswerUploaded(question.id, data.average_score ?? null);

        if (isLastQuestion) {
          // Stop video recording immediately so the camera/mic indicator goes away
          const videoBlob = await stopVideoRecording();
          // Stop the media stream tracks (camera + mic)
          const stream = (window as any).__interviewVideoStream as MediaStream | undefined;
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            delete (window as any).__interviewVideoStream;
          }

          // Show completed screen immediately
          setPhase('completed');

          // Fire-and-forget: upload video + mark complete in parallel
          const token = useInterviewStore.getState().token;
          if (videoBlob && videoBlob.size > 1000) {
            const sessionId = useInterviewStore.getState().sessionId;
            if (sessionId) {
              const fd = new FormData();
              fd.append('session_id', sessionId);
              fd.append('video', videoBlob, `interview-${sessionId}.webm`);
              fetch('/api/v1/interview-video', { method: 'POST', body: fd }).catch(() => {});
            }
          }
          fetch(`/api/v1/interview/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete' }),
          }).catch(() => {});
        } else {
          // Reset for next question
          resetRecording();
          nextQuestion();
        }
      } else {
        console.error('Upload failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }, [audioBlob, question, currentQuestionIndex, isLastQuestion, markAnswerUploaded, setPhase, resetTimer, resetRecording, cancelTTS, nextQuestion]);

  // Play TTS when question changes
  useEffect(() => {
    if (!question) return;
    playTTS(question.question_text);

    return () => {
      // Cleanup: cancel TTS if question changes or component unmounts
      cancelTTS();
      // Reset the abort flag so the next run (including StrictMode re-run) can proceed
      ttsAbortRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex]);

  // Safety: if no questions exist, show fallback AFTER all hooks
  if (!question) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mx-auto max-w-md text-center"
      >
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-400/50 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Questions Available</h2>
        <p className="text-sm text-white/50">
          There are no interview questions set up for this role. Please contact the recruiter.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={currentQuestionIndex}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="mx-auto max-w-2xl"
    >
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-white/40">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-xs text-white/40">{question.category}</span>
        </div>
        <Progress
          value={((currentQuestionIndex + 1) / questions.length) * 100}
          className="h-1.5"
        />
      </div>

      {/* Timer */}
      <div className="mb-6 flex items-center justify-center">
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-5 py-2 text-sm font-mono font-bold',
            timerStateRaw === 'danger'
              ? 'bg-red-500/15 text-red-400 animate-pulse'
              : timerStateRaw === 'warning'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-white/5 text-white/60'
          )}
        >
          <Clock className="h-4 w-4" />
          {formattedTime}
        </div>
      </div>

      {/* Question Card */}
      <div className="glass-card mb-8 p-8">
        <div className="flex items-start gap-3 mb-4">
          {ttsPlaying && (
            <div className="flex items-center gap-1.5 text-xs text-violet-400">
              <Volume2 className="h-4 w-4 animate-pulse" />
              <span>Reading question...</span>
            </div>
          )}
        </div>
        <p className="text-lg text-white/90 leading-relaxed">{question.question_text}</p>
      </div>

      {/* Audio Visualizer */}
      {isRecording && (
        <div className="mb-6 flex items-center justify-center gap-1 h-12">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-violet-500"
              animate={{
                height: analyserData
                  ? Math.max(4, (analyserData[i * 6] / 255) * 48)
                  : 4,
              }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Camera PIP */}
      {cameraActive && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative w-40 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/50 bg-black">
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1 rounded-full bg-red-500/30 px-1.5 py-0.5 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[9px] font-semibold text-red-200 uppercase tracking-wider">REC</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        {recorderError && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <MicOff className="h-4 w-4" />
            {recorderError}
          </div>
        )}

        {!audioBlob ? (
          <Button
            onClick={handleRecord}
            disabled={ttsPlaying || isExpired}
            size="lg"
            className={cn(
              'gap-2 px-8 text-white',
              isRecording
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-violet-600 hover:bg-violet-700'
            )}
          >
            {isRecording ? (
              <>
                <Square className="h-4 w-4" />
                Stop Recording ({duration}s)
              </>
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Start Recording
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmitAnswer}
              disabled={uploading}
              size="lg"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {isLastQuestion ? 'Submit & Finish' : 'Submit & Next'}
            </Button>
          </div>
        )}

        {duration > 0 && !audioBlob && !isRecording && (
          <p className="text-xs text-white/30">Recording didn't save. Try again.</p>
        )}
      </div>
    </motion.div>
  );
}

function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#a78bfa', '#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#c084fc'];
    const particles: { x: number; y: number; w: number; h: number; color: string; vx: number; vy: number; rot: number; rv: number; opacity: number }[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3 + 2,
        rot: Math.random() * 360,
        rv: (Math.random() - 0.5) * 8,
        opacity: 1,
      });
    }

    let running = true;
    let frame = 0;
    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      let alive = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.rot += p.rv;
        if (frame > 60) p.opacity = Math.max(0, p.opacity - 0.008);
        if (p.opacity <= 0) continue;
        alive++;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive > 0) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    return () => { running = false; };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

function CompletedScreen() {
  const { candidateName } = useInterviewStore();

  return (
    <>
      <ConfettiEffect />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-md text-center"
      >
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Interview Complete!</h2>
          <p className="mt-2 text-white/50">
            Thank you, {candidateName}. Your responses have been submitted.
          </p>
        </div>

        <p className="text-sm text-white/40">
          You may now close this window. The hiring team will review your interview
          and get back to you.
        </p>
      </motion.div>
    </>
  );
}

function TerminatedScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-md text-center"
    >
      <div className="mb-6">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
          <X className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Interview Terminated</h2>
        <p className="mt-2 text-white/50">
          Your interview was terminated due to excessive tab-switching violations.
        </p>
      </div>
      <p className="text-sm text-white/40">
        Please contact the hiring team if you believe this was an error.
      </p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Video Recording Helper                                              */
/* ------------------------------------------------------------------ */

let videoRecorderInstance: MediaRecorder | null = null;
let videoChunks: Blob[] = [];

function startVideoRecording(stream: MediaStream) {
  videoChunks = [];
  // Low quality: constrain video bitrate to ~200kbps for storage efficiency
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

  try {
    videoRecorderInstance = new MediaRecorder(stream, {
      mimeType: mimeType || undefined,
      videoBitsPerSecond: 200_000, // ~200kbps video
      audioBitsPerSecond: 64_000,  // ~64kbps audio
    });
  } catch {
    // Fallback without bitrate constraints
    videoRecorderInstance = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  }

  videoRecorderInstance.ondataavailable = (e) => {
    if (e.data.size > 0) videoChunks.push(e.data);
  };

  // Record in 5-second intervals for safety
  videoRecorderInstance.start(5000);
  console.log('[VideoRec] Started recording');
}

function stopVideoRecording(): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!videoRecorderInstance || videoRecorderInstance.state === 'inactive') {
      resolve(videoChunks.length > 0 ? new Blob(videoChunks, { type: 'video/webm' }) : null);
      return;
    }
    videoRecorderInstance.onstop = () => {
      const blob = videoChunks.length > 0 ? new Blob(videoChunks, { type: 'video/webm' }) : null;
      videoRecorderInstance = null;
      console.log('[VideoRec] Stopped, blob size:', blob?.size ?? 0);
      resolve(blob);
    };
    videoRecorderInstance.stop();
  });
}

async function uploadVideoRecording() {
  try {
    const videoBlob = await stopVideoRecording();
    if (!videoBlob || videoBlob.size < 1000) {
      console.log('[VideoRec] No video to upload');
      return;
    }

    const sessionId = useInterviewStore.getState().sessionId;
    if (!sessionId) return;

    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('video', videoBlob, `interview-${sessionId}.webm`);

    await fetch('/api/v1/interview-video', {
      method: 'POST',
      body: formData,
    });
    console.log('[VideoRec] Upload complete');
  } catch (err) {
    console.error('[VideoRec] Upload error:', err);
  }
}

/* ------------------------------------------------------------------ */
/* Main Engine                                                         */
/* ------------------------------------------------------------------ */

export default function InterviewEngine({ token }: { token: string }) {
  const store = useInterviewStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const antiCheat = useAntiCheat({
    maxViolations: store.maxViolations,
    enabled: store.phase === 'in-progress',
    onViolation: (count) => {
      store.addViolation();
    },
    onMaxViolations: () => {
      store.setPhase('terminated');
      // Upload video even on termination
      uploadVideoRecording();
    },
  });

  // Load session data
  useEffect(() => {
    loadSession();
  }, []);

  // Cleanup camera/video stream when the entire engine unmounts
  useEffect(() => {
    return () => {
      const stream = (window as any).__interviewVideoStream as MediaStream | undefined;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        delete (window as any).__interviewVideoStream;
      }
    };
  }, []);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/v1/interview/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid or expired interview link');
        setLoading(false);
        return;
      }

      const data = await res.json();
      store.setSession({
        sessionId: data.session?.id || data.session_id,
        token,
        candidateName: data.candidate?.name || data.candidate?.full_name || 'Candidate',
        jobRoleTitle: data.role?.title || 'Interview',
        orgName: data.organization?.name || data.org?.name || '',
        questions: (data.questions || []).map((q: Record<string, unknown>) => ({
          id: q.id as string,
          question_text: (q.text || q.question_text) as string,
          category: q.category as string,
          difficulty: q.difficulty as string,
          time_limit_seconds: (q.time_limit || q.time_limit_seconds || 120) as number,
          order_index: (q.index ?? q.order_index ?? 0) as number,
        })),
        maxViolations: data.settings?.max_tab_switches || 3,
      });
    } catch (err) {
      setError('Failed to load interview. Please check your link.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    store.setPhase('mic-check');
  };

  const handleMicReady = async () => {
    // Start continuous video recording from the camera+mic stream
    const stream = (window as any).__interviewVideoStream as MediaStream | undefined;
    if (stream) {
      startVideoRecording(stream);
    }

    // Mark session as started on server
    try {
      await fetch(`/api/v1/interview/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
    } catch { }
    store.setPhase('in-progress');
  };

  if (loading) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />
          <p className="mt-4 text-sm text-white/40">Loading your interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="mx-auto max-w-md text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400/50 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-[#0a0a0f]">
      {/* Anti-cheat warning overlay */}
      <AnimatePresence>
        {antiCheat.showWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="mx-4 max-w-sm rounded-2xl border border-amber-500/20 bg-[#12121a] p-8 text-center"
            >
              <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h3 className="text-lg font-bold text-white mb-2">Warning!</h3>
              <p className="text-sm text-white/60 mb-4">
                Tab switching detected! You have{' '}
                <strong className="text-amber-400">{antiCheat.remainingViolations}</strong>{' '}
                violation{antiCheat.remainingViolations !== 1 ? 's' : ''} remaining
                before automatic termination.
              </p>
              <Button
                onClick={antiCheat.dismissWarning}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                I Understand
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Violations indicator */}
      {store.phase === 'in-progress' && store.violations > 0 && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400">
          <Shield className="h-3.5 w-3.5" />
          {store.violations}/{store.maxViolations}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {store.phase === 'welcome' && (
            <WelcomeScreen key="welcome" onStart={handleStart} />
          )}
          {store.phase === 'mic-check' && (
            <MicCheckScreen key="mic-check" onReady={handleMicReady} />
          )}
          {store.phase === 'in-progress' && (
            <QuestionScreen key="question" />
          )}
          {store.phase === 'completed' && (
            <CompletedScreen key="completed" />
          )}
          {store.phase === 'terminated' && (
            <TerminatedScreen key="terminated" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
