'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Eye,
  Send,
  Filter,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  CheckCircle,
  Link2,
  Trash2,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Session {
  id: string;
  status: string;
  total_score: number | null;
  ai_recommendation: string | null;
  created_at: string;
  completed_at: string | null;
  invite_token: string | null;
  candidate: { full_name: string; email: string } | null;
  job_role: { title: string } | null;
}

export default function InterviewsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [orgSlug, setOrgSlug] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Invite link dialog
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [emailWasSent, setEmailWasSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Create form
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    job_role_id: '',
    deadline: '',
  });
  const [jobRoles, setJobRoles] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    params.then(({ orgSlug }) => setOrgSlug(orgSlug));
  }, []);

  const fetchInterviews = useCallback(async () => {
    if (!orgSlug) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (search) qs.set('search', search);

      const res = await fetch(`/api/v1/interviews?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, page, statusFilter, search]);

  useEffect(() => {
    if (orgSlug) fetchInterviews();
  }, [orgSlug, fetchInterviews]);

  const fetchJobRoles = async () => {
    try {
      const res = await fetch('/api/v1/job-roles');
      if (res.ok) {
        const data = await res.json();
        setJobRoles(data.roles || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async () => {
    if (!newCandidate.name || !newCandidate.email || !newCandidate.job_role_id) {
      toast.error('Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      // Step 1: Create candidate (or find existing)
      const candidateRes = await fetch('/api/v1/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newCandidate.name,
          email: newCandidate.email,
        }),
      });

      let candidateId: string;
      if (candidateRes.ok) {
        const candidateData = await candidateRes.json();
        candidateId = candidateData.candidate.id;
      } else if (candidateRes.status === 409) {
        // Candidate already exists — look them up
        const searchRes = await fetch(`/api/v1/candidates?search=${encodeURIComponent(newCandidate.email)}`);
        const searchData = await searchRes.json();
        const existing = searchData.candidates?.find(
          (c: { email: string }) => c.email === newCandidate.email
        );
        if (!existing) {
          toast.error('Candidate exists but could not be found');
          return;
        }
        candidateId = existing.id;
      } else {
        const err = await candidateRes.json();
        toast.error(err.error || 'Failed to create candidate');
        return;
      }

      // Step 2: Create interview session
      const sessionRes = await fetch('/api/v1/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidateId,
          role_id: newCandidate.job_role_id,
          send_email: sendEmail,
          ...(newCandidate.deadline ? { deadline: newCandidate.deadline } : {}),
        }),
      });

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        const fullInviteUrl = sessionData.full_invite_url || `${window.location.origin}${sessionData.invite_url}`;
        setInviteLink(fullInviteUrl);
        setEmailWasSent(!!sessionData.email_sent);
        setShowInviteDialog(true);
        setShowCreateDialog(false);
        setNewCandidate({ name: '', email: '', job_role_id: '', deadline: '' });
        fetchInterviews();
      } else {
        const err = await sessionRes.json();
        toast.error(err.error || 'Failed to create interview');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

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

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/interviews?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Interview deleted');
        setDeleteTarget(null);
        fetchInterviews();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Interviews</h1>
          <p className="mt-1 text-sm text-white/50">
            Manage and review candidate interviews
          </p>
        </div>
        <Button
          onClick={() => {
            fetchJobRoles();
            setShowCreateDialog(true);
          }}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Plus className="h-4 w-4" />
          New Interview
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-violet-500/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-white/[0.03] border-white/[0.08] text-white">
            <Filter className="mr-2 h-3.5 w-3.5 text-white/40" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a25] border-white/10">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="evaluated">Evaluated</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="glass-card border-white/[0.06] bg-white/[0.02]">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Send className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-sm text-white/40">No interviews found</p>
              <p className="mt-1 text-xs text-white/25">
                Create a new interview to send an invite
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Job Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/30">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/30" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sessions.map((s) => (
                    <tr key={s.id} className="group transition-colors hover:bg-white/[0.02]">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-white">{s.candidate?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-white/40">{s.candidate?.email ?? ''}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-white/70">
                        {s.job_role?.title ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{getStatusBadge(s.status)}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={cn('text-sm font-semibold', getScoreColor(s.total_score))}>
                          {s.total_score !== null ? `${Math.round(s.total_score)}%` : '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-white/40">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === 'invited' && s.invite_token && (
                            <button
                              onClick={() => {
                                const link = `${window.location.origin}/interview/${s.invite_token}`;
                                copyToClipboard(link);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-400 opacity-0 transition-all hover:bg-blue-500/10 group-hover:opacity-100"
                              title="Copy invite link"
                            >
                              <Link2 className="h-3 w-3" />
                              Copy Link
                            </button>
                          )}
                          <Link
                            href={`/${orgSlug}/interviews/${s.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-violet-400 opacity-0 transition-all hover:bg-violet-500/10 group-hover:opacity-100"
                          >
                            <Eye className="h-3 w-3" />
                            Review
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-white/20 opacity-0 transition-all hover:text-red-400 hover:bg-red-500/10 group-hover:opacity-100"
                            title="Delete interview"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 w-8 text-white/40 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs text-white/60">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 w-8 text-white/40 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Interview</DialogTitle>
            <DialogDescription className="text-white/50">
              Create a new interview session and send an invite to the candidate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Candidate Name</label>
              <Input
                placeholder="John Doe"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newCandidate.email}
                onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Job Role</label>
              <Select
                value={newCandidate.job_role_id}
                onValueChange={(v) => setNewCandidate({ ...newCandidate, job_role_id: v })}
              >
                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent
                  className="bg-[#1a1a25] border-white/10 z-[200]"
                  position="popper"
                  sideOffset={4}
                >
                  {jobRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Interview Deadline</label>
              <Input
                type="date"
                value={newCandidate.deadline}
                onChange={(e) => setNewCandidate({ ...newCandidate, deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 [color-scheme:dark]"
              />
              <p className="text-[11px] text-white/30">Leave empty for 7-day default</p>
            </div>
          </div>

          {/* Send Email Checkbox */}
          <button
            type="button"
            onClick={() => setSendEmail(!sendEmail)}
            className="flex items-center gap-3 py-3 px-4 bg-white/[0.02] border border-white/[0.06] rounded-lg w-full text-left cursor-pointer hover:bg-white/[0.04] transition-colors"
          >
            <div className={cn(
              "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
              sendEmail
                ? "bg-violet-600 border-violet-600"
                : "border-white/20 bg-white/5"
            )}>
              {sendEmail && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="flex items-center gap-2 text-sm text-white/60">
              <Mail className="h-3.5 w-3.5" />
              Send email invitation to candidate
            </span>
          </button>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreateDialog(false)}
              className="text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {creating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sendEmail ? 'Send Invite' : 'Create Interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              Interview Created!
            </DialogTitle>
            <DialogDescription className="text-white/50">
              {emailWasSent
                ? 'An email invitation has been sent to the candidate.'
                : 'Share this link with the candidate to start their interview.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {emailWasSent && (
              <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl text-emerald-400 text-sm">
                <Mail className="h-4 w-4 shrink-0" />
                Email invitation sent successfully
              </div>
            )}
            <label className="text-xs font-medium text-white/60 mb-2 block">Invite Link</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteLink}
                className="bg-white/[0.03] border-white/[0.08] text-white font-mono text-sm flex-1"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                onClick={() => copyToClipboard(inviteLink)}
                size="icon"
                className={cn(
                  'shrink-0 transition-colors',
                  copied
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-violet-600 hover:bg-violet-700'
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Copy className="h-4 w-4 text-white" />
                )}
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/40">
              {emailWasSent
                ? 'The candidate can also use the link above if the email doesn\'t arrive.'
                : 'The candidate does not need to create an account. Share this link for them to begin.'}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => copyToClipboard(inviteLink)}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowInviteDialog(false)}
              className="text-white/60 hover:text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Interview</DialogTitle>
            <DialogDescription className="text-white/50">
              Are you sure you want to delete <span className="text-white font-medium">{deleteTarget?.candidate?.full_name || 'this candidate'}&apos;s</span> interview? All answers and evaluations will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-white/60">Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
