'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardStats {
  total_interviews: number;
  completed_interviews: number;
  pending_reviews: number;
  average_score: number;
  interviews_this_week: number;
  completion_rate: number;
}

interface RecentSession {
  id: string;
  status: string;
  total_score: number | null;
  ai_recommendation: string | null;
  created_at: string;
  candidate: { full_name: string; email: string } | null;
  job_role: { title: string } | null;
}

export default function DashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInterviews, setRecentInterviews] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgSlug, setOrgSlug] = useState('');

  useEffect(() => {
    params.then(({ orgSlug: slug }) => {
      setOrgSlug(slug);
      fetchDashboard();
    });
  }, [params]);

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/v1/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats ?? null);
        setRecentInterviews(data.recent_sessions ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: 'Total Interviews',
      value: stats?.total_interviews ?? 0,
      icon: MessageSquare,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
    {
      title: 'Completed',
      value: stats?.completed_interviews ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Pending Review',
      value: stats?.pending_reviews ?? 0,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Avg Score',
      value: stats?.average_score ? `${Math.round(stats.average_score)}%` : '—',
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
      evaluated: { label: 'Evaluated', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
      reviewed: { label: 'Reviewed', className: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
      in_progress: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
      invited: { label: 'Invited', className: 'bg-white/10 text-white/60 border-white/10' },
      expired: { label: 'Expired', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
      terminated: { label: 'Terminated', className: 'bg-red-500/15 text-red-400 border-red-500/20' },
    };
    const v = variants[status] || { label: status, className: 'bg-white/10 text-white/60' };
    return <Badge variant="outline" className={v.className}>{v.label}</Badge>;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-white/40';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-white/5" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">
          Overview of your interview pipeline
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="glass-card border-white/[0.06] bg-white/[0.02]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                </div>
                <div className={cn('rounded-xl p-2.5', card.bgColor)}>
                  <card.icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
              {card.title === 'Total Interviews' && stats?.interviews_this_week !== undefined && (
                <div className="mt-3 flex items-center gap-1 text-xs text-white/40">
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">{stats.interviews_this_week}</span>
                  <span>this week</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Interviews */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold text-white">Recent Interviews</CardTitle>
          <Link
            href={`/${orgSlug}/interviews`}
            className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentInterviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-sm text-white/40">No interviews yet</p>
              <p className="mt-1 text-xs text-white/25">
                Create your first interview to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Candidate
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Role
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Status
                    </th>
                    <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Score
                    </th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-white/30">
                      Date
                    </th>
                    <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-white/30" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentInterviews.map((interview) => (
                    <tr
                      key={interview.id}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="py-3.5">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {interview.candidate?.full_name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-white/40">
                            {interview.candidate?.email ?? ''}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="text-sm text-white/70">{interview.job_role?.title ?? '—'}</span>
                      </td>
                      <td className="py-3.5">{getStatusBadge(interview.status)}</td>
                      <td className="py-3.5">
                        <span className={cn('text-sm font-semibold', getScoreColor(interview.total_score))}>
                          {interview.total_score !== null
                            ? `${Math.round(interview.total_score)}%`
                            : '—'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="text-xs text-white/40">
                          {new Date(interview.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/${orgSlug}/interviews/${interview.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/40 opacity-0 transition-all hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
                        >
                          <Eye className="h-3 w-3" />
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
