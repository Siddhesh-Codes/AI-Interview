'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Edit2, Trash2, Briefcase, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface JobRole {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export default function JobRolesPage() {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    department: '',
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/v1/job-roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/v1/job-roles?id=${editing.id}` : '/api/v1/job-roles';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editing ? 'Role updated' : 'Role created');
        setShowDialog(false);
        fetchRoles();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', department: '' });
    setShowDialog(true);
  };

  const openEdit = (r: JobRole) => {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description || '',
      department: r.department || '',
    });
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/job-roles?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Role deleted');
        setDeleteTarget(null);
        fetchRoles();
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
          <h1 className="text-2xl font-bold text-white">Job Roles</h1>
          <p className="mt-1 text-sm text-white/50">{roles.length} roles configured</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4" />
          Add Role
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Briefcase className="h-10 w-10 text-white/10 mb-3" />
          <p className="text-sm text-white/40">No job roles yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.id} className="glass-card border-white/[0.06] bg-white/[0.02] group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 shrink-0">
                      <Briefcase className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                      {r.department && (
                        <p className="text-xs text-white/40 mt-0.5">{r.department}</p>
                      )}
                      {r.description && (
                        <p className="text-xs text-white/30 mt-1 line-clamp-2">{r.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)} className="h-7 w-7 text-white/30 hover:text-white">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)} className="h-7 w-7 text-white/30 hover:text-red-400">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] bg-white/5 text-white/50 border-white/10">
                    <FileText className="mr-1 h-3 w-3" />
                    {r.department || 'No department'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Role' : 'New Job Role'}</DialogTitle>
            <DialogDescription className="text-white/50">
              {editing ? 'Update role details.' : 'Add a new job role for interviews.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Title</label>
              <Input
                placeholder="Software Engineer"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Department</label>
              <Input
                placeholder="Engineering"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/60">Description</label>
              <Textarea
                placeholder="Brief description..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Role</DialogTitle>
            <DialogDescription className="text-white/50">
              Are you sure you want to delete <span className="text-white font-medium">{deleteTarget?.title}</span>? This action cannot be undone.
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
