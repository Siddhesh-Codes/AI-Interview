'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Shield,
  Volume2,
  Clock,
  Save,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const TTS_VOICES = [
  { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (Male, Professional)' },
  { id: 'en-US-AvaMultilingualNeural', name: 'Ava (Female, Professional)' },
  { id: 'en-US-BrianMultilingualNeural', name: 'Brian (Male, Conversational)' },
  { id: 'en-US-EmmaMultilingualNeural', name: 'Emma (Female, Conversational)' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (Male, British)' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (Female, British)' },
  { id: 'en-AU-WilliamNeural', name: 'William (Male, Australian)' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (Female, Australian)' },
];

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    org_name: '',
    default_time_limit: 120,
    max_violations: 3,
    tts_voice: 'en-US-AndrewMultilingualNeural',
    invite_expiry_hours: 72,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // In production, this would call an API endpoint
      // For now, we save to localStorage as a placeholder
      localStorage.setItem('org_settings', JSON.stringify(settings));
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('org_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const previewVoice = async () => {
    try {
      const res = await fetch('/api/v1/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello! This is a preview of the interview voice. How does it sound?',
          voice: settings.tts_voice,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          audio.play();
          return;
        }
      }
      // Server TTS failed — fall back to browser Speech API
      useBrowserSpeech('Hello! This is a preview of the interview voice. How does it sound?');
    } catch {
      // Fall back to browser Speech API
      useBrowserSpeech('Hello! This is a preview of the interview voice. How does it sound?');
    }
  };

  const useBrowserSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Microsoft') || v.lang.startsWith('en')
      );
      if (preferred) utterance.voice = preferred;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Speech synthesis not available in this browser');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/50">Configure your organization preferences</p>
      </div>

      {/* Organization */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Building2 className="h-4 w-4 text-violet-400" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">Organization Name</label>
            <Input
              value={settings.org_name}
              onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
              className="bg-white/[0.03] border-white/[0.08] text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Interview Defaults */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Clock className="h-4 w-4 text-violet-400" />
            Interview Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Default Time Limit (seconds)</label>
              <Input
                type="number"
                value={settings.default_time_limit}
                onChange={(e) => setSettings({ ...settings, default_time_limit: parseInt(e.target.value) || 120 })}
                className="bg-white/[0.03] border-white/[0.08] text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Invite Expiry (hours)</label>
              <Input
                type="number"
                value={settings.invite_expiry_hours}
                onChange={(e) => setSettings({ ...settings, invite_expiry_hours: parseInt(e.target.value) || 72 })}
                className="bg-white/[0.03] border-white/[0.08] text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anti-Cheat */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Shield className="h-4 w-4 text-violet-400" />
            Anti-Cheat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">Max Tab-Switch Violations</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.max_violations}
              onChange={(e) => setSettings({ ...settings, max_violations: parseInt(e.target.value) || 3 })}
              className="bg-white/[0.03] border-white/[0.08] text-white w-32"
            />
            <p className="text-xs text-white/30">
              The interview will auto-terminate after this many tab switches
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Volume2 className="h-4 w-4 text-violet-400" />
            Interview Voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60">TTS Voice</label>
            <div className="flex gap-2">
              <Select
                value={settings.tts_voice}
                onValueChange={(v) => setSettings({ ...settings, tts_voice: v })}
              >
                <SelectTrigger className="flex-1 bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a25] border-white/10">
                  {TTS_VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={previewVoice}
                className="gap-2 border-white/[0.08] text-white/60 hover:text-white bg-white/[0.03]"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-white/[0.06]" />

      <Button
        onClick={handleSave}
        disabled={saving}
        className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Settings
      </Button>
    </div>
  );
}
