'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderOptions {
  mimeType?: string;
  onDataAvailable?: (blob: Blob) => void;
}

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  recordedBlob: Blob | null;
  error: string | null;
  analyserNode: AnalyserNode | null;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    recordedBlob: null,
    error: null,
    analyserNode: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getMimeType = useCallback((): string => {
    if (options.mimeType && MediaRecorder.isTypeSupported(options.mimeType)) {
      return options.mimeType;
    }
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', ''];
    return types.find((t) => t === '' || MediaRecorder.isTypeSupported(t)) ?? '';
  }, [options.mimeType]);

  const startRecording = useCallback(async () => {
    try {
      setState((s) => ({ ...s, error: null, recordedBlob: null }));
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analyser for visualizer
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setState((s) => ({ ...s, recordedBlob: blob, isRecording: false }));
        options.onDataAvailable?.(blob);
      };

      recorder.onerror = () => {
        setState((s) => ({ ...s, error: 'Recording failed', isRecording: false }));
      };

      recorder.start(1000);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setState((s) => ({
          ...s,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }));
      }, 100);

      setState((s) => ({
        ...s,
        isRecording: true,
        isPaused: false,
        duration: 0,
        analyserNode: analyser,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof DOMException
          ? err.name === 'NotAllowedError'
            ? 'Microphone access denied. Please allow microphone access and try again.'
            : err.name === 'NotFoundError'
              ? 'No microphone found. Please connect a microphone.'
              : `Microphone error: ${err.message}`
          : 'Failed to start recording';
      setState((s) => ({ ...s, error: message }));
    }
  }, [getMimeType, options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setState((s) => ({ ...s, isRecording: false, analyserNode: null }));
  }, []);

  const resetRecording = useCallback(() => {
    stopRecording();
    chunksRef.current = [];
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      recordedBlob: null,
      error: null,
      analyserNode: null,
    });
  }, [stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    resetRecording,
  };
}
