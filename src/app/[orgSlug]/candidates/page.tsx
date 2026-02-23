'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function CandidatesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetchCandidates();
  }, [page, search]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) qs.set('search', search);

      const res = await fetch(`/api/v1/candidates?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.full_name || !form.email) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/v1/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Candidate added');
        setShowDialog(false);
        setForm({ full_name: '', email: '', phone: '' });
        fetchCandidates();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add candidate');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/candidates?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Candidate deleted');
        setDeleteTarget(null);
        fetchCandidates();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Candidates</h1>
          <p className="mt-1 text-sm text-white/50">{total} total candidates</p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Add Candidate
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-white/10 mb-3" />
          <p className="text-sm text-white/40">No candidates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <Card key={c.id} className="glass-card border-white/[0.06] bg-white/[0.02]">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-10 w-10 bg-violet-600/20 text-violet-400">
                  <AvatarFallback className="bg-violet-600/20 text-violet-400 text-xs font-semibold">
                    {getInitials(c.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.full_name}</p>
                  <p className="text-xs text-white/40 truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} className="h-7 w-7 text-white/20 hover:text-red-400 shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-8 w-8 text-white/40">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs text-white/60">{page} / {totalPages}</span>
            <Button variant="ghost" size="icon" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-8 w-8 text-white/40">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
            <DialogDescription className="text-white/50">
              Add a new candidate to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Name</label>
              <Input
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Email</label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Phone (optional)</label>
              <Input
                placeholder="+1 234 567 8900"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Candidate</DialogTitle>
            <DialogDescription className="text-white/50">
              Are you sure you want to delete <span className="text-white font-medium">{deleteTarget?.full_name}</span>? This will fail if they have interview sessions.
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
