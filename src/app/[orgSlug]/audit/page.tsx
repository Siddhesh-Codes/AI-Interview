'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  User,
  LogIn,
  FileEdit,
  Send,
  CheckCircle,
  Eye,
  Clock,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn,
  create_interview: Send,
  submit_review: CheckCircle,
  view_interview: Eye,
  edit_question: FileEdit,
  default: Shield,
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder — would fetch from API
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="mt-1 text-sm text-white/50">Activity history for your organization</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-10 w-10 text-white/10 mb-3" />
            <p className="text-sm text-white/40">No audit entries yet</p>
            <p className="mt-1 text-xs text-white/25">
              Actions will be logged here automatically
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] || ACTION_ICONS.default;
            return (
              <Card key={entry.id} className="glass-card border-white/[0.06] bg-white/[0.02]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]">
                    <Icon className="h-4 w-4 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">{entry.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-white/40">
                      {entry.actor_email || 'System'} · {entry.target_type}
                    </p>
                  </div>
                  <span className="text-xs text-white/30 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
