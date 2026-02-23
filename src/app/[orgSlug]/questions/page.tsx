'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, Edit2, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  category: string;
  difficulty: string;
  time_limit_seconds: number;
  role_id: string;
  job_role?: { id: string; title: string } | null;
  is_active: boolean;
}

interface JobRole {
  id: string;
  title: string;
}

const CATEGORIES = [
  'behavioral',
  'technical',
  'situational',
  'case_study',
  'introduction',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function QuestionsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    question_text: '',
    category: 'technical',
    difficulty: 'medium',
    time_limit_seconds: 120,
    role_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [qRes, rRes] = await Promise.all([
        fetch('/api/v1/questions'),
        fetch('/api/v1/job-roles'),
      ]);

      if (qRes.ok) {
        const data = await qRes.json();
        setQuestions(data.questions || []);
      }
      if (rRes.ok) {
        const data = await rRes.json();
        setJobRoles(data.roles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.question_text || !form.role_id) {
      toast.error('Please fill question text and select a role');
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/questions?id=${editing.id}` : '/api/v1/questions';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editing ? 'Question updated' : 'Question created');
        setShowDialog(false);
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await fetch(`/api/v1/questions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Question deleted');
        fetchData();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setShowDialog(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setForm({
      question_text: q.question_text,
      category: q.category,
      difficulty: q.difficulty,
      time_limit_seconds: q.time_limit_seconds,
      role_id: q.role_id,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setForm({
      question_text: '',
      category: 'technical',
      difficulty: 'medium',
      time_limit_seconds: 120,
      role_id: '',
    });
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (d === 'medium') return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
    return 'bg-red-500/15 text-red-400 border-red-500/20';
  };

  const filtered = questions.filter((q) => {
    if (roleFilter !== 'all' && q.role_id !== roleFilter) return false;
    if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce<Record<string, Question[]>>((acc, q) => {
    const role = q.job_role?.title || 'Uncategorized';
    if (!acc[role]) acc[role] = [];
    acc[role].push(q);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Questions</h1>
          <p className="mt-1 text-sm text-white/50">
            {questions.length} questions across {jobRoles.length} roles
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[200px] bg-white/[0.03] border-white/[0.08] text-white">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a25] border-white/10">
            <SelectItem value="all">All Roles</SelectItem>
            {jobRoles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-white/10 mb-3" />
          <p className="text-sm text-white/40">No questions found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([role, qs]) => (
            <div key={role}>
              <h3 className="text-sm font-medium text-white/40 mb-3 px-1">{role}</h3>
              <div className="space-y-2">
                {qs.map((q) => (
                  <Card key={q.id} className="glass-card border-white/[0.06] bg-white/[0.02] group">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/85 leading-relaxed">{q.question_text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-white/5 text-white/50 border-white/10">
                            {q.category}
                          </Badge>
                          <Badge variant="outline" className={cn('text-[10px]', getDifficultyColor(q.difficulty))}>
                            {q.difficulty}
                          </Badge>
                          <span className="text-[10px] text-white/30">
                            {q.time_limit_seconds}s limit
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(q)}
                          className="h-8 w-8 text-white/30 hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(q.id)}
                          className="h-8 w-8 text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Question' : 'New Question'}</DialogTitle>
            <DialogDescription className="text-white/50">
              {editing ? 'Modify the question details.' : 'Add a new interview question.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Question</label>
              <Textarea
                placeholder="Enter the interview question..."
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                rows={3}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Job Role</label>
                <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a25] border-white/10">
                    {jobRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Category</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a25] border-white/10">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Difficulty</label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a25] border-white/10">
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60">Time Limit (seconds)</label>
                <Input
                  type="number"
                  value={form.time_limit_seconds}
                  onChange={(e) => setForm({ ...form, time_limit_seconds: parseInt(e.target.value) || 120 })}
                  className="bg-white/[0.03] border-white/[0.08] text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
