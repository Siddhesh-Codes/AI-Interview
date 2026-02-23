'use client';

import { useEffect, useState, useCallback } from 'react';
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
    Users,
    Mail,
    Shield,
    Clock,
    Trash2,
    UserPlus,
    Crown,
    Eye,
    Edit,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: number;
    avatar_url: string | null;
    last_login_at: string | null;
    created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    super_admin: { label: 'Super Admin', color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: Crown },
    org_admin: { label: 'Admin', color: 'bg-violet-500/15 text-violet-400 border-violet-500/20', icon: Shield },
    interviewer: { label: 'Interviewer', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Eye },
    reviewer: { label: 'Reviewer', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Edit },
};

export default function TeamPage({ params }: { params: Promise<{ orgSlug: string }> }) {
    const [orgSlug, setOrgSlug] = useState('');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [newUser, setNewUser] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'reviewer',
    });

    useEffect(() => {
        params.then(({ orgSlug }) => setOrgSlug(orgSlug));
    }, [params]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/v1/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
                setCurrentUserRole(data.currentUserRole || '');
            } else if (res.status === 401) {
                setError('Session expired. Please sign out and sign in again.');
            } else if (res.status === 403) {
                setError('You don\'t have permission to manage team members.');
            } else {
                setError('Failed to load team data.');
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (orgSlug) fetchUsers();
    }, [orgSlug, fetchUsers]);

    const handleCreate = async () => {
        if (!newUser.full_name || !newUser.email || !newUser.password) {
            toast.error('Please fill all fields');
            return;
        }
        if (newUser.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setCreating(true);
        try {
            const res = await fetch('/api/v1/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            if (res.ok) {
                toast.success('Team member added! A welcome email has been sent.');
                setShowCreateDialog(false);
                setNewUser({ full_name: '', email: '', password: '', role: 'reviewer' });
                fetchUsers();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to create user');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/v1/admin/users?id=${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Team member removed');
                setDeleteTarget(null);
                fetchUsers();
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

    const formatDate = (d: string | null) => {
        if (!d) return 'Never';
        return new Date(d).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
        let pw = '';
        for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
        setNewUser({ ...newUser, password: pw });
    };

    // Determine which roles the current user can create
    const creatableRoles = currentUserRole === 'super_admin'
        ? ['super_admin', 'org_admin', 'interviewer', 'reviewer']
        : ['interviewer', 'reviewer'];

    // Determine which users the current user can delete
    const canDelete = (user: AdminUser) => {
        if (currentUserRole === 'super_admin') {
            return user.role !== 'super_admin'; // Can't delete other super_admins
        }
        if (currentUserRole === 'org_admin') {
            return ['interviewer', 'reviewer'].includes(user.role); // Only delete below
        }
        return false;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Team</h1>
                    <p className="text-sm text-white/40 mt-1">
                        {currentUserRole === 'super_admin'
                            ? 'Manage all admin accounts and roles'
                            : 'Manage team members'}
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                >
                    <UserPlus className="h-4 w-4" />
                    Add Member
                </Button>
            </div>

            {/* Error State */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-500/8 border border-red-500/15 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-400">{error}</p>
                        {error.includes('Session expired') && (
                            <p className="text-xs text-white/40 mt-1">
                                Click &quot;Sign out&quot; in the sidebar, then sign in again.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Stats */}
            {!error && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(ROLE_CONFIG)
                        .filter(([key]) => currentUserRole === 'super_admin' || key !== 'super_admin')
                        .map(([key, config]) => {
                            const count = users.filter((u) => u.role === key).length;
                            return (
                                <div key={key} className="glass-card p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <config.icon className="h-4 w-4 text-white/40" />
                                        <span className="text-xs font-medium text-white/50">{config.label}s</span>
                                    </div>
                                    <p className="text-2xl font-bold text-white">{count}</p>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Team List */}
            {!error && (
                <div className="glass-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-violet-400" />
                            <h2 className="text-sm font-semibold text-white">
                                All Members ({users.length})
                            </h2>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-white/30">
                            <Users className="h-10 w-10 mb-3" />
                            <p className="text-sm">No team members yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.04]">
                            {users.map((user) => {
                                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.reviewer;
                                const deletable = canDelete(user);
                                return (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between px-6 py-4 group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Avatar */}
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/60 text-sm font-semibold uppercase">
                                                {user.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                                                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', roleConfig.color)}>
                                                        {roleConfig.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="flex items-center gap-1 text-xs text-white/30">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-white/20">
                                                        <Clock className="h-3 w-3" />
                                                        Last login: {formatDate(user.last_login_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {deletable && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteTarget(user)}
                                                    className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10"
                                                    title="Remove member"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-violet-400" />
                            Add Team Member
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                            Create a new admin account. They&apos;ll receive a welcome email with login credentials.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Full Name</label>
                            <Input
                                placeholder="Jane Smith"
                                value={newUser.full_name}
                                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Email</label>
                            <Input
                                type="email"
                                placeholder="jane@company.com"
                                value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Password</label>
                                <button
                                    onClick={generatePassword}
                                    className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider font-medium"
                                >
                                    Generate
                                </button>
                            </div>
                            <Input
                                placeholder="Min. 6 characters"
                                value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Role</label>
                            <Select
                                value={newUser.role}
                                onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                            >
                                <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a25] border-white/10">
                                    {creatableRoles.includes('super_admin') && (
                                        <SelectItem value="super_admin">
                                            <div className="flex items-center gap-2">
                                                <Crown className="h-3 w-3 text-red-400" />
                                                Super Admin — Full system access
                                            </div>
                                        </SelectItem>
                                    )}
                                    {creatableRoles.includes('org_admin') && (
                                        <SelectItem value="org_admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-3 w-3 text-violet-400" />
                                                Admin — Manage team & settings
                                            </div>
                                        </SelectItem>
                                    )}
                                    <SelectItem value="interviewer">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-3 w-3 text-blue-400" />
                                            Interviewer — Create & manage interviews
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="reviewer">
                                        <div className="flex items-center gap-2">
                                            <Edit className="h-3 w-3 text-emerald-400" />
                                            Reviewer — Review & score interviews
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

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
                                <Plus className="h-3.5 w-3.5" />
                            )}
                            Add Member
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="bg-[#12121a] border-white/[0.08] text-white sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-400">Remove Team Member</DialogTitle>
                        <DialogDescription className="text-white/50">
                            Are you sure you want to remove <span className="text-white font-medium">{deleteTarget?.full_name}</span>?
                            They will lose all dashboard access.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="text-white/60">Cancel</Button>
                        <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
                            {deleting ? 'Removing...' : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
